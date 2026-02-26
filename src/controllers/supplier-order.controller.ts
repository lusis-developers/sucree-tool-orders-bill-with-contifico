import type { Request, Response, NextFunction } from "express";
import { SupplierOrderModel } from "../models/supplier-order.model";

// --- Create Order ---
async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider, items, deliveryDate, user, whatsappMessage, totalEstimatedValue } = req.body;

    if (!provider || !items || !items.length || !deliveryDate || !user) {
      return res.status(400).send({ message: "Provider, items, delivery date, and user are required." });
    }

    const order = new SupplierOrderModel({
      provider,
      items,
      deliveryDate: new Date(deliveryDate),
      user,
      whatsappMessage,
      totalEstimatedValue,
      status: "PENDING",
    });

    await order.save();

    return res.status(201).send({
      message: "Supplier order created successfully.",
      order,
    });
  } catch (error) {
    console.error("Error creating supplier order:", error);
    next(error);
  }
}

// --- Get All Orders ---
async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.provider) query.provider = req.query.provider;
    if (req.query.status) query.status = req.query.status;

    // Date filtering for deliveryDate
    if (req.query.startDate || req.query.endDate) {
      query.deliveryDate = {};
      if (req.query.startDate) {
        query.deliveryDate.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query.deliveryDate.$lte = new Date(req.query.endDate as string);
      }
    }

    const [orders, total] = await Promise.all([
      SupplierOrderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("provider", "name")
        .populate("user", "name"),
      SupplierOrderModel.countDocuments(query),
    ]);

    return res.status(200).send({
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching supplier orders:", error);
    next(error);
  }
}

// --- Get Order By ID ---
async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const order = await SupplierOrderModel.findById(id)
      .populate("provider", "name")
      .populate("user", "name")
      .populate("items.material", "name unit");

    if (!order) {
      return res.status(404).send({ message: "Supplier order not found." });
    }

    return res.status(200).send({ order });
  } catch (error) {
    console.error("Error fetching supplier order by ID:", error);
    next(error);
  }
}

// --- Update Order ---
async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const order = await SupplierOrderModel.findByIdAndUpdate(id, updates, { new: true });

    if (!order) {
      return res.status(404).send({ message: "Supplier order not found." });
    }

    return res.status(200).send({
      message: "Supplier order updated successfully.",
      order,
    });
  } catch (error) {
    console.error("Error updating supplier order:", error);
    next(error);
  }
}

// --- Delete Order ---
async function deleteOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const order = await SupplierOrderModel.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).send({ message: "Supplier order not found." });
    }

    return res.status(200).send({
      message: "Supplier order deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting supplier order:", error);
    next(error);
  }
}

export { createOrder, getOrders, getOrderById, updateOrder, deleteOrder };
