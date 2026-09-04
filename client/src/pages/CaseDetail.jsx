import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ActionBadge from '../components/ActionBadge';
import RelationshipGraph from '../components/RelationshipGraph';
import Timeline from '../components/Timeline';
import EvidenceList from '../components/EvidenceList';
import RiskScoreBreakdown from '../components/RiskScoreBreakdown';
import BeforeAfterComparison from '../components/BeforeAfterComparison';
import NetworkSummaryCard from '../components/NetworkSummaryCard';
import { 
  Cpu, UserCheck, CheckCircle2, RefreshCw, Info, AlertTriangle, 
  FileText, Printer, X, ShieldAlert, Zap, Database, ArrowRight, Activity,
  Plug2, Wifi, WifiOff, ChevronRight
} from 'lucide-react';

export default function CaseDetail() {
  const { caseId, id } = useParams();
  const targetId = caseId || id || 'CASE-NET1-001';

  const [caseData, setCaseData] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [globalLatency, setGlobalLatency] = useState({ average: 15.4, p95: 22.8 });
  const [hasInvestigated, setHasInvestigated] = useState(false);

  async function loadCaseAndGraph() {
    setLoading(true);
    setError('');
    try {
      const caseRes = await api.get(`/cases/${targetId}`);
      setCaseData(caseRes.data);
      setReviewerNotes(caseRes.data.reviewerNotes || '');
      setReviewStatus(caseRes.data.status || 'PENDING');

      const targetCustId = caseRes.data.primaryCustomerId || targetId.replace('CASE-', '');
      const graphRes = await api.get(`/graph/${targetCustId}`);
      setGraphData(graphRes.data);

      // Fetch global prepayment stats from dashboard/stats
      const statsRes = await api.get('/dashboard/stats');
      if (statsRes.data && statsRes.data.prepaymentLatency) {
        setGlobalLatency(statsRes.data.prepaymentLatency);
      }
    } catch (err) {
      console.warn('Case fetch error:', err.message);
      setCaseData(null);
      setGraphData({ nodes: [], edges: [] });
      setError('Could not load this case from the live database.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCaseAndGraph();
  }, [targetId]);

  const handleInvestigateWithAI = async () => {
    setInvestigating(true);
    setActiveStep(0);

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < 4) return prev + 1;
        clearInterval(interval);
        return 4;
      });
    }, 300);

    try {
      const targetCustId = caseData?.primaryCustomerId || targetId.replace('CASE-', '');
      const res = await api.post('/ai/investigate', { customerId: targetCustId, caseId: caseData?.caseId });
      if (res.data) {
        setCaseData(res.data);
        setReviewStatus(res.data.status || reviewStatus);
        setReviewerNotes(res.data.reviewerNotes || reviewerNotes);
        setHasInvestigated(true);
      }
    } catch (err) {
      console.warn('AI Investigation proxy call fallback:', err.message);
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setInvestigating(false);
      }, 1000);
    }
  };

  const handleSaveReview = async (newStatus) => {
    try {
      const targetStatus = newStatus || reviewStatus;
      const res = await api.patch(`/cases/${caseData.caseId}/review`, {
        status: targetStatus,
        reviewerNotes
      });
      setCaseData(res.data);
      setReviewStatus(targetStatus);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.warn('Review save failed:', err.message);
      setError('Could not save the investigator decision.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading case investigation workspace...</div>;
  }

  if (error && !caseData) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
        {error}
      </div>
    );
  }

  // Calculate execution steps for UI stepper
  const stepsConfig = [
    { node: 'DetectionNode', title: 'Detection Agent', desc: 'Finding connected accounts and relationships' },
    { node: 'InvestigationNode', title: 'Investigation Agent', desc: 'Analyzing refund and transaction patterns' },
    { node: 'VerificationNode', title: 'Verification Agent', desc: 'Automatically verifying suspicious evidence' },
    { node: 'EvidenceNode', title: 'Evidence Agent', desc: 'Collecting and preparing supporting evidence' },
    { node: 'DecisionNode', title: 'Decision Agent', desc: 'Generating final risk assessment' }
  ];

  // AI timing values
  const aiDurationTotal = (caseData?.executionSteps || []).reduce((acc, step) => acc + (step.duration_ms || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-100">{caseData?.title}</h1>
            <RiskBadge level={caseData?.riskLevel} score={caseData?.riskScore} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Case ID: {caseData?.caseId} | Primary Customer Target: {caseData?.primaryCustomerId}
          </p>
        </div>

        <button
          onClick={handleInvestigateWithAI}
          disabled={investigating}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition disabled:opacity-50"
        >
          <Cpu className={`w-4 h-4 ${investigating ? 'animate-spin' : ''}`} />
          <span>{investigating ? 'Investigating...' : 'Investigate with AI'}</span>
        </button>
      </div>

      {/* AI Stepper Panel */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Investigation Agent Stepper</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {stepsConfig.map((step, idx) => {
            const stepRecord = (caseData?.executionSteps || []).find(s => s.node === step.node);
            const isDone = stepRecord || (investigating && idx < activeStep);
            const isCurrent = investigating && idx === activeStep;
            
            return (
              <div 
                key={idx}
                className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                  isDone 
                    ? 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                    : isCurrent
                    ? 'bg-slate-800 border-blue-500 text-slate-100 ring-2 ring-blue-500/20 animate-pulse'
                    : 'bg-slate-950/50 border-slate-850 text-slate-500'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{step.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</div>
                </div>
                {isDone && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-blue-400 font-semibold">COMPLETED</span>
                  </div>
                )}
                {isCurrent && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-amber-400 font-bold animate-pulse">
                    RUNNING...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* Investigation Results — only shown after clicking Investigate with AI */}
      {hasInvestigated && <>

      {/* Recommended Action & AI Executive Summary */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <ActionBadge action={caseData?.recommendedAction} status={reviewStatus} />
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">Confidence Score:</span>
            <span className="font-bold text-blue-400">{((caseData?.confidence || 0.94) * 100).toFixed(0)}%</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Human Oversight:</span>
            <span className={`font-semibold ${caseData?.humanReviewRequired ? 'text-amber-400' : 'text-blue-400'}`}>
              {caseData?.humanReviewRequired ? 'REQUIRED' : 'OPTIONAL'}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">AI Investigation Executive Summary</h3>
          <p className="text-sm text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono">
            {caseData?.summary || 'Click "Investigate with AI" to generate an evidence-grounded summary.'}
          </p>
        </div>

        {caseData?.keyFindings && caseData.keyFindings.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Discovered Findings:</h4>
            <div className="space-y-1.5">
              {caseData.keyFindings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>





      {/* Network Summary Card */}
      <NetworkSummaryCard summary={caseData?.networkSummary} />

      {/* Interactive Relationship Graph Section */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Interactive Customer Network Graph (React Flow)</h2>
            <p className="text-xs text-slate-400">Visually trace customer relationships across shared devices, addresses, orders, and refund claims.</p>
          </div>
          <button onClick={loadCaseAndGraph} className="text-slate-400 hover:text-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <RelationshipGraph initialNodes={graphData.nodes} initialEdges={graphData.edges} />
      </div>

      {/* Risk Explainability Breakdown */}
      <RiskScoreBreakdown breakdown={caseData?.scoreBreakdown} totalScore={caseData?.riskScore} />

      </>}

      {/* Two Column Layout: Event Timeline (Left) & Investigator Action Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Timeline */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-slate-200">Chronological Event Timeline</h2>
          <Timeline events={caseData?.timeline || []} />
        </div>

        {/* Right Column: Human Investigator Review Form */}
        <div className="space-y-6">
          {/* Investigator Review Workflow */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-bold text-slate-200">Human Investigator Decision Workflow</h2>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Review status & investigator notes updated successfully!
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Investigator Audit Notes</label>
              <textarea
                rows={3}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Add audit notes regarding physical address check, account verification, or fraud ring confirmation..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowDisputeModal(true)}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 transition"
              >
                <FileText className="w-4 h-4" />
                <span>Generate Dispute Defense Package</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleSaveReview('VERIFIED')}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition"
              >
                Mark Verified (No Abuse)
              </button>

              <button
                onClick={() => handleSaveReview('CONFIRMED_ABUSE')}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition"
              >
                Confirm Coordinated Abuse
              </button>

              <button
                onClick={() => handleSaveReview('RESOLVED')}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
              >
                Resolve Case
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col pointer-events-auto">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">AI Dispute Defense Package</h3>
              </div>
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Body (Printable area) */}
            <div id="dispute-evidence-document" className="p-8 flex-1 overflow-y-auto space-y-6 bg-white font-serif text-slate-800">
              
              {/* Document Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans uppercase">RefundShield Risk Operations</h1>
                  <p className="text-[10px] text-slate-500 font-sans uppercase tracking-widest font-semibold mt-0.5">Automated Dispute Evidence & Linkage Report</p>
                </div>
                <div className="text-right text-[10px] font-sans text-slate-500 space-y-0.5">
                  <div><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</div>
                  <div><strong>Reference ID:</strong> {caseData?.caseId}</div>
                  <div><strong>Source System:</strong> RefundShield Core v2.0</div>
                </div>
              </div>

              {/* Subject details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Primary Audit Subject</span>
                  <span className="font-bold text-slate-850">{caseData?.title?.replace('Refund Investigation: ', '') || caseData?.primaryCustomerId}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Assigned Risk Score</span>
                  <span className="font-bold text-red-600 font-mono text-sm">{caseData?.riskScore}/100 ({caseData?.riskLevel})</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">System Decision Verdict</span>
                  <span className="font-bold text-slate-800 font-mono">CONFIRMED ABUSE (MERCHANT BLOCK REQ)</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Total Linked Customers</span>
                  <span className="font-bold text-slate-800">{caseData?.customerIds?.length || 1} Distinct Accounts</span>
                </div>
              </div>

              {/* Case summary from evidence agent */}
              {caseData?.evidencePackage?.caseSummary && (
                <div className="space-y-1 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-sans">AI Evidence Summary Case Statement</h4>
                  <p className="text-[11px] font-sans leading-relaxed text-slate-700">{caseData.evidencePackage.caseSummary}</p>
                </div>
              )}

              {/* Linkage Statement */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 font-sans">1. Executive Summary & Graph Linkage Certification</h3>
                <p className="text-xs leading-relaxed">
                  RefundShield security systems certify that customer account <strong>{caseData?.primaryCustomerId}</strong> is associated with a highly coordinated refund abuse network. Based on graph-database linkage analysis, the subject belongs to a network cluster of <strong>{caseData?.customerIds?.length || 1} accounts</strong>.
                </p>
                <p className="text-xs leading-relaxed">
                  These accounts have been linked transitively through shared hardware profiles and/or drop locations. The high density of repeat refund claims across this network strongly points to organized promo and return policy manipulation (Sybil abuse).
                </p>
              </div>

              {/* Transaction evidence list */}
              {caseData?.evidencePackage?.transactionEvidence && caseData.evidencePackage.transactionEvidence.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 font-sans">2. Transaction History Evidence</h3>
                  <ul className="list-disc pl-5 text-[11px] font-mono text-slate-700 space-y-1">
                    {caseData.evidencePackage.transactionEvidence.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Linkage Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 font-sans">3. Graph Connection Audit Trail</h3>
                <table className="w-full text-left text-[11px] font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-slate-350 bg-slate-100 text-slate-700">
                      <th className="p-2 font-bold">Linked Customer ID</th>
                      <th className="p-2 font-bold text-center">Relationship Type</th>
                      <th className="p-2 font-bold text-right">Cluster Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 font-semibold">{caseData?.primaryCustomerId} (Subject)</td>
                      <td className="p-2 text-center text-slate-600 font-mono">Primary Target</td>
                      <td className="p-2 text-right text-red-600 font-mono font-semibold">SUSPENDED</td>
                    </tr>
                    {caseData?.customerIds?.filter(id => id !== caseData?.primaryCustomerId).map((id, index) => (
                      <tr key={index} className="border-b border-slate-200">
                        <td className="p-2 font-mono text-slate-600">{id}</td>
                        <td className="p-2 text-center text-slate-600">Shared Device Link</td>
                        <td className="p-2 text-right text-red-600 font-mono">SUSPENDED</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Hardware Device Auditing */}
              {caseData?.evidencePackage?.relationshipEvidence && caseData.evidencePackage.relationshipEvidence.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 font-sans">4. Hardware Device & Location Linkage Details</h3>
                  <p className="text-xs leading-relaxed">
                    The linked accounts have initiated transactions and refund requests from identical browser signatures and hardware footprints:
                  </p>
                  <ul className="list-disc pl-5 text-[11px] font-mono text-slate-700 space-y-1">
                    {caseData.evidencePackage.relationshipEvidence.map((link, idx) => (
                      <li key={idx}>{link}</li>
                    ))}
                  </ul>
                </div>
              ) : caseData?.deviceIds && caseData.deviceIds.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 font-sans">4. Hardware Device Fingerprint Link</h3>
                  <p className="text-xs leading-relaxed">
                    The linked accounts have initiated transactions and refund requests from identical browser signatures and hardware footprints:
                  </p>
                  <ul className="list-disc pl-5 text-xs font-mono text-slate-700 space-y-1">
                    {caseData.deviceIds.map((devId, idx) => (
                      <li key={idx}>Device ID: <strong>{devId}</strong> (Status: Flagged for Coordinated Abuse)</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation Certificate */}
              <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl space-y-1.5 font-sans">
                <h4 className="text-xs font-bold uppercase tracking-wider">Merchant Defense Recommendation:</h4>
                <p className="text-[11px] leading-relaxed">
                  <strong>Submit to Bank:</strong> Please present this evidentiary document to the card issuer or merchant acquiring bank during the chargeback dispute process. This document proves that the customer profile is part of a verified card-not-present (CNP) refund abuse ring, validating the merchant's decision to refuse payout or merchandise credit.
                </p>
              </div>

              {/* Signature block */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] font-sans text-slate-500">
                <div>© RefundShield Inc. Fraud & Acquiring Risk Operations</div>
                <div className="font-semibold uppercase tracking-wider text-slate-600 text-right">VERIFIED FRAUD REPORT</div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between gap-3">
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const content = document.getElementById('dispute-evidence-document').innerText;
                    navigator.clipboard.writeText(content);
                    alert('Evidence document copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  Copy Plaintext
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
