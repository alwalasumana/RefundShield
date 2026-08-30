import Customer from '../models/Customer.js';
import Device from '../models/Device.js';
import Address from '../models/Address.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';

export async function getRelationshipGraph(req, res) {
  try {
    const { customerId } = req.params;

    const primaryCustomer = await Customer.findOne({ customerId });
    if (!primaryCustomer) {
      return res.status(404).json({ error: `Customer ${customerId} not found` });
    }

    const orders = await Order.find({ customerId }).limit(10);
    const refunds = await Refund.find({ customerId }).limit(10);

    const deviceIds = [...new Set(orders.map(o => o.deviceId))];
    const addressIds = [...new Set(orders.map(o => o.addressId))];

    const devices = await Device.find({
      $or: [{ deviceId: { $in: deviceIds } }, { associatedCustomerIds: customerId }]
    });

    const addresses = await Address.find({
      $or: [{ addressId: { $in: addressIds } }, { associatedCustomerIds: customerId }]
    });

    const connectedCustIds = new Set();
    devices.forEach(d => d.associatedCustomerIds.forEach(id => { if (id !== customerId) connectedCustIds.add(id); }));
    addresses.forEach(a => a.associatedCustomerIds.forEach(id => { if (id !== customerId) connectedCustIds.add(id); }));

    const connectedCustomers = await Customer.find({ customerId: { $in: [...connectedCustIds] } }).limit(10);

    const nodes = [];
    const edges = [];

    // Primary Customer Node
    nodes.push({
      id: primaryCustomer.customerId,
      type: 'customerNode',
      data: {
        nodeType: 'CUSTOMER',
        label: primaryCustomer.name,
        customerId: primaryCustomer.customerId,
        email: primaryCustomer.email,
        phone: primaryCustomer.phone,
        riskScore: primaryCustomer.riskScore,
        riskLevel: primaryCustomer.riskLevel,
        isPrimary: true,
        status: primaryCustomer.status
      },
      position: { x: 250, y: 150 }
    });

    // Connected Customer Nodes
    connectedCustomers.forEach((cust, idx) => {
      nodes.push({
        id: cust.customerId,
        type: 'customerNode',
        data: {
          nodeType: 'CUSTOMER',
          label: cust.name,
          customerId: cust.customerId,
          email: cust.email,
          phone: cust.phone,
          riskScore: cust.riskScore,
          riskLevel: cust.riskLevel,
          isPrimary: false,
          status: cust.status
        },
        position: { x: 50 + idx * 180, y: 350 }
      });
    });

    // Device Nodes
    devices.forEach((dev, idx) => {
      const devNodeId = `node-${dev.deviceId}`;
      nodes.push({
        id: devNodeId,
        type: 'deviceNode',
        data: {
          nodeType: 'DEVICE',
          deviceId: dev.deviceId,
          label: `${dev.deviceType} (${dev.deviceId})`,
          fingerprint: dev.fingerprint,
          ip: dev.ipAddress,
          os: dev.os,
          browser: dev.browser,
          userCount: dev.associatedCustomerIds.length,
          associatedCustomerIds: dev.associatedCustomerIds
        },
        position: { x: 450 + idx * 160, y: 50 }
      });

      edges.push({
        id: `e-${primaryCustomer.customerId}-${devNodeId}`,
        source: primaryCustomer.customerId,
        target: devNodeId,
        label: 'Shared Device',
        animated: dev.associatedCustomerIds.length > 1,
        style: { stroke: dev.associatedCustomerIds.length > 1 ? '#ef4444' : '#3b82f6' }
      });

      connectedCustomers.forEach(cust => {
        if (dev.associatedCustomerIds.includes(cust.customerId)) {
          edges.push({
            id: `e-${cust.customerId}-${devNodeId}`,
            source: cust.customerId,
            target: devNodeId,
            label: 'Uses Device',
            animated: true,
            style: { stroke: '#ef4444' }
          });
        }
      });
    });

    // Address Nodes
    addresses.forEach((addr, idx) => {
      const addrNodeId = `node-${addr.addressId}`;
      nodes.push({
        id: addrNodeId,
        type: 'addressNode',
        data: {
          nodeType: 'ADDRESS',
          addressId: addr.addressId,
          label: `${addr.street.substring(0, 20)}...`,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          isCommercial: addr.isCommercial,
          userCount: addr.associatedCustomerIds.length,
          associatedCustomerIds: addr.associatedCustomerIds
        },
        position: { x: 50 + idx * 160, y: 50 }
      });

      edges.push({
        id: `e-${primaryCustomer.customerId}-${addrNodeId}`,
        source: primaryCustomer.customerId,
        target: addrNodeId,
        label: 'Ships To',
        animated: addr.associatedCustomerIds.length > 1,
        style: { stroke: addr.associatedCustomerIds.length > 1 ? '#f59e0b' : '#3b82f6' }
      });

      connectedCustomers.forEach(cust => {
        if (addr.associatedCustomerIds.includes(cust.customerId)) {
          edges.push({
            id: `e-${cust.customerId}-${addrNodeId}`,
            source: cust.customerId,
            target: addrNodeId,
            label: 'Shared Address',
            animated: true,
            style: { stroke: '#f59e0b' }
          });
        }
      });
    });

    // Order Nodes
    orders.forEach((ord, idx) => {
      const ordNodeId = `node-${ord.orderId}`;
      nodes.push({
        id: ordNodeId,
        type: 'orderNode',
        data: {
          nodeType: 'ORDER',
          orderId: ord.orderId,
          label: ord.orderId,
          amount: ord.totalAmount,
          status: ord.status,
          hasRefund: ord.hasRefund,
          items: ord.items || [],
          createdAt: ord.createdAt
        },
        position: { x: 450 + idx * 140, y: 250 }
      });

      edges.push({
        id: `e-${primaryCustomer.customerId}-${ordNodeId}`,
        source: primaryCustomer.customerId,
        target: ordNodeId,
        label: 'Placed Order',
        style: { stroke: '#64748b' }
      });
    });

    // Refund Nodes
    refunds.forEach((ref, idx) => {
      const refNodeId = `node-${ref.refundId}`;
      nodes.push({
        id: refNodeId,
        type: 'refundNode',
        data: {
          nodeType: 'REFUND',
          refundId: ref.refundId,
          label: `${ref.refundId} (₹${ref.amount})`,
          orderId: ref.orderId,
          productId: ref.productId,
          amount: ref.amount,
          reason: ref.reason,
          status: ref.status,
          daysAfterOrder: ref.daysAfterOrder,
          createdAt: ref.createdAt
        },
        position: { x: 450 + idx * 140, y: 380 }
      });

      const relatedOrdNodeId = `node-${ref.orderId}`;
      edges.push({
        id: `e-${relatedOrdNodeId}-${refNodeId}`,
        source: relatedOrdNodeId,
        target: refNodeId,
        label: 'Refund Claimed',
        animated: true,
        style: { stroke: '#ef4444', strokeWidth: 2 }
      });
    });

    res.json({
      primaryCustomerId: primaryCustomer.customerId,
      nodes,
      edges
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
