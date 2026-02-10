import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";

export async function getProviderCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await models.providerCategories.find().sort({ name: 1 });
    res.status(HttpStatusCode.Ok).send({
      message: "Provider categories retrieved successfully.",
      data: categories
    });
    return;
  } catch (error) {
    console.error("❌ Error in getProviderCategories:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error fetching provider categories.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function createProviderCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Category name is required."
      });
      return;
    }

    const existing = await models.providerCategories.findOne({ name });
    if (existing) {
      res.status(HttpStatusCode.Conflict).send({
        message: "A category with this name already exists."
      });
      return;
    }

    const newCategory = new models.providerCategories({ name });
    await newCategory.save();

    res.status(HttpStatusCode.Created).send({
      message: "Provider category created successfully.",
      data: newCategory
    });
    return;
  } catch (error) {
    console.error("❌ Error in createProviderCategory:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error creating provider category.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function updateProviderCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const category = await models.providerCategories.findByIdAndUpdate(
      id,
      { name, isActive },
      { new: true }
    );

    if (!category) {
      res.status(HttpStatusCode.NotFound).send({ message: "Provider category not found." });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Provider category updated successfully.",
      data: category
    });
    return;
  } catch (error) {
    console.error("❌ Error in updateProviderCategory:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error updating provider category.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function deleteProviderCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Check if any provider is using this category
    const providerWithCategory = await models.providers.findOne({ category: id });
    if (providerWithCategory) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Cannot delete category because it is being used by one or more providers."
      });
      return;
    }

    const category = await models.providerCategories.findByIdAndDelete(id);
    if (!category) {
      res.status(HttpStatusCode.NotFound).send({ message: "Provider category not found." });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Provider category deleted successfully."
    });
    return;
  } catch (error) {
    console.error("❌ Error in deleteProviderCategory:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error deleting provider category.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}
