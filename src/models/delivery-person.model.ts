import { Schema, model, Document } from "mongoose";

export interface IDeliveryPerson extends Document {
  name: string;
  identification: string;
  phone?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryPersonSchema = new Schema<IDeliveryPerson>(
  {
    name: { type: String, required: true },
    identification: { type: String, required: true, unique: true },
    phone: { type: String },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const DeliveryPersonModel = model<IDeliveryPerson>("DeliveryPerson", DeliveryPersonSchema);
