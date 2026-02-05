import { models } from "../models";
import { ContificoService } from "./contifico.service";
import { IParLevel } from "../models/par-level.model";
import { normalizeString } from "../utils/string.utils";
import { DEFAULT_PAR_LEVELS } from "./replenishment.constants";

export class ReplenishmentService {
  private contificoService: ContificoService;

  constructor() {
    this.contificoService = new ContificoService();
  }

  /**
   * Calculate replenishment for a specific warehouse
   * @param warehouseName Default: "San Marino"
   */
  async calculateReplenishment(warehouseName: string = "San Marino") {
    // 1. Get all Par Levels
    let parLevels = await models.parLevels.find();

    if (parLevels.length === 0) {
      await this.seedParLevels(DEFAULT_PAR_LEVELS);
      parLevels = await models.parLevels.find();
    }

    if (parLevels.length === 0) {
      throw new Error("No par levels established. Auto-seeding failed or Contífico matches not found.");
    }

    // 2. Identify Warehouse in Contifico
    const warehouses = await this.contificoService.getWarehouses();
    const targetWarehouse = warehouses.find((w: any) =>
      w.nombre.toLowerCase().includes(warehouseName.toLowerCase())
    );

    if (!targetWarehouse) {
      throw new Error(`Warehouse '${warehouseName}' not found in Contífico.`);
    }

    const warehouseId = targetWarehouse.id;

    // 3. Get current day of week (e.g. "Mon", "Tue", etc.)
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date());
    type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    const dayKey = dayOfWeek as DayKey;

    // 4. Get today's and yesterday's sales from "Isla"
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = today.toLocaleDateString("en-GB"); // DD/MM/YYYY
    const yesterdayStr = yesterday.toLocaleDateString("en-GB");

    const todaySalesMap = new Map<string, number>();
    const yesterdaySalesMap = new Map<string, number>();

    try {
      const cajas = await this.contificoService.getCajas();
      const islandCaja = cajas.find((c: any) =>
        c.nombre_punto_emision?.toLowerCase().includes("isla") ||
        c.nombre_caja?.toLowerCase().includes("isla")
      );

      if (islandCaja) {
        // Fetch for both days
        const [docsToday, docsYesterday] = await Promise.all([
          this.contificoService.getDocuments({ fecha_emision: todayStr, pos: islandCaja.pos }),
          this.contificoService.getDocuments({ fecha_emision: yesterdayStr, pos: islandCaja.pos })
        ]);

        const processDocs = async (docs: any[], targetMap: Map<string, number>) => {
          for (const doc of docs) {
            try {
              const docDetail = await this.contificoService.getDocument(doc.id);
              if (docDetail.detalles) {
                for (const detail of docDetail.detalles) {
                  const current = targetMap.get(detail.producto_id) || 0;
                  targetMap.set(detail.producto_id, current + detail.cantidad);
                }
              }
            } catch (e) {
              // console.warn(`Failed to fetch details for doc ${doc.id}`); // Silenced
            }
          }
        };

        await Promise.all([
          processDocs(docsToday, todaySalesMap),
          processDocs(docsYesterday, yesterdaySalesMap)
        ]);
      }
    } catch (err) {
      // console.warn("⚠️ Failed to fetch Isla sales:", err); // Silenced
    }

    // 5. Calculate for each product
    const results = [];
    let totalCakes = 0;

    for (const par of parLevels) {
      const stockInfo = await this.contificoService.getStockByProduct(par.contificoId);
      const warehouseStock = stockInfo.find((s: any) => s.bodega_id === warehouseId);
      const currentStock = warehouseStock ? warehouseStock.cantidad : 0;

      const todaySales = todaySalesMap.get(par.contificoId) || 0;
      const yesterdaySales = yesterdaySalesMap.get(par.contificoId) || 0;
      const targetStock = par.dailyMinStock[dayKey as keyof typeof par.dailyMinStock] || 0;

      const amountToRestock = Math.max(0, targetStock - currentStock);

      const normalizedProdName = normalizeString(par.productName);
      const isPortion = normalizedProdName.includes("porcion");
      const isTarta = normalizedProdName.includes("tarta");
      const portionsPerCake = isTarta ? 12 : 10;

      const wholeCakesToRestock = isPortion ? Math.ceil(amountToRestock / portionsPerCake) : 0;
      if (wholeCakesToRestock > 0) totalCakes += wholeCakesToRestock;

      results.push({
        productName: par.productName,
        contificoId: par.contificoId,
        currentStock,
        todaySales,
        yesterdaySales,
        targetStock,
        amountToRestock,
        portionsPerCake: isPortion ? portionsPerCake : undefined,
        wholeCakesToRestock: isPortion ? wholeCakesToRestock : undefined,
        day: dayOfWeek
      });
    }

    return {
      warehouse: targetWarehouse.nombre,
      warehouseId: warehouseId,
      calculatedAt: new Date(),
      totalWholeCakes: totalCakes,
      items: results
    };
  }

  /**
   * Seed par levels from the provided data
   * This is a utility method to initialize the database
   */
  async seedParLevels(data: any[]) {
    // data structure expected: [{ name: string, minStock: { Mon, Tue, ... } }]
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    // First, fetch products from Contifico to get IDs
    const contificoProducts = await this.contificoService.getProducts({ result_size: 2000 });

    for (const item of data) {
      try {
        // Find matching product in Contifico using strict normalization
        const normalizedItemName = normalizeString(item.name);

        let match = contificoProducts.find((p: any) => {
          const normalizedContificoName = normalizeString(p.nombre);
          return normalizedContificoName === normalizedItemName;
        });

        if (!match) {
          // Fallback: search for best partial match excluding bundles
          const candidates = contificoProducts.filter((p: any) => {
            const normalizedContificoName = normalizeString(p.nombre);
            return normalizedContificoName.includes(normalizedItemName) &&
              !normalizedContificoName.includes("combo") &&
              !normalizedContificoName.includes("break");
          });

          if (candidates.length > 0) {
            match = candidates.sort((a: any, b: any) => a.nombre.length - b.nombre.length)[0];
          }
        }

        if (!match) {
          results.failed++;
          results.errors.push(`Product '${item.name}' not found in Contífico.`);
          continue;
        }

        const existing = await models.parLevels.findOne({ productName: item.name });

        if (existing) {
          existing.contificoId = match.id;
          existing.dailyMinStock = item.minStock;
          await existing.save();
          results.updated++;
        } else {
          await models.parLevels.create({
            productName: item.name,
            contificoId: match.id,
            dailyMinStock: item.minStock
          });
          results.created++;
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error processing '${item.name}': ${err.message}`);
      }
    }

    return results;
  }
}
