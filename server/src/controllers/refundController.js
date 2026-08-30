import mongoose from 'mongoose';
import Refund from '../models/Refund.js';

export async function getRefunds(req, res) {
  try {
    const { customerId, orderId, search, amountMin, isSuspiciousCluster, sortBy, sortOrder = 'desc', limit = 50, page = 1 } = req.query;
    const query = {};

    if (customerId) query.customerId = customerId;
    if (orderId) query.orderId = orderId;
    
    if (amountMin) {
      query.amount = { $gte: parseFloat(amountMin) };
    }

    if (isSuspiciousCluster === 'true') {
      // Planted suspicious networks in MongoDB seed start with 'cust_NET' or 'CUST-NET'
      query.$or = [
        { customerId: { $regex: /NET/i } },
        { refundId: { $regex: /NET/i } }
      ];
    }

    if (search) {
      query.$or = [
        { refundId: new RegExp(search, 'i') },
        { customerId: new RegExp(search, 'i') },
        { orderId: new RegExp(search, 'i') },
        { productId: new RegExp(search, 'i') }
      ];
    }

    // Sorting parameters
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const refunds = await Refund.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Refund.countDocuments(query);

    res.json({
      refunds,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRefundById(req, res) {
  try {
    const { id } = req.params;

    const queryOr = [{ refundId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryOr.push({ _id: id });
    }

    const refund = await Refund.findOne({ $or: queryOr });
    if (!refund) return res.status(404).json({ error: 'Refund not found' });
    res.json(refund);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
