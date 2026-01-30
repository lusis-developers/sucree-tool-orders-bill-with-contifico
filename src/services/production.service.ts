
import { OrderModel } from "../models/order.model";

export class ProductionService {
  /**
   * Returns production tasks (Orders), sorted by delivery date (urgency).
   */
  async getProductionTasks() {
    // 1. First, find candidate orders (active)
    const tasks = await OrderModel.find({
      productionStage: { $in: ["PENDING", "IN_PROCESS", "DELAYED"] }
    }).sort({ deliveryDate: 1 });

    // 2. Check for "Overtime" (DELAYED) status update
    const now = new Date();
    const updatedTasks = [];

    for (const task of tasks) {
      // If delivery date has passed and it's not finished, mark as DELAYED
      if (task.deliveryDate < now && task.productionStage !== "DELAYED") {
        task.productionStage = "DELAYED";
        await task.save();
      }
      updatedTasks.push(task);
    }

    return updatedTasks;
  }

  /**
   * Returns a list of all active production orders with full details.
   * Useful for the tabular list view.
   */
  async getAllOrders() {
    // FIX: Include "FINISHED" orders that haven't been dispatched yet.
    // We want all active orders where the lifecycle (Dispatch) isn't complete.
    return await OrderModel.find({
      dispatchStatus: { $ne: "SENT" }
    }).sort({ deliveryDate: 1 });
  }

  async updateTask(id: string, updates: { stage?: string; notes?: string }) {
    const updateData: any = {};
    if (updates.stage) updateData.productionStage = updates.stage;
    if (updates.notes !== undefined) updateData.productionNotes = updates.notes;

    return await OrderModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Batch update multiple tasks (e.g. mark all as FINISHED)
   */
  async batchUpdateTasks(ids: string[], updates: { stage?: string }) {
    const updateData: any = {};
    if (updates.stage) updateData.productionStage = updates.stage;

    // Update multiple documents
    return await OrderModel.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );
  }

