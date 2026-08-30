import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'UNDER_REVIEW'], default: 'ACTIVE' },
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  isPlantedFraud: { type: Boolean, default: false },
  fraudNetworkId: { type: String, default: null }
}, { timestamps: true });

customerSchema.index({ customerId: 1 });
customerSchema.index({ riskScore: -1 });

export default mongoose.model('Customer', customerSchema);
