import type { Request, Response } from "express";
import { HttpStatusCode } from "axios";
import { POSService } from "../services/pos.service";
import { AuthRequest } from "../types/AuthRequest";

const posService = new POSService();

/**
 * GET /api/pos/dispatches
 * Query Params: branch (required) - e.g. "San Marino"
 */
export async function getIncomingDispatches(req: Request, res: Response) {
  try {
    const { branch } = req.query;

    if (!branch) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Branch parameter is required." });
      return;
    }

    const dispatches = await posService.getIncomingDispatches(branch as string);

    res.status(HttpStatusCode.Ok).send({
      message: "Incoming dispatches retrieved successfully.",
      count: dispatches.length,
      data: dispatches
    });
  } catch (error: any) {
    console.error("Error retrieving incoming dispatches:", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Failed to retrieve dispatches.", error: error.message });
  }
}

/**
 * POST /api/pos/dispatches/:orderId/:dispatchId/confirm
 * Body: { receivedBy, receptionNotes, items: [{ productId, quantityReceived, itemStatus }] }
 */
export async function confirmReception(req: Request, res: Response) {
  try {
    // Cast req to AuthRequest if we want to use req.user, but for now we trust body or auth middleware
    const { orderId, dispatchId } = req.params;
    const { receivedBy, receptionNotes, items } = req.body;

    // Fallback to logged in user name if available?
    // const user = (req as AuthRequest).user;
    // const effectiveReceivedBy = receivedBy || (user ? user.name : "POS Admin");
    // However, prompts typically stick to explicit body params if defined.

    if (!items || !Array.isArray(items)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Items array is required for reception confirmation." });
      return;
    }

    const result = await posService.registerReception(orderId, dispatchId, {
      receivedBy: receivedBy || "POS Manager",
      receptionNotes,
      items
    });

    res.status(HttpStatusCode.Ok).send({
      message: "Reception confirmed successfully.",
      data: result
    });
  } catch (error: any) {
    console.error("Error confirming reception:", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Failed to confirm reception.", error: error.message });
  }
}

/**
 * GET /api/pos/pickups
 * Query Params: branch (required)
 */
export async function getPickupOrders(req: Request, res: Response) {
  try {
    const { branch } = req.query;

    if (!branch) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Branch parameter is required." });
      return;
    }

    const orders = await posService.getPickupOrders(branch as string);

    res.status(HttpStatusCode.Ok).send({
      message: "Pickup orders retrieved successfully.",
      count: orders.length,
      data: orders
    });
  } catch (error: any) {
    console.error("Error retrieving pickup orders:", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Failed to retrieve pickup orders.", error: error.message });
  }
}
