"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = require("../src/models/user.model");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
const USERS_TO_SEED = [
    {
        name: "Retail Manager",
        email: "retailmanager@sucree.com.ec",
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
        await mongoose_1.default.connect(dbUri);
        console.log("✅ Connected to MongoDB for seeding.");
        // Cleanup old user if exists
        await user_model_1.UserModel.deleteOne({ email: "stores@sucree.com.ec" });
        console.log("🗑️ Removed old user stores@sucree.com.ec if existed.");
        for (const userData of USERS_TO_SEED) {
            const existingUser = await user_model_1.UserModel.findOne({ email: userData.email });
            if (existingUser) {
                if (existingUser.role !== userData.role) {
                    existingUser.role = userData.role;
                    await existingUser.save();
                    console.log(`✅ Updated role for ${userData.email} to ${userData.role}`);
                }
                else {
                    console.log(`ℹ️ User ${userData.email} already exists with correct role. Skipping.`);
                }
            }
            else {
                const hashedPassword = await bcryptjs_1.default.hash(userData.password, 10);
                const newUser = new user_model_1.UserModel({
                    ...userData,
                    password: hashedPassword
                });
                await newUser.save();
                console.log(`✅ Created user: ${userData.email} (${userData.role})`);
            }
        }
        console.log("✨ Seeding completed.");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}
seedUsers();
