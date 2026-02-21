import { Schema, model, Document, Types } from "mongoose";

export interface IWarehouseMovement extends Document {
  type: "IN" | "OUT" | "LOSS";
  rawMaterial: Types.ObjectId;
  quantity: number; // Always positive, stored in backend units (g / ml / unit)
  unitCost?: number; // Cost per backend unit (USD/g or USD/ml) at the time of movement
  totalValue?: number; // Pre-computed total (USD) = qty_display * unitCost_display
  date: Date;
  provider?: Types.ObjectId; // For IN
  entity?: string; // For OUT
  user: Types.ObjectId;
  responsible?: string; // Who received or delivered
  observation?: string;
}

const WarehouseMovementSchema = new Schema<IWarehouseMovement>(
  {
    type: {
      type: String,
      enum: ["IN", "OUT", "LOSS"],
      required: true,
    },
    rawMaterial: {
      type: Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      min: 0,
      // Cost per backend unit (USD/g or USD/ml) paid at the time of this movement.
      // Allows auditing price deviations from the catalog cost.
    },
    totalValue: {
      type: Number,
      min: 0,
      // Total USD value of this movement. Stored for instant reporting.
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
    },
    entity: {
      type: String,
      enum: [
        "Nicole Pastry Arts - San marino",
        "Nicole Pastry Arts - Mall del sol",
        "Finestra - CDP",
        "Delacrem - Mall del sol",
        "Casa mía - Mall del sol",
        "Sucreenda - CDP",
        "Sucree - Vivantino",
      ],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    responsible: {
      type: String,
      trim: true,
    },
    observation: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const WarehouseMovementModel = model<IWarehouseMovement>(
  "WarehouseMovement",
  WarehouseMovementSchema
);
