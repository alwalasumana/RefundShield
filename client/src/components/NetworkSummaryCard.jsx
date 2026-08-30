import React from 'react';
import { Users, Smartphone, MapPin, RotateCcw, Calendar, IndianRupee, Network } from 'lucide-react';

export default function NetworkSummaryCard({ summary }) {
  if (!summary) return null;

  const metrics = [
    { label: 'Connected Accounts', value: summary.customerCount || 1, icon: Users, color: 'text-blue-400' },
    { label: 'Shared Devices', value: summary.deviceCount || 1, icon: Smartphone, color: 'text-cyan-400' },
    { label: 'Shared Addresses', value: summary.addressCount || 1, icon: MapPin, color: 'text-amber-400' },
    { label: 'Total Refunds Claimed', value: summary.refundCount || 0, icon: RotateCcw, color: 'text-red-400' },
    { label: 'Total Refund Value', value: `₹${(summary.totalRefundValue || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-emerald-400' },
    { label: 'Activity Window', value: `${summary.activityWindowDays || 1} Days`, icon: Calendar, color: 'text-indigo-400' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Network-Level Investigation Summary</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Coordinated Group Analysis</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                <span>{m.label}</span>
              </div>
              <div className="text-sm font-extrabold text-slate-100 font-mono">{m.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
