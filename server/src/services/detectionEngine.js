import Customer from '../models/Customer.js';
import Device from '../models/Device.js';
import Address from '../models/Address.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';

export async function analyzeCustomerNetwork(primaryCustomerId) {
  const customer = await Customer.findOne({ customerId: primaryCustomerId });
  if (!customer) {
    throw new Error(`Customer ${primaryCustomerId} not found`);
  }

  const customerOrders = await Order.find({ customerId: primaryCustomerId });
  const customerRefunds = await Refund.find({ customerId: primaryCustomerId });
  
  const orderCount = customerOrders.length;
  const refundCount = customerRefunds.length;
  const refundRate = orderCount > 0 ? (refundCount / orderCount) : 0;

  const orderDevIds = [...new Set(customerOrders.map(o => o.deviceId))];
  const orderAddrIds = [...new Set(customerOrders.map(o => o.addressId))];

  const sharedDevices = await Device.find({
    $or: [
      { deviceId: { $in: orderDevIds } },
      { associatedCustomerIds: primaryCustomerId }
    ]
  });

  const sharedAddresses = await Address.find({
    $or: [
      { addressId: { $in: orderAddrIds } },
      { associatedCustomerIds: primaryCustomerId }
    ]
  });

  const connectedCustomersFromDevices = new Set();
  sharedDevices.forEach(dev => {
    dev.associatedCustomerIds.forEach(id => {
      if (id !== primaryCustomerId) connectedCustomersFromDevices.add(id);
    });
  });

  const connectedCustomersFromAddresses = new Set();
  sharedAddresses.forEach(addr => {
    addr.associatedCustomerIds.forEach(id => {
      if (id !== primaryCustomerId) connectedCustomersFromAddresses.add(id);
    });
  });

  const allConnectedCustomerIds = [...new Set([
    ...connectedCustomersFromDevices,
    ...connectedCustomersFromAddresses
  ])];

  const allClusterIds = [primaryCustomerId, ...allConnectedCustomerIds];
  const clusterRefundCount = await Refund.countDocuments({ customerId: { $in: allClusterIds } });

  const signals = [];
  let totalRiskScore = 0;

  // Signal 1: High Refund Frequency
  if ((orderCount >= 2 && refundRate >= 0.5) || refundCount >= 3) {
    const score = refundRate >= 0.8 ? 30 : 20;
    totalRiskScore += score;
    signals.push({
      type: 'HIGH_REFUND_FREQUENCY',
      description: `High refund rate of ${(refundRate * 100).toFixed(1)}% (${refundCount} refunds out of ${orderCount} orders)`,
      scoreContribution: score,
      sourceIds: [primaryCustomerId]
    });
  }

  // Signal 2: Shared Device Signal (Scored higher if cluster has refunds)
  const suspiciousDevices = sharedDevices.filter(d => d.associatedCustomerIds.length > 1);
  if (suspiciousDevices.length > 0 && clusterRefundCount >= 2) {
    const multiUsersCount = Math.max(...suspiciousDevices.map(d => d.associatedCustomerIds.length));
    const score = Math.min(30, 20 + (multiUsersCount - 2) * 5);
    totalRiskScore += score;
    signals.push({
      type: 'SHARED_DEVICE',
      description: `Primary customer shares device(s) [${suspiciousDevices.map(d => d.deviceId).join(', ')}] across ${multiUsersCount} distinct user accounts with active refund claims`,
      scoreContribution: score,
      sourceIds: suspiciousDevices.map(d => d.deviceId)
    });
  }

  // Signal 3: Shared Address Signal (Scored higher if cluster has refunds)
  const suspiciousAddresses = sharedAddresses.filter(a => a.associatedCustomerIds.length > 1 && !a.isCommercial);
  if (suspiciousAddresses.length > 0 && clusterRefundCount >= 2) {
    const multiUsersCount = Math.max(...suspiciousAddresses.map(a => a.associatedCustomerIds.length));
    const score = Math.min(25, 15 + (multiUsersCount - 2) * 4);
    totalRiskScore += score;
    signals.push({
      type: 'SHARED_ADDRESS',
      description: `Primary customer shares shipping address [${suspiciousAddresses.map(a => a.addressId).join(', ')}] across ${multiUsersCount} accounts with active refund claims`,
      scoreContribution: score,
      sourceIds: suspiciousAddresses.map(a => a.addressId)
    });
  }

  // Signal 4: Connected Suspicious Customer Cluster
  if (allConnectedCustomerIds.length > 0 && clusterRefundCount >= 3) {
    const score = 25;
    totalRiskScore += score;
    signals.push({
      type: 'CONNECTED_SUSPICIOUS_CUSTOMERS',
      description: `Linked to ${allConnectedCustomerIds.length} connected customers who have claimed ${clusterRefundCount} cumulative refunds`,
      scoreContribution: score,
      sourceIds: allConnectedCustomerIds
    });
  }

  // Signal 5: Suspicious Refund Velocity
  const rapidRefunds = customerRefunds.filter(r => r.daysAfterOrder <= 1);
  if (rapidRefunds.length >= 2) {
    const score = 15;
    totalRiskScore += score;
    signals.push({
      type: 'SUSPICIOUS_TIMING',
      description: `${rapidRefunds.length} refunds were requested within <24 hours of placing the order`,
      scoreContribution: score,
      sourceIds: rapidRefunds.map(r => r.refundId)
    });
  }

  const finalRiskScore = Math.min(100, totalRiskScore);
  
  let riskLevel = 'LOW';
  if (finalRiskScore >= 80) riskLevel = 'CRITICAL';
  else if (finalRiskScore >= 60) riskLevel = 'HIGH';
  else if (finalRiskScore >= 35) riskLevel = 'MEDIUM';

  return {
    primaryCustomerId,
    customer,
    allConnectedCustomerIds,
    deviceIds: orderDevIds,
    addressIds: orderAddrIds,
    sharedDevices,
    sharedAddresses,
    orderCount,
    refundCount,
    refundRate,
    riskScore: finalRiskScore,
    riskLevel,
    signals
  };
}
