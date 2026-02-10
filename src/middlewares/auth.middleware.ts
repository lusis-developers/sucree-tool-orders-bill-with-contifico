import { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";
import { HttpStatusCode } from "axios";
import { AuthRequest, JwtPayload } from "../types/AuthRequest";
import { JWT_SECRET } from "../utils/jwt.handle";

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(HttpStatusCode.Unauthorized)
      .send({
        message: "Acceso denegado. Se requiere token de autenticación.",
      });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedPayload = jwt.verify(
      token,
      JWT_SECRET,
    ) as JwtPayload;
    req.user = decodedPayload;
    next();
  } catch (error) {
    console.error("¡ERROR EN EL MIDDLEWARE!", error);
    res
      .status(HttpStatusCode.Unauthorized)
      .send({ message: "Token inválido o expirado." });
    return;
  }
}
