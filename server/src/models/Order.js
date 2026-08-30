import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productTitle: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true, index: true },
  addressId: { type: String, required: true, index: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'PROCESSING'], default: 'DELIVERED' },
  hasRefund: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

orderSchema.index({ orderId: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ deviceId: 1 });
orderSchema.index({ addressId: 1 });

export default mongoose.model('Order', orderSchema);
