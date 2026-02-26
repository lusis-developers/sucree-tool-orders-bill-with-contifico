
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { RawMaterialModel } from "../src/models/raw-material.model";
import { ProviderModel } from "../src/models/provider.model";
import { ProviderCategoryModel } from "../src/models/provider-category.model";

import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dataPath = path.resolve(__dirname, "raw-materials-data.json");
const RAW_MATERIALS_DATA: any[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

async function seedRawMaterials() {
  try {
    const dbUri = process.env.DB_URI;
    if (!dbUri) throw new Error("DB_URI not defined");

    await mongoose.connect(dbUri);
    console.log("✅ Connected to MongoDB.");

    // 1. Cleanup
    await RawMaterialModel.deleteMany({});
    await ProviderModel.deleteMany({});
    await ProviderCategoryModel.deleteMany({});
    console.log("🗑️ Cleared existing raw materials, providers, and categories.");

    const catName = "Sin Categoría";
    let defaultCat = await ProviderCategoryModel.findOne({ name: catName });
    if (!defaultCat) {
      defaultCat = await ProviderCategoryModel.create({ name: catName });
      console.log(`📁 Created default category: ${catName}`);
    }

    const providerMap = new Map<string, any>();
    let count = 0;

    for (const item of RAW_MATERIALS_DATA) {
      // 3. Handle Provider
      const provName = item.Proveedor || "Sin Proveedor";
      if (!providerMap.has(provName)) {
        let prov = await ProviderModel.findOne({ name: provName });
        if (!prov) {
          prov = await ProviderModel.create({
            name: provName,
            category: defaultCat._id
          });
          console.log(`🚚 Created provider: ${provName}`);
        }
        providerMap.set(provName, prov);
      }

      // 4. Map Unit
      let standardUnit: "g" | "ml" | "u" = "u";
      const rawUnit = item.Unidad?.toLowerCase();
      if (rawUnit === "gramos" || rawUnit === "g") standardUnit = "g";
      else if (rawUnit === "mililitros" || rawUnit === "ml") standardUnit = "ml";
      else standardUnit = "u";

      // 5. Create Raw Material
      let movDate = new Date();
      if (item.FechaMovimiento && item.FechaMovimiento.includes('/')) {
        const parts = item.FechaMovimiento.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]) + 2000;
          const parsed = new Date(year, month, day);
          if (!isNaN(parsed.getTime())) {
            movDate = parsed;
          }
        }
      }

      await RawMaterialModel.create({
        code: item.Codigo,
        name: item.Nombre,
        item: item.Descripcion || item.Nombre,
        category: catName,
        provider: providerMap.get(provName)?._id,
        unit: standardUnit,
        cost: parseFloat(item.Costo || "0"),
        presentationName: item.Presentacion || "Unidad",
        presentationPrice: parseFloat(item.Costo || "0"),
        presentationQuantity: 1,
        quantity: 0,
        lastEntryNumber: item.UltMovIngreso,
        lastInvoice: item.UltFacCompra,
        lastMovementDate: movDate
      });
      count++;
    }

    console.log(`✨ Seeded ${count} materials.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

seedRawMaterials();
