import React from 'react';
import { ShoppingBag, RotateCcw, ShieldAlert, Clock } from 'lucide-react';

export default function Timeline({ events = [] }) {
  if (!events || events.length === 0) {
    return <div className="text-slate-500 text-xs italic py-4">No timeline events recorded yet.</div>;
  }

  return (
    <div className="relative border-l border-slate-800 ml-3 space-y-4 py-2">
      {events.map((evt, idx) => {
        const isRefund = evt.type === 'REFUND';
        const isOrder = evt.type === 'ORDER';

        return (
          <div key={idx} className="relative pl-6">
            <div className={`absolute -left-3 top-1 p-1 rounded-full border ${
              isRefund ? 'bg-red-950 border-red-500 text-red-400' : isOrder ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-amber-950 border-amber-500 text-amber-400'
            }`}>
              {isRefund ? <RotateCcw className="w-3 h-3" /> : isOrder ? <ShoppingBag className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-200">{evt.event}</span>
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(evt.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400">{evt.details}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
