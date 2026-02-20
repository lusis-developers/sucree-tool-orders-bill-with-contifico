import { Schema, model, Document } from "mongoose";

export type WeeklyObjectives = {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
};

export interface IPOSStockObjective extends Document {
  branch: "San Marino" | "Mall del Sol";
  productName: string;
  unit: string;
  contificoId?: string;
  objectives: WeeklyObjectives;
}

const POSStockObjectiveSchema = new Schema<IPOSStockObjective>(
  {
    branch: {
      type: String,
      enum: ["San Marino", "Mall del Sol"],
      required: true,
    },
    productName: { type: String, required: true },
    unit: { type: String, required: true, default: "unidad" },
    contificoId: { type: String },
    objectives: {
      monday: { type: Number, default: 0 },
      tuesday: { type: Number, default: 0 },
      wednesday: { type: Number, default: 0 },
      thursday: { type: Number, default: 0 },
      friday: { type: Number, default: 0 },
      saturday: { type: Number, default: 0 },
      sunday: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

POSStockObjectiveSchema.index({ branch: 1, productName: 1 }, { unique: true });

export const POSStockObjectiveModel = model<IPOSStockObjective>(
  "POSStockObjective",
  POSStockObjectiveSchema
);
