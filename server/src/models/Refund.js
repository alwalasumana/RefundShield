import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
  refundId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['APPROVED', 'REJECTED', 'UNDER_INVESTIGATION'], default: 'APPROVED' },
  refundMethod: { type: String, default: 'ORIGINAL_PAYMENT' },
  daysAfterOrder: { type: Number, default: 2 },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

refundSchema.index({ refundId: 1 });
refundSchema.index({ customerId: 1 });
refundSchema.index({ orderId: 1 });
refundSchema.index({ productId: 1 });

export default mongoose.model('Refund', refundSchema);
