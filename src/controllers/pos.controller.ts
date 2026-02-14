import type { Request, Response } from "express";
import { HttpStatusCode } from "axios";
import { POSService } from "../services/pos.service";
import { getECDateRange, getEcuadorNow } from "../utils/date.utils";

const posService = new POSService();

/**
 * GET /api/pos/dispatches
 * Query Params: branch (required) - e.g. "San Marino"
 */
export async function getIncomingDispatches(req: Request, res: Response) {
  try {
    const { branch, search, filterMode, date } = req.query;

    const filters: any = { search: search as string };

    // --- Date Calculation Logic ---
    let { startDate, endDate } = getECDateRange(getEcuadorNow().toISOString().split('T')[0], false);

    if (date) {
      const range = getECDateRange(String(date), false);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filterMode === 'tomorrow') {
      const tomorrow = getEcuadorNow();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const range = getECDateRange(tomorrow.toISOString().split('T')[0], false);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filterMode === 'all') {
      startDate = new Date(0);
      endDate = new Date(2100, 0, 1);
    }

    filters.startDate = startDate.toISOString();
    filters.endDate = endDate.toISOString();

    const dispatches = await posService.getIncomingDispatches(branch as string, filters);

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
    const { orderId, dispatchId } = req.params;
    const { receivedBy, receptionNotes, items } = req.body;

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
    const { branch, search, filterMode, date, receivedOnly } = req.query;

    const filters: any = { search: search as string };

    let { startDate, endDate } = getECDateRange(getEcuadorNow().toISOString().split('T')[0], false);

    if (date) {
      const range = getECDateRange(String(date), false);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filterMode === 'tomorrow') {
      const tomorrow = getEcuadorNow();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const range = getECDateRange(tomorrow.toISOString().split('T')[0], false);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filterMode === 'all') {
      startDate = new Date(0);
      endDate = new Date(2100, 0, 1);
    }

    filters.startDate = startDate.toISOString();
    filters.endDate = endDate.toISOString();

    let orders = await posService.getPickupOrders(branch as string, filters);

    // Apply "Received" filter if requested
    if (receivedOnly === "true") {
      orders = orders.filter((o: any) => o.posStatus === "RECEIVED");
    }

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

/**
 * PUT /api/pos/pickups/:orderId/deliver
 */
export async function deliverPickupOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;

    const result = await posService.markAsDelivered(orderId);

    res.status(HttpStatusCode.Ok).send({
      message: "Order marked as delivered successfully.",
      data: result
    });
  } catch (error: any) {
    console.error("Error delivering pickup order:", error);
    res.status(HttpStatusCode.InternalServerError).send({ message: "Failed to mark order as delivered.", error: error.message });
  }
}
