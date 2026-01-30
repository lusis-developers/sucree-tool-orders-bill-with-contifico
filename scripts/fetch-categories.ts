
import 'dotenv/config';
import { ContificoService } from '../src/services/contifico.service';
import fs from 'fs';

const main = async () => {
  const contificoService = new ContificoService();
  try {
    console.log('🚀 Starting Product & Category Analysis...');

    // Fetch Categories
    const categories = await contificoService.getCategories();
    console.log(`✅ Fetched ${categories.length} categories.`);

    // Create Map: ID -> Name
    const categoryMap = new Map();
    categories.forEach((c: any) => categoryMap.set(c.id, c.nombre));

    // Fetch Products (might need pagination or larger limit)
    // Assuming getProducts handles pagination or we just get first batch to see samples
    // passing result_size to get more
    const products = await contificoService.getProducts({ result_size: 1000 });
    console.log(`✅ Fetched ${products.length} products.`);

    // Analyze
    const usedCategories = new Set<string>();
    const productSamples: any[] = [];

    products.forEach((p: any) => {
      const catName = categoryMap.get(p.categoria_id) || 'UNKNOWN';
      usedCategories.add(catName);
      if (productSamples.length < 20) {
        productSamples.push({ name: p.nombre, category: catName });
      }
    });

    console.log('\n--- USED CATEGORIES ---');
    console.log(Array.from(usedCategories).sort());

    console.log('\n--- PRODUCT SAMPLES ---');
    console.log(productSamples);

  } catch (error) {
    console.error('❌ Failed to analyze:', error);
  }
};

main();
