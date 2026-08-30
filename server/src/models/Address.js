import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  addressId: { type: String, required: true, unique: true, index: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, default: 'IN' },
  isCommercial: { type: Boolean, default: false },
  associatedCustomerIds: [{ type: String, index: true }]
}, { timestamps: true });

addressSchema.index({ addressId: 1 });
addressSchema.index({ associatedCustomerIds: 1 });

export default mongoose.model('Address', addressSchema);
