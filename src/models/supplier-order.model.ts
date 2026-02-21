import { Schema, model, Document, Types } from "mongoose";

export interface ISupplierOrderItem {
  material: Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
}

export interface ISupplierOrder extends Document {
  provider: Types.ObjectId;
  items: ISupplierOrderItem[];
  deliveryDate: Date;
  user: Types.ObjectId;
  status: "PENDING" | "SENT" | "RECEIVED" | "CANCELLED";
  whatsappMessage?: string;
  totalEstimatedValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierOrderItemSchema = new Schema({
  material: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
});

const SupplierOrderSchema = new Schema<ISupplierOrder>(
  {
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    items: [SupplierOrderItemSchema],
    deliveryDate: { type: Date, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "RECEIVED", "CANCELLED"],
      default: "PENDING",
    },
    whatsappMessage: { type: String },
    totalEstimatedValue: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const SupplierOrderModel = model<ISupplierOrder>("SupplierOrder", SupplierOrderSchema);
