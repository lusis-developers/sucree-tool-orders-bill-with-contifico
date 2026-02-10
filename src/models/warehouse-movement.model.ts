import { Schema, model, Document, Types } from "mongoose";

export interface IWarehouseMovement extends Document {
  type: "IN" | "OUT";
  rawMaterial: Types.ObjectId;
  quantity: number; // Always positive
  date: Date;
  provider?: Types.ObjectId; // For IN
  entity?: string; // For OUT
  user: Types.ObjectId;
  observation?: string;
}

const WarehouseMovementSchema = new Schema<IWarehouseMovement>(
  {
    type: {
      type: String,
      enum: ["IN", "OUT"],
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

export const WarehouseMovementModel = model<IWarehouseMovement>("WarehouseMovement", WarehouseMovementSchema);
