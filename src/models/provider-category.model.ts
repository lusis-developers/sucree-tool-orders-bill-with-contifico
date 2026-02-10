import { Schema, model, Document } from "mongoose";

export interface IProviderCategory extends Document {
  name: string;
  isActive: boolean;
}

const ProviderCategorySchema = new Schema<IProviderCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ProviderCategoryModel = model<IProviderCategory>(
  "ProviderCategory",
  ProviderCategorySchema
);
