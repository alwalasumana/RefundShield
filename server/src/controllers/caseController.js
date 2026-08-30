import mongoose from 'mongoose';
import InvestigationCase from '../models/InvestigationCase.js';
import Customer from '../models/Customer.js';
import Refund from '../models/Refund.js';
import { analyzeCustomerNetwork } from '../services/detectionEngine.js';

const FINAL_STATUSES = ['VERIFIED', 'CONFIRMED_ABUSE', 'RESOLVED'];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRecommendedAction(analysis) {
  const strongSignalCount = analysis.signals.filter((signal) =>
    ['SHARED_DEVICE', 'SHARED_ADDRESS', 'CONNECTED_SUSPICIOUS_CUSTOMERS', 'SUSPICIOUS_TIMING'].includes(signal.type)
  ).length;

  if (analysis.riskScore >= 85 && strongSignalCount >= 2) return 'BLOCK';
  if (analysis.riskScore >= 45 || analysis.signals.length > 0) return 'REVIEW';
  return 'VERIFY';
}

async function ensureDetectedCases() {
  const refundClusters = await Refund.aggregate([
    { $group: { _id: '$customerId', refundCount: { $sum: 1 } } },
    { $match: { refundCount: { $gte: 2 } } },
    { $limit: 100 }
  ]);

  const refundCustomerIds = refundClusters.map((item) => item._id);
  const customers = await Customer.find({
    $or: [
      { riskScore: { $gte: 45 } },
      { status: 'UNDER_REVIEW' },
      { customerId: { $in: refundCustomerIds } }
    ]
  }).limit(150);

  // Delete any historical low-risk cases to clean up false positives from database
  await InvestigationCase.deleteMany({ riskScore: { $lt: 45 }, status: { $nin: FINAL_STATUSES } });

  await Promise.all(customers.map(async (customer) => {
    const existing = await InvestigationCase.findOne({
      primaryCustomerId: customer.customerId,
      status: { $in: FINAL_STATUSES }
    });
    if (existing) return;

    const analysis = await analyzeCustomerNetwork(customer.customerId);
    // Ignore low-risk single-return users (Threshold >= 45)
    if (analysis.riskScore < 45) return;

    await InvestigationCase.findOneAndUpdate(
      {
        $or: [
          { caseId: `CASE-${customer.customerId}` },
          { primaryCustomerId: customer.customerId }
        ],
        status: { $nin: FINAL_STATUSES }
      },
      {
        $set: {
          caseId: `CASE-${customer.customerId}`,
          title: `Refund Investigation: ${customer.name} (${customer.customerId})`,
          primaryCustomerId: customer.customerId,
          customerIds: [customer.customerId, ...analysis.allConnectedCustomerIds],
          deviceIds: analysis.deviceIds,
          addressIds: analysis.addressIds,
          riskScore: analysis.riskScore,
          riskScoreAfter: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          signals: analysis.signals,
          evidence: analysis.signals.map((signal) => ({
            type: signal.type,
            description: signal.description,
            sourceIds: signal.sourceIds
          })),
          reasoning: [],
          recommendedAction: getRecommendedAction(analysis),
          summary: `Found ${analysis.signals.length} risk signal(s) for ${customer.name} from internal order, refund, device, and address records.`,
          confidence: analysis.signals.length > 0 ? 0.9 : 0.6,
          humanReviewRequired: analysis.riskScore >= 45,
          status: 'PENDING'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }));
}

export async function getCases(req, res) {
  try {
    const { status, riskLevel, search, limit = 50, page = 1 } = req.query;
    const query = {};

    await ensureDetectedCases();

    if (status) query.status = status;
    if (riskLevel) query.riskLevel = riskLevel.toUpperCase();
    if (search) {
      const term = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { caseId: term },
        { title: term },
        { primaryCustomerId: term },
        { customerIds: term },
        { deviceIds: term },
        { addressIds: term },
        { recommendedAction: term },
        { status: term }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const cases = await InvestigationCase.find(query)
      .sort({ riskScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InvestigationCase.countDocuments(query);

    res.json({
      cases,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSuspiciousCases(req, res) {
  try {
    const cases = await InvestigationCase.find({ riskScore: { $gte: 50 } })
      .sort({ riskScore: -1 })
      .limit(50);

    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCaseById(req, res) {
  try {
    const { id } = req.params;

    const queryOr = [
      { caseId: id },
      { primaryCustomerId: id },
      { caseId: `CASE-${id}` }
    ];

    if (mongoose.Types.ObjectId.isValid(id)) {
      queryOr.push({ _id: id });
    }

    let caseItem = await InvestigationCase.findOne({ $or: queryOr });

    // If case not found by ID, dynamically run detection for customer ID and create investigation case
    if (!caseItem) {
      const cleanCustomerId = id.startsWith('CASE-') ? id.replace('CASE-', '') : id;
      const customer = await Customer.findOne({ customerId: cleanCustomerId });
      
      if (customer) {
        const analysis = await analyzeCustomerNetwork(cleanCustomerId);
        caseItem = await InvestigationCase.create({
          caseId: `CASE-${cleanCustomerId}`,
          title: `Coordinated Refund Abuse Investigation: ${customer.name} (${cleanCustomerId})`,
          primaryCustomerId: cleanCustomerId,
          customerIds: [cleanCustomerId, ...analysis.allConnectedCustomerIds],
          deviceIds: analysis.deviceIds,
          addressIds: analysis.addressIds,
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          signals: analysis.signals,
          evidence: analysis.signals.map(s => ({
            type: s.type,
            description: s.description,
            sourceIds: s.sourceIds
          })),
          timeline: [
            { timestamp: new Date(), event: 'Automated Detection Triggered', details: `Identified ${analysis.signals.length} risk vectors for customer ${cleanCustomerId}`, type: 'ALERT' }
          ],
          reasoning: [
            `Analyzed network infrastructure for customer ${cleanCustomerId}.`,
            `Identified ${analysis.sharedDevices.length} shared device(s) and ${analysis.sharedAddresses.length} shared address(es).`,
            `Calculated risk score of ${analysis.riskScore}/100 (${analysis.riskLevel}).`
          ],
          recommendedAction: getRecommendedAction(analysis),
          summary: `Automated risk analysis completed for customer ${customer.name} (${cleanCustomerId}). Identified ${analysis.signals.length} active risk signal(s) across connected network cluster.`,
          confidence: 0.92,
          humanReviewRequired: analysis.riskScore >= 45,
          status: 'PENDING'
        });
      }
    }

    if (!caseItem) {
      return res.status(404).json({ error: `Case or Customer ${id} not found` });
    }

    res.json(caseItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function reviewCase(req, res) {
  try {
    const { id } = req.params;
    const { status, reviewerNotes } = req.body;

    const queryOr = [{ caseId: id }, { primaryCustomerId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryOr.push({ _id: id });
    }

    const caseItem = await InvestigationCase.findOne({ $or: queryOr });
    if (!caseItem) return res.status(404).json({ error: 'Case not found' });

    if (status) {
      caseItem.status = status;
      if (status === 'VERIFIED') {
        caseItem.recommendedAction = 'VERIFY';
        caseItem.humanReviewRequired = false;
      }
      if (status === 'CONFIRMED_ABUSE') {
        caseItem.recommendedAction = 'BLOCK';
        caseItem.humanReviewRequired = false;
        await Customer.updateMany(
          { customerId: { $in: caseItem.customerIds?.length ? caseItem.customerIds : [caseItem.primaryCustomerId] } },
          { $set: { status: 'SUSPENDED', riskLevel: 'CRITICAL', riskScore: Math.max(caseItem.riskScore || 0, 90) } }
        );
        await Refund.updateMany(
          { customerId: { $in: caseItem.customerIds?.length ? caseItem.customerIds : [caseItem.primaryCustomerId] } },
          { $set: { status: 'UNDER_INVESTIGATION' } }
        );
      }
      if (status === 'RESOLVED') {
        caseItem.humanReviewRequired = false;
      }
    }
    caseItem.reviewerNotes = reviewerNotes || '';
    caseItem.reviewedBy = req.user ? req.user.username : 'Investigator';
    caseItem.reviewedAt = new Date();

    await caseItem.save();
    res.json(caseItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
