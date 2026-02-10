
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { UserModel } from "../src/models/user.model";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const USER_TO_SEED = {
  name: "Supply Chain Manager",
  email: "compras@nicole.com.ec",
  password: "Nicole2020!",
  role: "SUPPLY_CHAIN_MANAGER",
};

async function seedSupplyChainUser() {
  try {
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      throw new Error("DB_URI not defined in environment");
    }

    await mongoose.connect(dbUri);
    console.log("✅ Connected to MongoDB for seeding supply chain user.");

    const existingUser = await UserModel.findOne({ email: USER_TO_SEED.email });

    if (existingUser) {
      if (existingUser.role !== USER_TO_SEED.role) {
        existingUser.role = USER_TO_SEED.role as any;
        await existingUser.save();
        console.log(`✅ Updated role for ${USER_TO_SEED.email} to ${USER_TO_SEED.role}`);
      } else {
        console.log(`ℹ️ User ${USER_TO_SEED.email} already exists with correct role. Skipping.`);
      }
    } else {
      const hashedPassword = await bcrypt.hash(USER_TO_SEED.password, 10);
      const newUser = new UserModel({
        ...USER_TO_SEED,
        password: hashedPassword
      });
      await newUser.save();
      console.log(`✅ Created user: ${USER_TO_SEED.email} (${USER_TO_SEED.role})`);
    }

    console.log("✨ Seeding completed.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedSupplyChainUser();
