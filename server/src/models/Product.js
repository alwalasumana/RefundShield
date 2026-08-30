import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  sku: { type: String, required: true, unique: true },
  isHighRisk: { type: Boolean, default: false }
}, { timestamps: true });

productSchema.index({ productId: 1 });
productSchema.index({ category: 1 });

export default mongoose.model('Product', productSchema);
