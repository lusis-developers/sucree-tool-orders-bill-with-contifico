import { Schema, model, Document, Types } from "mongoose";

// Interface for Raw Material
export interface IRawMaterial extends Document {
  name: string;
  unit: "g" | "ml" | "u";
  quantity: number;
  cost: number;
  wastePercentage: number; // 0-100%
  minStock: number;
  provider?: Types.ObjectId;
  category?: string;
}

// Raw Material Schema
const RawMaterialSchema = new Schema<IRawMaterial>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    unit: {
      type: String,
      enum: ["g", "ml", "u"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    wastePercentage: {
      type: Number,
      required: false,
      default: 0,
    },
    minStock: {
      type: Number,
      required: false,
      default: 0,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
    },
    category: {
      type: String,
      required: false,
      default: "Sin Categoría",
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Export Model
export const RawMaterialModel = model<IRawMaterial>("RawMaterial", RawMaterialSchema);
