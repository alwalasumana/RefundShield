import React from 'react';
import { ShieldAlert, Database, Tag } from 'lucide-react';

export default function EvidenceList({ evidence = [] }) {
  if (!evidence || evidence.length === 0) {
    return <div className="text-slate-500 text-xs italic py-4">No evidence recorded.</div>;
  }

  return (
    <div className="space-y-3">
      {evidence.map((item, idx) => (
        <div key={idx} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-red-300">{item.type}</span>
              {item.sourceIds && item.sourceIds.length > 0 && (
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded">
                  <Database className="w-3 h-3 text-slate-500" />
                  {item.sourceIds.join(', ')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
