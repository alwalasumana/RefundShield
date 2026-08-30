import Order from '../models/Order.js';
import mongoose from 'mongoose';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getOrders(req, res) {
  try {
    const { customerId, status, search, limit = 50, page = 1 } = req.query;
    const query = {};

    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (search) {
      const term = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { orderId: term },
        { customerId: term },
        { deviceId: term },
        { addressId: term },
        { 'items.productId': term },
        { 'items.productTitle': term }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const queryOr = [{ orderId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryOr.push({ _id: id });
    }
    const order = await Order.findOne({ $or: queryOr });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
