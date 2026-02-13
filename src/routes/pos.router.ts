import express from "express";
import { getIncomingDispatches, confirmReception, getPickupOrders, deliverPickupOrder } from "../controllers/pos.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// Apply auth middleware to all POS routes
router.use(authMiddleware);

// GET /api/pos/dispatches?branch=San%20Marino
router.get("/dispatches", getIncomingDispatches);

// POST /api/pos/dispatches/:orderId/:dispatchId/confirm
router.post("/dispatches/:orderId/:dispatchId/confirm", confirmReception);

// GET /api/pos/pickups?branch=San%20Marino
router.get("/pickups", getPickupOrders);

// PUT /api/pos/pickups/:orderId/deliver
router.put("/pickups/:orderId/deliver", deliverPickupOrder);

export default router;
