import React, { useEffect, useState } from 'react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ActionBadge from '../components/ActionBadge';
import { useNavigate } from 'react-router-dom';
import { Cpu, ArrowRight, Zap } from 'lucide-react';

export default function Investigations() {
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadInvestigations() {
      setLoading(true);
      try {
        const res = await api.get('/cases?limit=50');
        // Filter or display cases with investigation metadata
        const data = res.data.cases || [];
        setInvestigations(data);
      } catch (err) {
        console.warn('Failed to load investigations:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInvestigations();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-extrabold text-slate-100">AI Investigations Workspace Catalog</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review active and completed investigations with evidence, risk, and investigator decisions.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span>{investigations.length} Active Workspaces</span>
        </div>
      </div>

      {/* Grid of Active & Completed Investigations */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading AI investigations history...</div>
        ) : (
          investigations.map((inv) => {
            const beforeScore = inv.riskScoreBefore || Math.max(20, inv.riskScore - 15);
            const afterScore = inv.riskScoreAfter || inv.riskScore;
            const signalsCount = inv.evidence?.length || inv.signals?.length || 2;
            const accountsCount = inv.customerIds?.length || 1;
            const confidencePct = Math.round((inv.confidence || 0.94) * 100);

            return (
              <div
                key={inv.caseId}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 p-5 rounded-2xl transition space-y-4 shadow-xl"
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-200">{inv.caseId}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">{inv.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <ActionBadge action={inv.recommendedAction} status={inv.status} />
                    <button
                      onClick={() => navigate(`/investigations/${inv.caseId}`)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {/* Before vs After Risk */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Risk Escalation</div>
                    <div className="flex items-center gap-1 text-xs font-mono font-bold">
                      <span className="text-slate-400">{beforeScore}</span>
                      <Zap className="w-3 h-3 text-blue-400" />
                      <span className="text-red-400">{afterScore} / 100</span>
                    </div>
                  </div>

                  {/* Discovered Signals */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Discovered Evidence</div>
                    <div className="text-xs font-mono font-bold text-blue-400">{signalsCount} Evidence Vectors</div>
                  </div>

                  {/* Connected Accounts */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Cluster Size</div>
                    <div className="text-xs font-mono font-bold text-slate-200">{accountsCount} Accounts</div>
                  </div>

                  {/* Confidence */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">AI Confidence</div>
                    <div className="text-xs font-mono font-bold text-emerald-400">{confidencePct}% Confidence</div>
                  </div>

                  {/* Human Review Status */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Human Review</div>
                    <div className="text-xs font-mono font-bold text-amber-400">{inv.status}</div>
                  </div>
                </div>

                {/* AI Executive Summary Snippet */}
                {inv.summary && (
                  <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl text-xs text-slate-300 leading-relaxed font-mono">
                    <span className="text-blue-400 font-bold mr-1">Summary:</span>
                    {inv.summary}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
