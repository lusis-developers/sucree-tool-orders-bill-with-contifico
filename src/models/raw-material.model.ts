import { Schema, model, Document, Types } from "mongoose";

// Interface for Raw Material
export interface IRawMaterial extends Document {
  name: string;
  item?: string; // Base item name for grouping
  code?: string; // Generated SKU/Code
  unit: "g" | "ml" | "u";
  quantity: number;
  cost: number; // Unit cost (auto-calculated)
  wastePercentage: number; // 0-100%
  minStock: number;
  maxStock: number;
  provider?: Types.ObjectId;
  category?: string;

  // Professional Presentation Fields
  presentationName?: string;
  presentationPrice?: number;
  presentationQuantity?: number;

  // Tracking Fields
  lastInvoice?: string;
  lastEntryNumber?: string;
  lastMovementDate?: Date;
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
    item: {
      type: String,
      required: false,
      trim: true,
    },
    code: {
      type: String,
      required: false,
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
    maxStock: {
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
    },
    // Professional Presentation Fields
    presentationName: {
      type: String,
      required: false,
      trim: true,
    },
    presentationPrice: {
      type: Number,
      required: false,
      default: 0,
    },
    presentationQuantity: {
      type: Number,
      required: false,
      default: 1, // Avoid division by zero
    },
    // Tracking Fields
    lastInvoice: {
      type: String,
      required: false,
      trim: true,
    },
    lastEntryNumber: {
      type: String,
      required: false,
      trim: true,
    },
    lastMovementDate: {
      type: Date,
      required: false,
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Export Model
export const RawMaterialModel = model<IRawMaterial>("RawMaterial", RawMaterialSchema);
