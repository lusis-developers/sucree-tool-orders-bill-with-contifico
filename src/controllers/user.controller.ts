import type { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { AuthRequest } from "../types/AuthRequest";

const userService = new UserService();

export async function createUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).send(user);
    return;
  } catch (error) {
    next(error);
  }
}

export async function getAllUsers(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUser = req.user;
    let users = await userService.findAll();

    // Data isolation for Sales Manager
    if (currentUser?.role === "SALES_MANAGER") {
      users = users.filter((u) => u.role === "SALES_REP");
    } else if (currentUser?.role !== "admin") {
      // If not admin or sales manager, they shouldn't be listing users anyway
      // but if the route is open, we filter to empty or self
      if (currentUser) {
        users = users.filter((u) => u.email === currentUser.email);
      } else {
        users = [];
      }
    }

    res.status(200).send(users);
    return;
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const response = await userService.loginUser(req.body);
    res.status(200).send(response);
    return;
  } catch (error) {
    if (error instanceof Error && (error.message === "USER_NOT_FOUND" || error.message === "PASSWORD_INCORRECT")) {
      res.status(401).send({ message: error.message });
      return;
    }
    next(error);
  }
}

export async function updateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const user = await userService.updateUser(id, req.body);
    res.status(200).send(user);
    return;
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    await userService.deleteUser(id);
    res.status(200).send({ message: "USER_DELETED" });
    return;
  } catch (error) {
    next(error);
  }
}
