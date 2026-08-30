import React from 'react';
import { ShieldAlert, Plus } from 'lucide-react';

export default function RiskScoreBreakdown({ breakdown = [], totalScore = 0 }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Risk Score Explainability Breakdown</h3>
        </div>
        <div className="text-xs font-mono font-bold text-slate-100">
          Calculated Score: <span className="text-red-400">{totalScore}</span> / 100
        </div>
      </div>

      <div className="space-y-2">
        {breakdown.length === 0 ? (
          <div className="text-xs text-slate-400 font-mono">No score breakdown data available.</div>
        ) : (
          breakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 border border-slate-850 text-xs">
              <div>
                <div className="font-semibold text-slate-200">{item.factor}</div>
                <div className="text-[10px] text-slate-400">{item.description}</div>
              </div>
              <div className="font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Plus className="w-3 h-3 text-red-400" />
                {item.contribution}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
