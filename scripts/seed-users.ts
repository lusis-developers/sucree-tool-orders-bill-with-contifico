
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { UserModel } from "../src/models/user.model";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const USERS_TO_SEED = [
  {
    name: "Retail Manager",
    email: "retailmanager@nicole.com.ec",
    password: "Nicole2020!",
    role: "RetailManager",
  },
];

async function seedUsers() {
  try {
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      throw new Error("DB_URI not defined in environment");
    }

    await mongoose.connect(dbUri);
    console.log("✅ Connected to MongoDB for seeding.");

    // Cleanup old user if exists
    await UserModel.deleteOne({ email: "stores@nicole.com.ec" });
    console.log("🗑️ Removed old user stores@nicole.com.ec if existed.");

    for (const userData of USERS_TO_SEED) {
      const existingUser = await UserModel.findOne({ email: userData.email });

      if (existingUser) {
        if (existingUser.role !== userData.role) {
          existingUser.role = userData.role as any;
          await existingUser.save();
          console.log(`✅ Updated role for ${userData.email} to ${userData.role}`);
        } else {
          console.log(`ℹ️ User ${userData.email} already exists with correct role. Skipping.`);
        }
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = new UserModel({
          ...userData,
          password: hashedPassword
        });
        await newUser.save();
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }
    }

    console.log("✨ Seeding completed.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedUsers();
