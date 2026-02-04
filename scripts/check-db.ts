
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ParLevelModel } from '../src/models/par-level.model';

dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.DB_URI || '');
    console.log("Connected to MongoDB");

    const count = await ParLevelModel.countDocuments();
    console.log(`Total ParLevels in DB: ${count}`);

    const items = await ParLevelModel.find().limit(5);
    console.log("First 5 items:", items.map(i => i.productName));

    process.exit(0);
  } catch (error) {
    console.error("Error checking:", error);
    process.exit(1);
  }
}

check();
