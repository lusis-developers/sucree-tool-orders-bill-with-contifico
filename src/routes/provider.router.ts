import express from "express";
import {
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider
} from "../controllers/provider.controller";

const router = express.Router();

router.get("/", getProviders);
router.post("/", createProvider);
router.patch("/:id", updateProvider);
router.delete("/:id", deleteProvider);

export default router;
