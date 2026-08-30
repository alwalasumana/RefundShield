import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

export async function simulateCheckout(req, res) {
  try {
    const { customerId, amount, itemTitle } = req.body;

    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        status: 'ERROR',
        message: `Customer ${customerId} not found in database.`
      });
    }

    // Read dynamic checkout block threshold from global guardrails config
    const blockThreshold = global.guardrails?.checkoutBlockThreshold || 80;

    // Check if the customer has been suspended/blocked OR exceeds checkout block guardrail
    if (customer.status === 'SUSPENDED' || customer.riskScore >= blockThreshold) {
      return res.json({
        success: false,
        status: 'BLOCKED',
        code: 'REFUNDSHIELD_BLOCK',
        message: `Transaction declined by RefundShield. Security Guardrail Active (Block Threshold: ${blockThreshold}%). Risk score: ${customer.riskScore}%.`,
        details: {
          customerName: customer.name,
          riskScore: customer.riskScore,
          riskLevel: customer.riskLevel
        }
      });
    }

    // Generate a successful simulated order in database if approved
    const orderId = `order_SIM_${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder = await Order.create({
      orderId,
      customerId,
      deviceId: 'dev_000999',
      addressId: 'addr_sim_999',
      items: [{ productId: 'prod_sim_999', productTitle: itemTitle || 'Premium Electronics Product', quantity: 1, price: amount }],
      totalAmount: amount,
      status: 'DELIVERED',
      hasRefund: false,
      createdAt: new Date()
    });

    res.json({
      success: true,
      status: 'APPROVED',
      orderId: newOrder.orderId,
      message: 'Payment processed successfully. Order created in MongoDB.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
