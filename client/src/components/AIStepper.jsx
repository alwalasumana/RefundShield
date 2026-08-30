import React from 'react';
import { Search, Network, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';

export default function AIStepper({ activeStep = 0 }) {
  const defaultSteps = [
    { title: 'Checking Signals', icon: Search, desc: 'Refund, timing, and customer activity' },
    { title: 'Linking Accounts', icon: Network, desc: 'Shared devices and delivery addresses' },
    { title: 'Preparing Decision', icon: ShieldCheck, desc: 'Risk, evidence, and next action' }
  ];

  return (
    <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 my-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          Investigation running...
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {defaultSteps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                isDone
                  ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                  : isCurrent
                  ? 'bg-slate-800 border-blue-500 text-slate-100 ring-2 ring-blue-500/20'
                  : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg ${isDone ? 'bg-blue-500/20 text-blue-400' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-semibold">{step.title}</div>
                  <div className="text-[10px] opacity-75">{step.desc}</div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
