import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  scoreContribution: { type: Number, required: true },
  sourceIds: [{ type: String }]
}, { _id: false });

const evidenceSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  sourceIds: [{ type: String }]
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  event: { type: String, required: true },
  details: { type: String },
  type: { type: String, default: 'SYSTEM' }
}, { _id: false });

const scoreBreakdownSchema = new mongoose.Schema({
  factor: { type: String, required: true },
  description: { type: String },
  contribution: { type: Number, required: true }
}, { _id: false });

const executionStepSchema = new mongoose.Schema({
  node: { type: String, required: true },
  status: { type: String, required: true },
  duration_ms: { type: Number },
  output: { type: String }
}, { _id: false });

const investigationCaseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  primaryCustomerId: { type: String, required: true, index: true },
  customerIds: [{ type: String, index: true }],
  deviceIds: [{ type: String }],
  addressIds: [{ type: String }],
  riskScore: { type: Number, required: true, default: 0 },
  riskScoreBefore: { type: Number, default: 0 },
  riskScoreAfter: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  signals: [signalSchema],
  evidence: [evidenceSchema],
  timeline: [timelineSchema],
  reasoning: [{ type: String }],
  keyFindings: [{ type: String }],
  summary: { type: String },
  recommendedAction: { type: String, enum: ['VERIFY', 'REVIEW', 'BLOCK'], default: 'REVIEW' },
  confidence: { type: Number, default: 0.8 },
  humanReviewRequired: { type: Boolean, default: true },
  status: { type: String, enum: ['PENDING', 'UNDER_INVESTIGATION', 'VERIFIED', 'CONFIRMED_ABUSE', 'RESOLVED'], default: 'PENDING' },
  networkSummary: { type: mongoose.Schema.Types.Mixed },
  scoreBreakdown: [scoreBreakdownSchema],
  beforeAfterComparison: { type: mongoose.Schema.Types.Mixed },
  executionSteps: [executionStepSchema],
  aiMode: { type: String, default: 'DEMO_FALLBACK' },
  reviewerNotes: { type: String, default: '' },
  reviewedBy: { type: String },
  reviewedAt: { type: Date }
}, { timestamps: true });

investigationCaseSchema.index({ caseId: 1 });
investigationCaseSchema.index({ primaryCustomerId: 1 });
investigationCaseSchema.index({ riskLevel: 1 });
investigationCaseSchema.index({ status: 1 });

export default mongoose.model('InvestigationCase', investigationCaseSchema);
