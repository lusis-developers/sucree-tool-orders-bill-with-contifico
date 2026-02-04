
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.CONTIFICO_API_KEY;
const baseUrl = "https://api.contifico.com/sistema/api/v1";

async function searchProduct(term: string) {
  try {
    console.log(`Searching for "${term}" in Contífico...`);
    const response = await axios.get(`${baseUrl}/producto/`, {
      headers: { Authorization: apiKey },
      params: { q: term, result_size: 50 }
    });

    console.table(response.data.map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo
    })));

  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
  }
}

const term = process.argv[2] || "Pistacho";
searchProduct(term);
