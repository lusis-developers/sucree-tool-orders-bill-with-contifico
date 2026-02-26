import express from "express";
import { seedSupplyChain } from "../controllers/seed.controller";

const SeedRouter = express.Router();

SeedRouter.post("/supply-chain", seedSupplyChain);

export default SeedRouter;
