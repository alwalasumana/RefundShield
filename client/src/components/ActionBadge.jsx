import React from 'react';
import { CheckCircle2, AlertOctagon, UserCheck, ShieldAlert } from 'lucide-react';

export default function ActionBadge({ action = 'REVIEW', status = 'PENDING' }) {
  const normalizedAction = (action || 'REVIEW').toUpperCase();
  const normalizedStatus = (status || 'PENDING').toUpperCase();

  const getStyle = () => {
    if (normalizedStatus === 'VERIFIED') {
      return 'bg-green-950 text-green-300 border-green-800/80';
    }
    if (normalizedStatus === 'CONFIRMED_ABUSE') {
      return 'bg-red-950 text-red-300 border-red-800/80';
    }
    if (normalizedStatus === 'RESOLVED') {
      return 'bg-slate-800 text-slate-200 border-slate-700';
    }

    switch (normalizedAction) {
      case 'BLOCK':
        return 'bg-red-950 text-red-300 border-red-800/80';
      case 'REVIEW':
        return 'bg-amber-950 text-amber-300 border-amber-800/80';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-800/80';
    }
  };

  const getLabel = () => {
    if (normalizedStatus === 'VERIFIED') return 'VERIFIED: NO ABUSE';
    if (normalizedStatus === 'CONFIRMED_ABUSE') return 'CONFIRMED ABUSE: BLOCKED';
    if (normalizedStatus === 'RESOLVED') return 'CASE RESOLVED';
    if (normalizedAction === 'BLOCK') return 'RECOMMENDATION: ESCALATE';
    return `RECOMMENDATION: ${normalizedAction}`;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${getStyle()}`}>
      {normalizedStatus === 'VERIFIED' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
      {normalizedStatus === 'CONFIRMED_ABUSE' && <AlertOctagon className="w-4 h-4 text-red-400" />}
      {normalizedStatus === 'RESOLVED' && <ShieldAlert className="w-4 h-4 text-slate-400" />}
      
      {normalizedStatus === 'PENDING' && (
        <>
          {normalizedAction === 'BLOCK' && <AlertOctagon className="w-4 h-4 text-red-400" />}
          {normalizedAction === 'REVIEW' && <UserCheck className="w-4 h-4 text-amber-400" />}
          {normalizedAction === 'VERIFY' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
        </>
      )}
      
      {normalizedStatus === 'UNDER_INVESTIGATION' && (
        <>
          {normalizedAction === 'BLOCK' && <AlertOctagon className="w-4 h-4 text-red-400" />}
          {normalizedAction === 'REVIEW' && <UserCheck className="w-4 h-4 text-amber-400" />}
          {normalizedAction === 'VERIFY' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
        </>
      )}
      <span>{getLabel()}</span>
    </div>
  );
}
