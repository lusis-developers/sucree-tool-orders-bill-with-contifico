import type { Request, Response, NextFunction } from "express";
import { WarehouseMovementModel } from "../models/warehouse-movement.model";
import { RawMaterialModel } from "../models/raw-material.model";
import { Types } from "mongoose";

interface IAuthRequest extends Request {
  user?: any;
}

// --- Create Movement ---
async function createMovement(req: IAuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, rawMaterial, quantity, provider, entity, observation } = req.body;
    // Fallback to body user if req.user is missing (e.g. if auth middleware is bypassed or fails)
    const userId = req.user?.id || req.body.user;

    if (!userId) {
      return res.status(401).send({ message: "User authentication required." });
    }

    // 1. Validate Input
    if (!type || !rawMaterial || !quantity) {
      return res.status(400).send({ message: "Type, Raw Material, and Quantity are required." });
    }

    if (quantity <= 0) {
      return res.status(400).send({ message: "Quantity must be greater than 0." });
    }

    // 2. Check Raw Material existence
    const material = await RawMaterialModel.findById(rawMaterial);
    if (!material) {
      return res.status(404).send({ message: "Raw Material not found." });
    }

    // 3. Handle Logic based on Type
    if (type === "OUT") {
      if (!entity) {
        return res.status(400).send({ message: "Entity is required for OUT movements." });
      }
      if (material.quantity < quantity) {
        return res.status(400).send({
          message: `Insufficient stock. Available: ${material.quantity} ${material.unit}`,
        });
      }
      // Decrement stock
      material.quantity -= quantity;
    } else if (type === "IN") {
      // Increment stock
      material.quantity += quantity;
    } else {
      return res.status(400).send({ message: "Invalid movement type." });
    }

    // 4. Save Movement and Update Material
    const movement = new WarehouseMovementModel({
      type,
      rawMaterial,
      quantity,
      provider: type === "IN" ? provider : undefined,
      entity: type === "OUT" ? entity : undefined,
      user: userId,
      observation,
      date: req.body.date ? new Date(req.body.date) : new Date(),
    });

    await Promise.all([movement.save(), material.save()]);

    return res.status(201).send({
      message: "Movement created successfully.",
      movement,
      currentStock: material.quantity,
    });
  } catch (error) {
    console.error("Error creating warehouse movement:", error);
    next(error);
  }
}

// --- Get Movements (History) ---
async function getMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.materialId) query.rawMaterial = req.query.materialId;

    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) {
        // Parse as Ecuador start of day
        query.date.$gte = new Date(`${req.query.startDate}T00:00:00-05:00`);
      }
      if (req.query.endDate) {
        // Parse as Ecuador end of day
        query.date.$lte = new Date(`${req.query.endDate}T23:59:59-05:00`);
      }
    }

    const [movements, total] = await Promise.all([
      WarehouseMovementModel.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate("rawMaterial", "name unit cost quantity")
        .populate("provider", "name")
        .populate("user", "name"),
      WarehouseMovementModel.countDocuments(query),
    ]);

    return res.status(200).send({
      movements,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching warehouse movements:", error);
    next(error);
  }
}

export { createMovement, getMovements };
