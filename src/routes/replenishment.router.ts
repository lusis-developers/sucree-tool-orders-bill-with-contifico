import { Router } from "express";
import * as replenishmentController from "../controllers/replenishment.controller";

const router = Router();

router.get("/calculate", replenishmentController.calculateReplenishment);
router.post("/seed", replenishmentController.seedParLevels);

export default router;
