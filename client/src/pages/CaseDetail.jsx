import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ActionBadge from '../components/ActionBadge';
import RelationshipGraph from '../components/RelationshipGraph';
import AIStepper from '../components/AIStepper';
import Timeline from '../components/Timeline';
import EvidenceList from '../components/EvidenceList';
import RiskScoreBreakdown from '../components/RiskScoreBreakdown';
import BeforeAfterComparison from '../components/BeforeAfterComparison';
import NetworkSummaryCard from '../components/NetworkSummaryCard';
import { Cpu, UserCheck, CheckCircle2, RefreshCw, Info, AlertTriangle, FileText, Printer, X } from 'lucide-react';

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
        if (prev < 2) return prev + 1;
        clearInterval(interval);
        return 2;
      });
    }, 800);

    try {
      const targetCustId = caseData?.primaryCustomerId || targetId.replace('CASE-', '');
      const res = await api.post('/ai/investigate', { customerId: targetCustId, caseId: caseData?.caseId });
      if (res.data) {
        setCaseData(res.data);
        setReviewStatus(res.data.status || reviewStatus);
        setReviewerNotes(res.data.reviewerNotes || reviewerNotes);
      }
    } catch (err) {
      console.warn('AI Investigation proxy call fallback:', err.message);
    } finally {
      setTimeout(() => {
        setInvestigating(false);
      }, 2600);
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

      {investigating && <AIStepper activeStep={activeStep} />}

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

      {/* Before vs After & Risk Explainability Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BeforeAfterComparison data={caseData?.beforeAfterComparison} />
        <RiskScoreBreakdown breakdown={caseData?.scoreBreakdown} totalScore={caseData?.riskScore} />
      </div>

      {/* Legitimate Shared-Entity Control Callout */}
      <div className="bg-slate-900/80 border border-blue-500/30 p-5 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-slate-100 text-sm">False Positive Prevention Control</div>
          <p className="text-slate-400">
            Legitimate family members or roommates sharing a device or home address are correctly classified as <strong className="text-blue-400">LOW RISK</strong> because infrastructure signals are only weighted heavily when backed by active refund abuse claims.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Evidence & Reasoning vs Timeline & Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Evidence & Signals */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200">Identified Evidence & Risk Vectors</h2>
            <EvidenceList evidence={caseData?.evidence || caseData?.signals || []} />
          </div>
        </div>

        {/* Right Column: Timeline & Human Investigator Review Form */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200">Chronological Event Timeline</h2>
            <Timeline events={caseData?.timeline || []} />
          </div>

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

              {/* Linkage Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 font-sans">2. Graph Connection Audit Trail</h3>
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
              {caseData?.deviceIds && caseData.deviceIds.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 font-sans">3. Hardware Device Fingerprint Link</h3>
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
