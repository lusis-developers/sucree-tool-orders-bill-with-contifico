import type { Request, Response, NextFunction } from "express";
import { ContificoService } from "../services/contifico.service";
import { HttpStatusCode } from "axios";

const contificoService = new ContificoService();

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, filtro, codigo_barra, categoria_id, page, limit } = req.query;

    const searchOptions = {
      filtro: (filtro as string) || (query as string),
      codigo_barra: codigo_barra as string,
      categoria_id: categoria_id as string,
      result_page: page ? Number(page) : undefined,
      result_size: limit ? Number(limit) : 20 // Default to 20
    };

    const products = await contificoService.getProducts(searchOptions);

    res.status(200).send(products);
    return;
  } catch (error) {
    console.error("❌ Error in getProducts:", error);
    res.status(500).send({
      message: "Internal server error occurred while fetching products.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}


export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await contificoService.getCategories();
    res.status(HttpStatusCode.Ok).send(categories);
    return;
  } catch (error) {
    console.error("❌ Error in getCategories:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error occurred while fetching categories.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
} 