import express from "express";
import {
  getRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial
} from "../controllers/raw-material.controller";

const router = express.Router();

router.get("/", getRawMaterials);
router.post("/", createRawMaterial);
router.patch("/:id", updateRawMaterial);
router.delete("/:id", deleteRawMaterial);

export default router;
