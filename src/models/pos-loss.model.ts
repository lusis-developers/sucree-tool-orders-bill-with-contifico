import { Schema, model, Document } from "mongoose";

export interface IPOSLoss extends Document {
  branch: string;
  productName: string;
  quantity: number;
  reason: string;
  category: "Transport" | "Storage" | "Production" | "Other";
  date: Date;
  submittedBy: string;
}

const POSLossSchema = new Schema<IPOSLoss>(
  {
    branch: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, required: true },
    category: {
      type: String,
      enum: ["Transport", "Storage", "Production", "Other"],
      default: "Other"
    },
    date: { type: Date, required: true },
    submittedBy: { type: String, required: true },
  },
  { timestamps: true }
);

POSLossSchema.index({ branch: 1, date: 1, productName: 1 });

export const POSLossModel = model<IPOSLoss>("POSLoss", POSLossSchema);
