import express from "express";
import { getIncomingDispatches, confirmReception } from "../controllers/pos.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getPickupOrders } from "../controllers/pos.controller";

const router = express.Router();

// Apply auth middleware to all POS routes
router.use(authMiddleware);

// GET /api/pos/dispatches?branch=San%20Marino
router.get("/dispatches", getIncomingDispatches);

// POST /api/pos/dispatches/:orderId/:dispatchId/confirm
// POST /api/pos/dispatches/:orderId/:dispatchId/confirm
router.post("/dispatches/:orderId/:dispatchId/confirm", confirmReception);

// GET /api/pos/pickups?branch=San%20Marino
router.get("/pickups", getPickupOrders);

export default router;