  async getAggregatedItems() {
    // 0. Fetch Contifico Data (Categories & Products) for mapping
    // Ideally cached, but for now we fetch fresh or assume efficient enough
    const contificoService = new (require("./contifico.service").ContificoService)();

    let categoryMap = new Map<string, string>(); // CatID -> CatName
    let productCategoryMap = new Map<string, string>(); // ProdID -> CatName (or ProdName -> CatName if ID not sync)

    try {
      // Parallel Fetch
      const [categories, products] = await Promise.all([
        contificoService.getCategories(),
        contificoService.getProducts({ result_size: 2000 }) // Ensure we get enough
      ]);

      if (categories) {
        categories.forEach((c: any) => {
          categoryMap.set(c.id, c.nombre);
        });
      }

      // Map Products to Category Names based on Contifico ID
      // We might not have Contifico ID in OrderProduct, so we might need fallback to Name match
      // But OrderProduct has 'contifico_id' field!
      if (products) {
        products.forEach((p: any) => {
          // Map by Contifico ID
          if (p.id) {
            const cName = categoryMap.get(p.categoria_id) || "OTROS";
            productCategoryMap.set(p.id, cName);
          }
          // Fallback: Map by Name (if local DB items don't have contifico_id populated)
          if (p.nombre) {
            const cName = categoryMap.get(p.categoria_id) || "OTROS";
            productCategoryMap.set(p.nombre.toLowerCase().trim(), cName);
          }
        });
      }

    } catch (err) {
      console.warn("⚠️ Failed to fetch Contifico metadata for categorization:", err);
    }

    // 1. Fetch flattened list of all pending items
    const rawItems = await OrderModel.aggregate([
      {
        $match: {
          productionStage: { $in: ["PENDING", "IN_PROCESS", "DELAYED"] },
        },
      },
      { $unwind: "$products" },
      {
        $match: {
          "products.productionStatus": { $ne: "COMPLETED" },
        },
      },
      {
        $addFields: {
          "products.produced": { $ifNull: ["$products.produced", 0] },
        },
      },
      {
        $addFields: {
          pendingQuantity: { $subtract: ["$products.quantity", "$products.produced"] },
        },
      },
      {
        $match: {
          pendingQuantity: { $gt: 0 },
        },
      },
      {
        $project: {
          // Flatten structure for easier JS processing
          productName: "$products.name",
          contificoId: "$products.contifico_id",
          totalInOrder: "$products.quantity",
          producedInOrder: "$products.produced",
          pendingInOrder: "$pendingQuantity",
          productionNotes: "$products.productionNotes",
          productionStatus: "$products.productionStatus",
          deliveryDate: "$deliveryDate",
          customerName: "$customerName",
          stage: "$productionStage",
          orderId: "$_id"
        }
      },
      { $sort: { deliveryDate: 1 } }
    ]);

    // 2. Define Time Buckets
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    // 3. Mapping & Filtering Logic
    const ALLOWED_CATEGORIES = [
      'cakes enteros',
      'cakes porcion',
      'pack de turrones',
      'panetton',
      'secos market',
      'individual',
      'panaderais'
    ];

    // Helper to map Contifico Name to User Category
    // This is the core "Business Logic" translation
    const mapCategory = (contificoName: string, productName: string): string | null => {
      const c = contificoName.toUpperCase();
      const p = productName.toUpperCase();

      if (c.includes('ENTEROS') || c.includes('TORTAS')) return 'cakes enteros';
      if (c.includes('PANADERIA')) return 'panaderais'; // Assuming user meant 'panaderia' but typed 'panaderais'

      // "Individual" logic - tricky. Maybe POSTRES?
      if (c.includes('POSTRES') || c.includes('INDIVIDUAL')) return 'individual'; // or 'cakes porcion' depending on item?

      // Specific Product overrides if Category is generic
      if (p.includes('TURRON')) return 'pack de turrones';
      if (p.includes('PANETTON')) return 'panetton';
      if (p.includes('SECOS') || p.includes('MARKET')) return 'secos market';
      if (p.includes('PORCION')) return 'cakes porcion';

      // Default mappings if generic
      if (c === 'COMBOS') return null; // Exclude?

      return null; // Exclude by default if not matched
    };

    const processedItems: any[] = [];

    for (const item of rawItems) {
      // Determine Category
      // 1. By Contifico ID
      let rawCat = "OTROS";
      if (item.contificoId && productCategoryMap.has(item.contificoId)) {
        rawCat = productCategoryMap.get(item.contificoId)!;
      } else if (productCategoryMap.has(item.productName.toLowerCase().trim())) {
        // 2. By Name
        rawCat = productCategoryMap.get(item.productName.toLowerCase().trim())!;
      }

      const mappedCat = mapCategory(rawCat, item.productName);

      if (mappedCat) {
        item.category = mappedCat;
        processedItems.push(item);
      }
    }

    // 4. Helper to group by Product Name within a bucket
    // Now grouped by Category -> Product Name?
    // The frontend expects: { today: [...items], tomorrow: ... }
    // Users wants visual grouping by category. The frontend handles grouping if 'category' field exists.

    // We stick to the existing structure of returning List<ItemSummary>, 
    // but now we filter and enrich with 'category'.

    const groupItems = (items: any[]) => {
      const groupedMap = new Map<string, any>();

      for (const item of items) {
        if (!groupedMap.has(item.productName)) {
          groupedMap.set(item.productName, {
            _id: item.productName,
            category: item.category, // Pass the category!
            totalQuantity: 0,
            urgency: item.deliveryDate,
            orders: []
          });
        }

        const group = groupedMap.get(item.productName);
        group.totalQuantity += item.pendingInOrder;
        group.orders.push({
          id: item.orderId,
          totalInOrder: item.totalInOrder,
          producedInOrder: item.producedInOrder,
          pendingInOrder: item.pendingInOrder,
          client: item.customerName,
          delivery: item.deliveryDate,
          stage: item.stage,
          notes: item.productionNotes,
          status: item.productionStatus
        });
      }
      return Array.from(groupedMap.values());
    };

    // 5. Distribute items into buckets
    const buckets = {
      todayItems: [] as any[],
      tomorrowItems: [] as any[],
      futureItems: [] as any[]
    };

    for (const item of processedItems) {
      const uDate = new Date(item.deliveryDate);

      if (uDate <= todayEnd) {
        buckets.todayItems.push(item);
      } else if (uDate <= tomorrowEnd) {
        buckets.tomorrowItems.push(item);
      } else {
        buckets.futureItems.push(item);
      }
    }

    // 6. Return
    return {
      today: groupItems(buckets.todayItems),
      tomorrow: groupItems(buckets.tomorrowItems),
      future: groupItems(buckets.futureItems)
    };
  }

