import Product from '../models/Product.js';

export async function getProducts(req, res) {
  try {
    // Return seeded products from the catalog database
    const products = await Product.find({}).limit(100).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
