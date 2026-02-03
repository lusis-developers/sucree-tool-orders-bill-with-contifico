import express from "express";
import * as OrderController from "../controllers/order.controller";

const router = express.Router();

// POST /api/orders
router.post("/", OrderController.createOrder);

// GET /api/orders
router.get("/", OrderController.getOrders);


// GET /api/orders/:id
router.get("/:id", OrderController.getOrderById);

// POST /api/orders/batch-invoice (Protected by Cron)
router.post("/batch-invoice", OrderController.processPendingInvoices);

// PUT /api/orders/:id/invoice
router.put("/:id/invoice", OrderController.updateInvoiceData);

// POST /api/orders/:id/collection
router.post("/:id/collection", OrderController.registerCollection);

// POST /api/orders/:id/invoice/generate
router.post("/:id/invoice/generate", OrderController.generateInvoice);

// GET /api/orders/:id/invoice-pdf
router.get("/:id/invoice-pdf", OrderController.getInvoicePdf);

// POST /api/orders/:id/settle-island
router.post("/:id/settle-island", OrderController.settleOrderInIsland);

export default router;
