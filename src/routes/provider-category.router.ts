import express from "express";
import * as Controller from "../controllers/provider-category.controller";

const router = express.Router();

router.get("/", Controller.getProviderCategories);
router.post("/", Controller.createProviderCategory);
router.patch("/:id", Controller.updateProviderCategory);
router.delete("/:id", Controller.deleteProviderCategory);

export default router;
