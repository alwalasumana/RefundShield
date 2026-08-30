import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getCustomers(req, res) {
  try {
    const { search, riskLevel, limit = 50, page = 1 } = req.query;
    const query = {};

    if (search) {
      const term = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { customerId: term },
        { name: term },
        { email: term },
        { phone: term }
      ];
    }

    if (riskLevel) {
      query.riskLevel = riskLevel.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const customers = await Customer.find(query)
      .sort({ riskScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(query);

    res.json({
      customers,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    
    const queryOr = [{ customerId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryOr.push({ _id: id });
    }

    const customer = await Customer.findOne({ $or: queryOr });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const orders = await Order.find({ customerId: customer.customerId }).sort({ createdAt: -1 });
    const refunds = await Refund.find({ customerId: customer.customerId }).sort({ createdAt: -1 });

    res.json({
      customer,
      orders,
      refunds
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
