import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";

export async function seedSupplyChain(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Clear existing data as requested
    await Promise.all([
      models.rawMaterials.deleteMany({}),
      models.providers.deleteMany({}),
      models.providerCategories.deleteMany({})
    ]);

    // 2. Create a default provider
    const defaultProvider = new models.providers({
      name: "VARIOS",
      commercialAgents: []
    });
    await defaultProvider.save();

    // 3. Define initial items
    const initialItems = [
      { name: "Pack Histórico San Valentín", item: "Pastelería" },
      { name: "Naranja y Frambuesa", item: "Pastelería" },
      { name: "Cuatro Leches", item: "Pastelería" },
      { name: "Arandanos & Nido", item: "Pastelería" },
      { name: "Arandanos & Nido porcion", item: "Porciones" },
      { name: "Tiramisu porcion", item: "Porciones" },
      { name: "Mango & Maracuya porcion", item: "Porciones" },
      { name: "Hazelnut porcion", item: "Porciones" },
      { name: "Pistacho y Mora", item: "Pastelería" },
      { name: "Delivery", item: "Logística" },
      { name: "PACK PEQUEÑO", item: "Empaque" },
      { name: "Chocolate & Frutos rojos", item: "Pastelería" },
      { name: "Tazón 7 oz Delacrem", item: "Accesorios" },
      { name: "Tupper HB", item: "Empaque" },
      { name: "Caja de degustación", item: "Otros" },
      { name: "Tarta de Queso", item: "Pastelería" }
    ];

    // 4. Map to RawMaterial documents
    const rawMaterials = initialItems.map(item => ({
      ...item,
      unit: "u",
      quantity: 0,
      cost: 0,
      wastePercentage: 0,
      minStock: 0,
      provider: defaultProvider._id,
      category: "Sin Categoría"
    }));

    // 5. Insert items
    await models.rawMaterials.insertMany(rawMaterials);

    res.status(HttpStatusCode.Ok).send({
      message: "Supply chain data cleared and seeded successfully.",
      count: rawMaterials.length,
      provider: defaultProvider.name
    });
    return;
  } catch (error) {
    console.error("❌ Error in seedSupplyChain:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error during seeding.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}
