import type { Request, Response } from "express";
import { HttpStatusCode } from "axios";
import { ReplenishmentService } from "../services/replenishment.service";

const replenishmentService = new ReplenishmentService();

/**
 * GET /api/replenishment/calculate
 */
export async function calculateReplenishment(req: Request, res: Response) {
  try {
    const { warehouse } = req.query;
    const result = await replenishmentService.calculateReplenishment(warehouse as string);

    res.status(HttpStatusCode.Ok).send({
      message: "Replenishment calculated successfully.",
      ...result
    });
    return;
  } catch (error: any) {
    console.error("❌ Error calculating replenishment:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Failed to calculate replenishment.",
      error: error.message
    });
    return;
  }
}

/**
 * POST /api/replenishment/seed
 * Body: { data: [{ name, minStock: { Mon, Tue, ... } }] }
 */
export async function seedParLevels(req: Request, res: Response) {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Data array is required for seeding."
      });
      return;
    }

    const result = await replenishmentService.seedParLevels(data);

    res.status(HttpStatusCode.Ok).send({
      message: "Par levels seeded successfully.",
      result
    });
    return;
  } catch (error: any) {
    console.error("❌ Error seeding par levels:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Failed to seed par levels.",
      error: error.message
    });
    return;
  }
}