  async updateProductStatus(orderId: string, productName: string, status: "PENDING" | "IN_PROCESS" | "COMPLETED", notes?: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) return null;

    const product = order.products.find(p => p.name === productName);
    if (!product) return null;

    if (status) product.productionStatus = status;
    if (notes !== undefined) product.productionNotes = notes;

    // Check if we should auto-update delivered/produced counts? 
    // If completed, maybe set produced = quantity?
    if (status === "COMPLETED") {
      product.produced = product.quantity;
    }

    // Recalculate Order Stage
    const allProductsDone = order.products.every(p => p.productionStatus === "COMPLETED" || (p.produced || 0) >= p.quantity);
    if (allProductsDone) {
      order.productionStage = "FINISHED";
    } else {
      // If at least one is in process or completed
      const anyAction = order.products.some(p => p.productionStatus !== "PENDING" || (p.produced || 0) > 0);
      if (anyAction && order.productionStage === "PENDING") {
        order.productionStage = "IN_PROCESS";
      }
    }

    await order.save();
    return order;
  }

  /**
   * Register progress for a specific product type (e.g. "Made 10 Lemon Tarts").
   * Automatically distributes the produced amount to the oldest pending orders (FIFO).
   */
  async registerProductionProgress(productName: string, quantityMade: number) {
    let remainingToDistribute = quantityMade;

    // Find all active orders containing this product, sorted by urgency (deliveryDate ASC)
    const orders = await OrderModel.find({
      productionStage: { $in: ["PENDING", "IN_PROCESS", "DELAYED"] },
      "products.name": productName,
    }).sort({ deliveryDate: 1 });

    for (const order of orders) {
      if (remainingToDistribute <= 0) break;

      let orderUpdated = false;

      // Iterate through products in the order to find the match
      for (const product of order.products) {
        if (product.name === productName) {
          const currentProduced = product.produced || 0;
          const needed = product.quantity - currentProduced;

          if (needed > 0) {
            const take = Math.min(needed, remainingToDistribute);
            product.produced = currentProduced + take;
            remainingToDistribute -= take;
            orderUpdated = true;

            // If we distributed data, check if we exhausted our supply
            if (remainingToDistribute <= 0) break;
          }
        }
      }

      if (orderUpdated) {
        // Check if ALL products in this order are fully produced
        const allDone = order.products.every(
          (p) => (p.produced || 0) >= p.quantity
        );

        if (allDone) {
          order.productionStage = "FINISHED";
        } else {
          // If started but not finished, ensure it's IN_PROCESS
          if (order.productionStage === "PENDING") {
            order.productionStage = "IN_PROCESS";
          }
        }

        order.markModified('products');
        await order.save();
      }
    }

    return {
      distributed: quantityMade - remainingToDistribute,
      remaining: remainingToDistribute, // If > 0, we made more than needed!
    };
  }

  /**
   * Batch register dispatch for multiple orders.
   * Assumes full dispatch of remaining items for each order.
   */
  async batchRegisterDispatch(ids: string[], reportedBy: string) {
    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const id of ids) {
      try {
        const order = await OrderModel.findById(id);
        if (!order) continue;

        // Calculate what remains to be sent
        const dispatchItems = [];

        // Helper to calculate sent
        const sentMap = new Map<string, number>();
        if (order.dispatches) {
          for (const d of order.dispatches) {
            for (const item of d.items) {
              const cur = sentMap.get(item.productId) || 0;
              sentMap.set(item.productId, cur + item.quantitySent);
            }
          }
        }

        for (const product of order.products) {
          const sent = sentMap.get(product._id!.toString()) || 0;
          const remaining = product.quantity - sent;

          if (remaining > 0) {
            dispatchItems.push({
              productId: product._id,
              name: product.name,
              quantitySent: remaining,
              quantityReceived: 0
            });
          }
        }

        if (dispatchItems.length > 0) {
          const destination = order.deliveryType === 'delivery'
            ? 'Delivery'
            : (order.branch || 'Centro de Producción');

          const newDispatch: any = {
            reportedAt: new Date(),
            modifiedAt: new Date(),
            destination: destination,
            items: dispatchItems,
            notes: "Batch Dispatch (Auto)",
            reportedBy: reportedBy,
            receptionStatus: "PENDING"
          };

          order.dispatches.push(newDispatch);
          this.recalculateDispatchStatus(order);
          await order.save();
          successCount++;
        } else {
          // Already full, maybe just ensure status is SENT
          if (order.dispatchStatus !== 'SENT') {
            order.dispatchStatus = 'SENT';
            await order.save();
            successCount++; // Count as handled
          }
        }

      } catch (error: any) {
        failedCount++;
        errors.push({ id, error: error.message });
      }
    }

    return { success: successCount, failed: failedCount, errors };
  }

  /**
   * Register a new dispatch report for an order.
   */
  async registerDispatch(orderId: string, dispatchData: { destination: string; items: any[]; notes?: string; reportedBy: string }) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    const newDispatch: any = {
      reportedAt: new Date(),
      modifiedAt: new Date(),
      destination: dispatchData.destination,
      items: dispatchData.items,
      notes: dispatchData.notes,
      reportedBy: dispatchData.reportedBy
    };

    order.dispatches.push(newDispatch);

    // Recalculate global dispatch status
    this.recalculateDispatchStatus(order);

    return await order.save();
  }

  /**
   * Update an existing dispatch report.
   * Enforces 1-hour edit window.
   */
  async updateDispatch(orderId: string, dispatchId: string, updates: { items?: any[]; notes?: string }) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    const dispatch = (order.dispatches as any).id(dispatchId);
    if (!dispatch) throw new Error("Dispatch report not found");

    // 1-Hour Edit Window Validation
    const now = new Date();
    const reportedAt = new Date(dispatch.reportedAt);
    const diffHours = (now.getTime() - reportedAt.getTime()) / (1000 * 60 * 60);

    if (diffHours > 1) {
      throw new Error("Edit window expired (1 hour limit).");
    }

    // Apply updates
    if (updates.items) dispatch.items = updates.items;
    if (updates.notes !== undefined) dispatch.notes = updates.notes;
    dispatch.modifiedAt = now;

    // Recalculate Status
    this.recalculateDispatchStatus(order);

    return await order.save();
  }

  async getReportsStats(range: 'today' | 'week') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let query: any = {};

    if (range === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query = {
        deliveryDate: { $gte: today, $lt: tomorrow }
      };
    } else {
      // Next 7 Days
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      query = {
        deliveryDate: { $gte: today, $lt: nextWeek }
      };
    }

    const orders = await OrderModel.find(query).lean();

    // Aggregations
    const totalOrders = orders.length;
    let dispatchedCount = 0;
    let completedProductionCount = 0;

    const byDestination: Record<string, number> = {
      'San Marino': 0,
      'Mall del Sol': 0,
      'Centro de Producción': 0,
      'Delivery': 0
    };

    const byStatus: Record<string, number> = {
      'SENT': 0,
      'PARTIAL': 0,
      'NOT_SENT': 0,
      'PROBLEM': 0
    };

    for (const o of orders) {
      // Production Completion
      if (o.productionStage === 'FINISHED') completedProductionCount++;

      // Dispatch Status
      const status = o.dispatchStatus || 'NOT_SENT';
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (status === 'SENT' || status === 'PROBLEM') dispatchedCount++;

      // Destination
      if (o.deliveryType === 'delivery') {
        byDestination['Delivery']++;
      } else {
        const branch = o.branch || 'Centro de Producción';
        // Normalize branch names slightly if needed, or rely on frontend providing consistent names
        if (branch.toLowerCase().includes('marino')) byDestination['San Marino']++;
        else if (branch.toLowerCase().includes('mall') || branch.toLowerCase().includes('sol')) byDestination['Mall del Sol']++;
        else byDestination['Centro de Producción']++;
      }
    }

    return {
      kpis: {
        totalOrders,
        dispatchedCount,
        completedProductionCount,
        dispatchRate: totalOrders > 0 ? Math.round((dispatchedCount / totalOrders) * 100) : 0,
        productionRate: totalOrders > 0 ? Math.round((completedProductionCount / totalOrders) * 100) : 0
      },
      byDestination,
      byStatus
    };
  }

  private recalculateDispatchStatus(order: any) {
    if (!order.dispatches || order.dispatches.length === 0) {
      order.dispatchStatus = "NOT_SENT";
      return;
    }

    // Map total quantity sent per product
    const sentMap = new Map<string, number>();

    for (const dispatch of order.dispatches) {
      for (const item of dispatch.items) {
        const current = sentMap.get(item.productId) || 0;
        sentMap.set(item.productId, current + item.quantitySent);
      }
    }

    let status: "SENT" | "PARTIAL" | "PROBLEM" = "SENT";

    // Compare with ordered products
    for (const product of order.products) {
      const sent = sentMap.get(product._id.toString()) || 0;

      if (sent === 0) {
        status = "PARTIAL"; // At least one item not sent at all implies partial (if others are sent)
      } else if (sent < product.quantity) {
        status = "PARTIAL"; // Sent less than needed
      } else if (sent > product.quantity) {
        // Over-sending is a "PROBLEM" or special case, but strictly speaking it's "SENT" with excess.
        // For simple UI, let's mark it as PROBLEM if we want to alert, or SENT if lenient.
        // Requirement said: "indicate if sent excess". 
        status = "PROBLEM";
      }
    }

    // If completely empty map (handled by first check), but logic flow ensures we check all products.
    // Refined logic:
    // Start assuming everything matches.
    let allMatch = true;
    let anyDeficit = false;
    let anyExcess = false;
    let allZero = true;

    for (const product of order.products) {
      const sent = sentMap.get(product._id.toString()) || 0;
      if (sent > 0) allZero = false;

      if (sent < product.quantity) {
        allMatch = false;
        anyDeficit = true;
      } else if (sent > product.quantity) {
        allMatch = false;
        anyExcess = true;
      }
    }

    if (allZero) {
      order.dispatchStatus = "NOT_SENT";
    } else if (anyExcess) {
      order.dispatchStatus = "PROBLEM"; // Excess
    } else if (anyDeficit) {
      order.dispatchStatus = "PARTIAL";
    } else {
      order.dispatchStatus = "SENT"; // Perfect match
    }
  }

  /**
   * Register dispatch progress for multiple items for a specific destination.
   * Distributes the sent quantities to the oldest pending orders (FIFO).
   */
  async registerDispatchProgress(destination: string, items: { name: string; quantity: number }[]) {
    const results: any[] = [];

    // Filter Logic for Destination to find matching orders
    // We need to match how we categorize orders (Sales Channel / Delivery Type)
    // Destination comes from frontend: 'San Marino', 'Mall del Sol', 'Centro de Producción', 'Domicilio / Delivery'

    let query: any = {
      // We look for orders that represent demand. 
      // They could be in any production stage, but dispatch usually implies they are ready or being sent.
      // We generally want to fulfill orders that are NOT full 'SENT'.
      dispatchStatus: { $ne: 'SENT' }
    };

    if (destination === 'Domicilio / Delivery') {
      query.deliveryType = 'delivery';
    } else {
      // Branch matching
      // We need flexible matching similar to stats or frontend
      if (destination.includes('Marino')) {
        query.branch = { $regex: /marino/i };
      } else if (destination.includes('Mall') || destination.includes('Sol')) {
        query.branch = { $regex: /(mall|sol)/i };
      } else if (destination.includes('Centro') || destination.includes('Producc')) {
        // Fallback or specific
        query.branch = { $regex: /(centro|producc)/i };
      }
      query.deliveryType = { $ne: 'delivery' };
    }

    // 1. Get Candidate Orders sorted by Date (FIFO)
    const orders = await OrderModel.find(query).sort({ deliveryDate: 1 });

    // 2. Process each reported item type
    for (const item of items) {
      let quantityToDistribute = item.quantity;
      let distributedCount = 0;

      for (const order of orders) {
        if (quantityToDistribute <= 0) break;

        // Check if order needs this item
        // Needs = Quantity Ordered - Quantity Already Sent

        // Calculate current sent for this specific item in this order
        let alreadySent = 0;
        if (order.dispatches && order.dispatches.length > 0) {
          for (const d of order.dispatches) {
            for (const dItem of d.items) {
              // Match by Name (since we are using product names here effectively)
              // Note: d.items usually stores { productId, name, quantitySent }
              if (dItem.name === item.name) {
                alreadySent += dItem.quantitySent;
              }
            }
          }
        }

        // Find the product definition in the order to get the target quantity
        const productDef = order.products.find(p => p.name === item.name);

        if (productDef) {
          // Validation: Can only dispatch what has been produced and not yet sent
          const produced = productDef.produced || 0;
          const alreadySentForProduct = alreadySent; // derived above

          // The "demand" is productDef.quantity
          // But the "capacity to receive dispatch" is limited by what is physically produced for this specific order
          // (Assuming 'produced' is tracked per-order, which it is in this model)

          const maxDispatchable = produced - alreadySentForProduct;

          // We also can't send more than the order requested obviously
          const needed = Math.min(productDef.quantity - alreadySentForProduct, maxDispatchable);

          if (needed > 0) {
            // We can allocate here
            const take = Math.min(needed, quantityToDistribute);

            // Create Dispatch Record for this Order
            const dispatchEntry: any = {
              reportedAt: new Date(),
              modifiedAt: new Date(),
              destination: destination,
              items: [{
                productId: productDef._id, // If available
                name: productDef.name,
                quantitySent: take
              }],
              notes: 'Auto-distributed from Mass Dispatch',
              reportedBy: 'Producción'
            };

            order.dispatches.push(dispatchEntry);

            // Update counters
            quantityToDistribute -= take;
            distributedCount += take;

            // Update Order Status immediately so next iteration knows (though we are in memory loop)
            this.recalculateDispatchStatus(order);

            // Explicitly mark modified to ensure array updates persist
            order.markModified('dispatches');
            await order.save();
          }
        }
      }

      results.push({
        item: item.name,
        requested: item.quantity,
        distributed: distributedCount,
        remaining: quantityToDistribute // Excess
      });
    }

    return results;
  }
  async voidOrder(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    order.productionStage = "VOID";
    order.voidedAt = new Date();
    return await order.save();
  }

  async restoreOrder(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    // 1-Hour Constraint Check
    if (order.productionStage === 'VOID' && order.voidedAt) {
      const now = new Date().getTime();
      const voidTime = new Date(order.voidedAt).getTime();
      const diffHours = (now - voidTime) / (1000 * 60 * 60);

      if (diffHours > 1) {
        throw new Error("Time limit exceeded. Voided orders can only be restored within 1 hour.");
      }
    }

    order.productionStage = "PENDING";
    order.voidedAt = null; // Clear timestamp
    return await order.save();
  }
}
