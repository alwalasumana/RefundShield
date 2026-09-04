import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import InvestigationCase from '../models/InvestigationCase.js';

const RISK_BUCKETS = [
  { level: 'CRITICAL', fill: '#dc2626', query: { riskScore: { $gte: 80 } } },
  { level: 'HIGH', fill: '#ea580c', query: { riskScore: { $gte: 60, $lt: 80 } } },
  { level: 'MEDIUM', fill: '#f59e0b', query: { riskScore: { $gte: 35, $lt: 60 } } },
  { level: 'LOW', fill: '#3b82f6', query: { riskScore: { $lt: 35 } } }
];

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}

function getRecentMonthWindows(monthCount = 6) {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - monthCount + 1, 1));

  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
    return {
      key: monthKey(date),
      month: monthLabel(date),
      orders: 0,
      refunds: 0,
      abuseScore: 0
    };
  });
}

async function aggregateMonthlyCount(Model, dateField, startDate) {
  return Model.aggregate([
    { $match: { [dateField]: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: `$${dateField}` },
          month: { $month: `$${dateField}` }
        },
        count: { $sum: 1 }
      }
    }
  ]);
}

async function getCaseRefundStats(cases) {
  return Promise.all(cases.map(async (caseItem) => {
    const customerIds = caseItem.customerIds?.length ? caseItem.customerIds : [caseItem.primaryCustomerId];
    const refundStats = await Refund.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: null, refundsCount: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]);

    return {
      networkId: caseItem.caseId,
      caseId: caseItem.caseId,
      title: caseItem.title,
      primaryCustomerId: caseItem.primaryCustomerId,
      accountsCount: customerIds.length,
      refundsCount: refundStats[0]?.refundsCount || 0,
      totalAmount: refundStats[0]?.totalAmount || 0,
      riskScore: caseItem.riskScore,
      riskLevel: caseItem.riskLevel,
      recommendedAction: caseItem.recommendedAction,
      status: caseItem.status
    };
  }));
}

export async function getDashboardStats(req, res) {
  try {
    const [
      totalCustomers,
      totalOrders,
      totalRefunds,
      totalCases,
      suspiciousCustomersCount,
      highRiskCasesCount,
      pendingCasesCount,
      completedInvestigationsCount,
      ...riskCounts
    ] = await Promise.all([
      Customer.countDocuments(),
      Order.countDocuments(),
      Refund.countDocuments(),
      InvestigationCase.countDocuments(),
      Customer.countDocuments({ riskScore: { $gte: 60 } }),
      InvestigationCase.countDocuments({ riskLevel: { $in: ['HIGH', 'CRITICAL'] } }),
      InvestigationCase.countDocuments({ status: { $in: ['PENDING', 'UNDER_INVESTIGATION'] } }),
      InvestigationCase.countDocuments({ status: { $in: ['CONFIRMED_ABUSE', 'RESOLVED', 'VERIFIED'] } }),
      ...RISK_BUCKETS.map((bucket) => Customer.countDocuments(bucket.query))
    ]);

    const riskDistribution = RISK_BUCKETS.map((bucket, index) => ({
      level: bucket.level,
      count: riskCounts[index],
      fill: bucket.fill
    }));

    const highRiskCases = await InvestigationCase.find({
      riskLevel: { $in: ['HIGH', 'CRITICAL'] },
      status: { $in: ['PENDING', 'UNDER_INVESTIGATION'] }
    })
      .sort({ riskScore: -1, createdAt: -1 })
      .limit(10)
      .lean();

    const topSuspiciousNetworks = await getCaseRefundStats(highRiskCases);
    const totalRefundValueUnderInvestigation = topSuspiciousNetworks.reduce((sum, item) => sum + item.totalAmount, 0);

    const refundTrends = getRecentMonthWindows();
    const startDate = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));
    const [monthlyOrders, monthlyRefunds] = await Promise.all([
      aggregateMonthlyCount(Order, 'createdAt', startDate),
      aggregateMonthlyCount(Refund, 'createdAt', startDate)
    ]);

    const trendByMonth = new Map(refundTrends.map((item) => [item.key, item]));
    monthlyOrders.forEach(({ _id, count }) => {
      const trend = trendByMonth.get(`${_id.year}-${String(_id.month).padStart(2, '0')}`);
      if (trend) trend.orders = count;
    });
    monthlyRefunds.forEach(({ _id, count }) => {
      const trend = trendByMonth.get(`${_id.year}-${String(_id.month).padStart(2, '0')}`);
      if (trend) trend.refunds = count;
    });
    refundTrends.forEach((trend) => {
      trend.abuseScore = trend.orders > 0 ? Math.round((trend.refunds / trend.orders) * 100) : 0;
      delete trend.key;
    });

    res.json({
      totalCustomers,
      totalOrders,
      totalRefunds,
      totalCases,
      suspiciousCustomersCount,
      highRiskCasesCount,
      pendingCasesCount,
      completedInvestigationsCount,
      totalRefundValueUnderInvestigation,
      riskDistribution,
      refundTrends,
      topSuspiciousNetworks,
      recentCases: topSuspiciousNetworks,
      prepaymentLatency: global.getPrepaymentLatencyStats()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
