import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";

export async function getProviders(req: Request, res: Response, next: NextFunction) {
  try {
    const providers = await models.providers.find().sort({ name: 1 });
    res.status(HttpStatusCode.Ok).send({
      message: "Providers retrieved successfully.",
      data: providers
    });
    return;
  } catch (error) {
    console.error("❌ Error in getProviders:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error fetching providers.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function createProvider(req: Request, res: Response, next: NextFunction) {
  try {
    const providerData = req.body;

    if (!providerData.name) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Provider name is required."
      });
      return;
    }

    const existing = await models.providers.findOne({ name: providerData.name });
    if (existing) {
      res.status(HttpStatusCode.Conflict).send({
        message: "A provider with this name already exists."
      });
      return;
    }

    const newProvider = new models.providers(providerData);
    await newProvider.save();

    res.status(HttpStatusCode.Created).send({
      message: "Provider created successfully.",
      data: newProvider
    });
    return;
  } catch (error) {
    console.error("❌ Error in createProvider:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error creating provider.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function updateProvider(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const provider = await models.providers.findByIdAndUpdate(id, updateData, { new: true });
    if (!provider) {
      res.status(HttpStatusCode.NotFound).send({ message: "Provider not found." });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Provider updated successfully.",
      data: provider
    });
    return;
  } catch (error) {
    console.error("❌ Error in updateProvider:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error updating provider.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function deleteProvider(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const provider = await models.providers.findByIdAndDelete(id);
    if (!provider) {
      res.status(HttpStatusCode.NotFound).send({ message: "Provider not found." });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Provider deleted successfully."
    });
    return;
  } catch (error) {
    console.error("❌ Error in deleteProvider:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error deleting provider.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}
