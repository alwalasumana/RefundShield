import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  fingerprint: { type: String, required: true, index: true },
  deviceType: { type: String, default: 'Desktop' },
  os: { type: String, default: 'Windows' },
  browser: { type: String, default: 'Chrome' },
  ipAddress: { type: String, required: true, index: true },
  associatedCustomerIds: [{ type: String, index: true }]
}, { timestamps: true });

deviceSchema.index({ fingerprint: 1 });
deviceSchema.index({ associatedCustomerIds: 1 });

export default mongoose.model('Device', deviceSchema);
