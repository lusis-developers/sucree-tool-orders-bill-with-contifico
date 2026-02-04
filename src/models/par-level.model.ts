import { Schema, model, Document } from "mongoose";

export interface IParLevel extends Document {
  productName: string;
  contificoId: string;
  dailyMinStock: {
    Mon: number;
    Tue: number;
    Wed: number;
    Thu: number;
    Fri: number;
    Sat: number;
    Sun: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ParLevelSchema = new Schema<IParLevel>(
  {
    productName: { type: String, required: true, unique: true },
    contificoId: { type: String, required: true },
    dailyMinStock: {
      Mon: { type: Number, default: 0 },
      Tue: { type: Number, default: 0 },
      Wed: { type: Number, default: 0 },
      Thu: { type: Number, default: 0 },
      Fri: { type: Number, default: 0 },
      Sat: { type: Number, default: 0 },
      Sun: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ParLevelModel = model<IParLevel>("ParLevel", ParLevelSchema);
