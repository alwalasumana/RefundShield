import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import Device from '../models/Device.js';
import Address from '../models/Address.js';
import InvestigationCase from '../models/InvestigationCase.js';
import { performance } from 'perf_hooks';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function simulateCheckout(req, res) {
  const totalStart = performance.now();
  try {
    const { customerId, amount, itemTitle } = req.body;

    // 1. Database Lookup Phase
    const dbStart = performance.now();
    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        status: 'ERROR',
        message: `Customer ${customerId} not found in database.`
      });
    }

    const orders = await Order.find({ customerId });
    const refunds = await Refund.find({ customerId });
    const caseItem = await InvestigationCase.findOne({ primaryCustomerId: customerId });
    
    const orderDevIds = [...new Set(orders.map(o => o.deviceId).filter(Boolean))];
    const orderAddrIds = [...new Set(orders.map(o => o.addressId).filter(Boolean))];

    const devices = await Device.find({
      $or: [{ associatedCustomerIds: customerId }, { deviceId: { $in: orderDevIds } }]
    });
    const addresses = await Address.find({
      $or: [{ associatedCustomerIds: customerId }, { addressId: { $in: orderAddrIds } }]
    });
    const dbEnd = performance.now();
    const dbLookupTime = dbEnd - dbStart;

    // 2. Risk Calculation Phase (Deterministic Fast Risk Engine)
    const calcStart = performance.now();
    let calculatedRisk = customer.riskScore || 0;

    // Audit notes / active case factors
    if (caseItem) {
      if (caseItem.status === 'CONFIRMED_ABUSE') {
        calculatedRisk = 100;
      } else if (['PENDING', 'UNDER_INVESTIGATION'].includes(caseItem.status)) {
        calculatedRisk += 15;
      }
    }

    // Previous refund behaviors
    const refundCount = refunds.length;
    const orderCount = orders.length;
    const refundRate = orderCount > 0 ? refundCount / orderCount : 0;
    
    if (refundCount >= 2) {
      calculatedRisk += refundRate >= 0.8 ? 30 : 20;
    }

    // Fast refund patterns (under 48h)
    let fastRefunds = 0;
    for (const ref of refunds) {
      const ord = orders.find(o => o.orderId === ref.orderId);
      if (ord && ord.createdAt && ref.createdAt) {
        const gap = new Date(ref.createdAt) - new Date(ord.createdAt);
        if (gap < 48 * 60 * 60 * 1000) {
          fastRefunds += 1;
        }
      }
    }
    if (fastRefunds > 0) {
      calculatedRisk += 15;
    }

    // Device sharing risks
    const sharedDevs = devices.filter(d => d.associatedCustomerIds && d.associatedCustomerIds.length > 1);
    if (sharedDevs.length > 0) {
      calculatedRisk += 20;
    }

    // Address sharing risks
    const sharedAddrs = addresses.filter(a => a.associatedCustomerIds && a.associatedCustomerIds.length > 1 && !a.isCommercial);
    if (sharedAddrs.length > 0) {
      calculatedRisk += 15;
    }

    calculatedRisk = Math.min(100, calculatedRisk);
    const calcEnd = performance.now();
    const riskCalculationTime = calcEnd - calcStart;

    // 3. Guardrail Evaluation Phase
    const evalStart = performance.now();
    const blockThreshold = global.guardrails?.checkoutBlockThreshold || 80;
    const reviewThreshold = global.guardrails?.autoRefundThreshold || 45;

    let decision = 'ALLOW';
    if (customer.status === 'SUSPENDED' || calculatedRisk >= blockThreshold) {
      decision = 'BLOCK';
    } else if (calculatedRisk >= reviewThreshold) {
      decision = 'REVIEW';
    }
    const evalEnd = performance.now();
    const guardrailEvaluationTime = evalEnd - evalStart;

    const totalEnd = performance.now();
    const totalTime = totalEnd - totalStart;

    // Save latency measurements to global stats
    const latencyRecord = {
      dbLookupTimeMs: parseFloat(dbLookupTime.toFixed(2)),
      riskCalculationTimeMs: parseFloat(riskCalculationTime.toFixed(2)),
      guardrailEvaluationTimeMs: parseFloat(guardrailEvaluationTime.toFixed(2)),
      totalTimeMs: parseFloat(totalTime.toFixed(2))
    };
    if (!global.prepaymentLatencies) {
      global.prepaymentLatencies = [];
    }
    global.prepaymentLatencies.push(latencyRecord);

    const latencyStats = global.getPrepaymentLatencyStats();

    // Block logic
    if (decision === 'BLOCK') {
      return res.json({
        success: false,
        status: 'BLOCKED',
        code: 'REFUNDSHIELD_BLOCK',
        message: `Transaction declined by RefundShield. Security Guardrail Active (Block Threshold: ${blockThreshold}%). Risk score: ${calculatedRisk}%.`,
        latency: latencyRecord,
        stats: latencyStats,
        details: {
          customerName: customer.name,
          riskScore: calculatedRisk,
          riskLevel: calculatedRisk >= 80 ? 'CRITICAL' : 'HIGH'
        }
      });
    }

    // Process order if ALLOW or REVIEW
    const orderId = `order_SIM_${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder = await Order.create({
      orderId,
      customerId,
      deviceId: orderDevIds[0] || 'dev_000999',
      addressId: orderAddrIds[0] || 'addr_sim_999',
      items: [{ productId: 'prod_sim_999', productTitle: itemTitle || 'Premium Electronics Product', quantity: 1, price: amount }],
      totalAmount: amount,
      status: 'DELIVERED',
      hasRefund: false,
      createdAt: new Date()
    });

    // POST-PAYMENT BACKGROUND MONITORING
    // Fire-and-forget: does not block the checkout response
    fetch(`${AI_SERVICE_URL}/api/ai/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId })
    }).catch(err => {
      console.error(`Post-payment risk monitoring background job failed: ${err.message}`);
    });

    res.json({
      success: true,
      status: decision === 'REVIEW' ? 'REVIEW' : 'APPROVED',
      orderId: newOrder.orderId,
      message: decision === 'REVIEW' 
        ? 'Payment processed. Under Review by RefundShield Security.' 
        : 'Payment processed successfully. Order created in MongoDB.',
      latency: latencyRecord,
      stats: latencyStats,
      details: {
        customerName: customer.name,
        riskScore: calculatedRisk,
        riskLevel: calculatedRisk >= 60 ? 'HIGH' : calculatedRisk >= 35 ? 'MEDIUM' : 'LOW'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

