import { OrderModel } from "./order.model";
import { DailySummaryModel } from "./daily-summary.model";
import { UserModel } from "./user.model";
import { ParLevelModel } from "./par-level.model";
import { DeliveryPersonModel } from "./delivery-person.model";
import { ProviderModel } from "./provider.model";
import { RawMaterialModel } from "./raw-material.model";
import { ProviderCategoryModel } from "./provider-category.model";

export const models = {
  orders: OrderModel,
  dailySummaries: DailySummaryModel,
  users: UserModel,
  parLevels: ParLevelModel,
  deliveryPersons: DeliveryPersonModel,
  providers: ProviderModel,
  rawMaterials: RawMaterialModel,
  providerCategories: ProviderCategoryModel,
};
