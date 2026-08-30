import React from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Info } from 'lucide-react';

export default function RiskBadge({ level = 'LOW', score }) {
  const getBadgeStyle = () => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30 icon-red';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30 icon-orange';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 icon-amber';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30 icon-blue';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}>
      {level === 'CRITICAL' && <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
      {level === 'HIGH' && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
      {level === 'MEDIUM' && <Info className="w-3.5 h-3.5 text-amber-400" />}
      {level === 'LOW' && <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
      <span>{level}</span>
      {score !== undefined && <span className="opacity-75 font-mono">({score})</span>}
    </span>
  );
}
