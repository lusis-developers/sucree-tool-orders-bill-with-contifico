import { models } from "../models";
import { getEcuadorNow } from "../utils/date.utils";
import { IPOSStockObjective, WeeklyObjectives } from "../models/pos-stock-objective.model";
import { IPOSDailyEntry } from "../models/pos-daily-entry.model";

// Day-of-week index (getUTCDay) → objectives key
const DOW_KEYS: (keyof WeeklyObjectives)[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getObjectiveForDow(objectives: WeeklyObjectives, dowIndex: number): number {
  return objectives[DOW_KEYS[dowIndex]] ?? 0;
}

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export class POSRestockService {
  /**
   * Get all stock objectives for a branch.
   */
  async getObjectives(branch: string): Promise<IPOSStockObjective[]> {
    return models.posStockObjectives.find({ branch }) as any;
  }

  /**
   * Create or update a stock objective (upsert by branch + productName).
   */
  async upsertObjective(data: {
    branch: string;
    productName: string;
    unit: string;
    contificoId?: string;
    objectives: WeeklyObjectives;
  }): Promise<IPOSStockObjective> {
    const result = await models.posStockObjectives.findOneAndUpdate(
      { branch: data.branch, productName: data.productName },
      { $set: data },
      { upsert: true, new: true }
    );
    return result as any;
  }

  /**
   * Build the daily form for a branch:
   * - Lists products with today/tomorrow objectives
   * - Shows last recorded entry per product
   * - Lists upcoming future orders (informational only)
   */
  async getDailyForm(branch: string, dateStr?: string) {
    const ecNow = getEcuadorNow();
    const formDateStr = dateStr || ecNow.toISOString().split("T")[0];
    const formDate = parseDateStr(formDateStr);

    const targetDate = new Date(formDate);
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
    const targetDateStr = toDateStr(targetDate);

    const formDow = formDate.getUTCDay();
    const targetDow = targetDate.getUTCDay();

    // All objectives for this branch
    const objectives = await models.posStockObjectives.find({ branch }).lean();

    // Most recent entry for this branch on or before formDate
    const lastEntry = await models.posDailyEntries
      .findOne({ branch, date: { $lte: formDate } })
      .sort({ date: -1 })
      .lean();

    // Also fetch today's losses if any to support full state restoration (editability)
    const todayLosses = await models.posLosses.find({ branch, date: formDate }).lean();
    const lossesByProduct: Record<string, any[]> = {};
    for (const loss of todayLosses) {
      if (!lossesByProduct[loss.productName]) lossesByProduct[loss.productName] = [];
      lossesByProduct[loss.productName].push({
        quantity: loss.quantity,
        reason: loss.reason,
        category: loss.category
      });
    }

    const items = objectives.map((obj: any) => {
      const stockObjectiveToday = getObjectiveForDow(obj.objectives as WeeklyObjectives, formDow);
      const stockObjectiveTomorrow = getObjectiveForDow(obj.objectives as WeeklyObjectives, targetDow);

      let lastEntryData: any = undefined;
      if (lastEntry) {
        const found = (lastEntry.items as any[]).find(
          (i: any) => i.productName === obj.productName
        );

        if (found) {
          const isToday = toDateStr(lastEntry.date) === formDateStr;
          lastEntryData = {
            stockFinal: found.stockFinal,
            bajas: found.bajas,
            pedidoSugerido: found.pedidoSugerido,
            date: toDateStr(lastEntry.date),
            // Include detailed losses only if it matches today's entry
            detailedLosses: isToday ? (lossesByProduct[obj.productName] || []) : []
          };
        }
      }

      return {
        productName: obj.productName,
        unit: obj.unit,
        stockObjectiveToday,
        stockObjectiveTomorrow,
        lastEntry: lastEntryData,
      };
    });

    // Upcoming orders: deliveryDate >= targetDate, status not DELIVERED
    const upcomingOrderDocs = await models.orders
      .find({
        branch,
        deliveryDate: { $gte: targetDate },
        status: { $nin: ["DELIVERED"] },
      })
      .select("deliveryDate products")
      .lean();

    // Group by product name
    const productMap: Record<string, { totalQuantity: number; dates: Date[]; ordersCount: number }> = {};
    for (const order of upcomingOrderDocs as any[]) {
      for (const product of order.products || []) {
        const name: string = product.name || product.productName;
        if (!name) continue;
        if (!productMap[name]) {
          productMap[name] = { totalQuantity: 0, dates: [], ordersCount: 0 };
        }
        productMap[name].totalQuantity += Number(product.quantity) || 0;
        productMap[name].dates.push(order.deliveryDate as Date);
        productMap[name].ordersCount++;
      }
    }

    const upcomingOrders = Object.entries(productMap).map(([productName, data]) => ({
      productName,
      totalQuantity: data.totalQuantity,
      nextOccurrence: data.dates.sort((a, b) => a.getTime() - b.getTime())[0],
      ordersCount: data.ordersCount,
    }));

    return {
      branch,
      formDate: formDateStr,
      targetDate: targetDateStr,
      items,
      upcomingOrders,
    };
  }

  /**
   * Save or overwrite the daily physical count and compute suggested orders.
   * pedidoSugerido = max(0, stockObjectiveTomorrow - stockFinal)
   */
  async submitDailyEntry(
    branch: string,
    dateStr: string,
    items: Array<{
      productName: string;
      bajas: number;
      bajasNote?: string;
      stockFinal: number;
      detailedLosses?: Array<{
        quantity: number;
        reason: string;
        category: "Transport" | "Storage" | "Production" | "Other";
      }>;
    }>,
    submittedBy: string
  ): Promise<IPOSDailyEntry> {
    const date = parseDateStr(dateStr);

    const targetDate = new Date(date);
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
    const targetDow = targetDate.getUTCDay();

    // Build objective lookup map
    const objectives = await models.posStockObjectives.find({ branch }).lean();
    const objectiveMap: Record<string, any> = {};
    for (const obj of objectives as any[]) {
      objectiveMap[obj.productName] = obj;
    }

    // 1. Process Detailed Losses
    const lossRecords: any[] = [];
    for (const item of items) {
      if (item.detailedLosses && item.detailedLosses.length > 0) {
        for (const loss of item.detailedLosses) {
          lossRecords.push({
            branch,
            productName: item.productName,
            quantity: loss.quantity,
            reason: loss.reason,
            category: loss.category,
            date,
            submittedBy
          });
        }
      }
    }

    // Save detailed losses (delete old ones for this branch/date/products first to allow overwrite/retry)
    const productNamesInEntry = items.map(i => i.productName);
    await models.posLosses.deleteMany({
      branch,
      date,
      productName: { $in: productNamesInEntry }
    });

    if (lossRecords.length > 0) {
      await models.posLosses.insertMany(lossRecords);
    }

    // 2. Process Entry Items
    const processedItems = items.map((item) => {
      const obj = objectiveMap[item.productName];
      const stockObjectiveTomorrow = obj
        ? getObjectiveForDow(obj.objectives as WeeklyObjectives, targetDow)
        : 0;
      const pedidoSugerido = Math.max(0, stockObjectiveTomorrow - item.stockFinal);

      return {
        productName: item.productName,
        unit: obj?.unit || "unidad",
        bajas: item.bajas,
        bajasNote: item.bajasNote,
        stockFinal: item.stockFinal,
        stockObjectiveTomorrow,
        pedidoSugerido,
      };
    });

    const result = await models.posDailyEntries.findOneAndUpdate(
      { branch, date },
      {
        $set: {
          branch,
          date,
          submittedBy,
          submittedAt: new Date(),
          items: processedItems,
          status: "submitted",
        },
      },
      { upsert: true, new: true }
    );

    // 3. Sync with Production (Order model)
    const restockItems = processedItems.filter(i => i.pedidoSugerido > 0);

    if (restockItems.length === 0) {
      // If no suggested orders, remove any existing restock order for this branch/date
      await models.orders.deleteOne({
        branch,
        deliveryDate: targetDate,
        salesChannel: "Restock"
      });
    } else {
      // Upsert a "Restock Order" so it appears in the production dashboard
      const restockOrderData = {
        branch,
        deliveryDate: targetDate,
        orderDate: date,
        customerName: `REPOSICIÓN: ${branch}`,
        customerPhone: "N/A",
        salesChannel: "Restock",
        deliveryType: "retiro",
        totalValue: 0,
        paymentMethod: "Interno",
        responsible: "Web",
        invoiceNeeded: false,
        productionStage: "PENDING",
        products: restockItems.map(item => ({
          name: item.productName,
          quantity: item.pedidoSugerido,
          price: 0,
          contifico_id: objectiveMap[item.productName]?.contificoId,
          productionStatus: "PENDING",
          produced: 0
        }))
      };

      await models.orders.findOneAndUpdate(
        { branch, deliveryDate: targetDate, salesChannel: "Restock" },
        { $set: restockOrderData },
        { upsert: true, new: true }
      );
    }

    return result as any;
  }

  /**
   * Get entry history for a branch within a date range (inclusive).
   */
  async getHistory(branch: string, fromDate: string, toDate: string): Promise<IPOSDailyEntry[]> {
    const from = parseDateStr(fromDate);
    const to = parseDateStr(toDate);
    to.setUTCHours(23, 59, 59, 999);

    return models.posDailyEntries
      .find({ branch, date: { $gte: from, $lte: to } })
      .sort({ date: -1 })
      .lean() as any;
  }
  /**
   * Delete a stock objective by branch and product name.
   */
  async deleteObjective(branch: string, productName: string): Promise<boolean> {
    const result = await models.posStockObjectives.deleteOne({ branch, productName });
    return result.deletedCount > 0;
  }
}
