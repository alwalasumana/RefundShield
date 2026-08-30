import React from 'react';
import { ArrowRight, Cpu, Zap } from 'lucide-react';

export default function BeforeAfterComparison({ data }) {
  if (!data || !data.before || !data.after) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Before vs After AI Investigation</h3>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Agent Discovery Impact
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Before Box */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">INITIAL DETECTION</div>
          <div className="text-xl font-extrabold text-slate-300">Risk Score: {data.before.riskScore}/100</div>
          <div className="text-xs text-slate-400 space-y-0.5">
            <div>Initial Signals: <span className="font-mono font-bold text-slate-200">{data.before.signalCount}</span></div>
            <div>Connected Accounts: <span className="font-mono font-bold text-slate-200">{data.before.connectedAccounts}</span></div>
          </div>
        </div>

        {/* Transition Arrow */}
        <div className="flex flex-col items-center justify-center gap-1 text-blue-400 py-2">
          <Cpu className="w-6 h-6 animate-pulse" />
          <ArrowRight className="w-5 h-5 hidden md:block" />
          <span className="text-[10px] font-mono font-bold text-slate-400">Deep Graph Traversal</span>
        </div>

        {/* After Box */}
        <div className="p-4 bg-slate-950 border border-blue-500/40 rounded-xl space-y-2 ring-1 ring-blue-500/20">
          <div className="text-[10px] uppercase font-mono text-blue-400 font-bold">POST-INVESTIGATION</div>
          <div className="text-xl font-extrabold text-red-400">Escalated Risk: {data.after.riskScore}/100</div>
          <div className="text-xs text-slate-300 space-y-0.5">
            <div>Discovered Evidence: <span className="font-mono font-bold text-blue-400">{data.after.evidenceCount || data.after.signalCount}</span></div>
            <div>Connected Cluster: <span className="font-mono font-bold text-blue-400">{data.after.connectedAccounts} accounts</span></div>
            <div>Total Refund Value: <span className="font-mono font-bold text-amber-400">₹{(data.after.totalRefundValue || 0).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
