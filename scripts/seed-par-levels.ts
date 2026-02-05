
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ParLevelModel } from '../src/models/par-level.model';
import { ContificoService } from '../src/services/contifico.service';
import { normalizeString } from '../src/utils/string.utils';

import { DEFAULT_PAR_LEVELS } from '../src/services/replenishment.constants';

dotenv.config();

const data = DEFAULT_PAR_LEVELS;

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

async function seed() {
  try {
    await mongoose.connect(process.env.DB_URI || '');
    console.log("Connected to MongoDB");

    const contifico = new ContificoService();
    console.log("Fetching products from Contifico...");
    const products = await contifico.getProducts({ result_size: 2000 });

    for (const item of data) {
      const normalizedItemName = normalizeString(item.name);

      // Strict matching logic
      let match = products.find((p: any) => {
        const normalizedContificoName = normalizeString(p.nombre);
        // Case 1: Exact match is best
        return normalizedContificoName === normalizedItemName;
      });

      if (!match) {
        // Fallback: If not exact, let's try includes but avoiding combos (heuristic)
        const candidates = products.filter((p: any) => {
          const normalizedContificoName = normalizeString(p.nombre);
          return normalizedContificoName.includes(normalizedItemName) &&
            !normalizedContificoName.includes("combo") &&
            !normalizedContificoName.includes("break");
        });

        // Pick shortest name as most likely individual product
        if (candidates.length > 0) {
          match = candidates.sort((a: any, b: any) => a.nombre.length - b.nombre.length)[0];
        }
      }

      if (!match) {
        console.warn(`⚠️ No match found for: ${item.name} (normalized: ${normalizedItemName})`);
        continue;
      }

      const minStock: any = {};
      days.forEach((day, index) => {
        minStock[day] = item.stock[index];
      });

      await ParLevelModel.findOneAndUpdate(
        { productName: item.name },
        {
          productName: item.name,
          contificoId: match.id,
          dailyMinStock: minStock
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded: ${item.name} -> Contífico: ${match.nombre} (${match.id})`);
    }

    console.log("\n--- SEEDING COMPLETE ---");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seed();
