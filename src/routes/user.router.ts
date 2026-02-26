import express from "express";
import { createUser, getAllUsers, login, updateUser, deleteUser } from "../controllers/user.controller";

const router = express.Router();

router.post("/login", login);
router.post("/", createUser);
router.get("/", getAllUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
