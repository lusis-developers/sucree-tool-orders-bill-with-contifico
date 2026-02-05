
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.CONTIFICO_API_KEY;
const baseUrl = "https://api.contifico.com/sistema/api/v1";

async function listResources() {
  try {
    console.log("--- WAREHOUSES ---");
    const warehouses = await axios.get(`${baseUrl}/bodega/`, {
      headers: { Authorization: apiKey }
    });
    console.table(warehouses.data.map((w: any) => ({
      id: w.id,
      nombre: w.nombre,
      codigo: w.codigo
    })));

    console.log("\n--- CAJAS (POS) ---");
    const cajas = await axios.get(`${baseUrl}/caja/`, {
      headers: { Authorization: apiKey }
    });
    console.table(cajas.data.map((c: any) => ({
      id: c.id,
      pos: c.pos,
      nombre: c.nombre_punto_emision,
      caja: c.nombre_caja
    })));

  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
  }
}

listResources();
