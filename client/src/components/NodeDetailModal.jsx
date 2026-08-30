import React from 'react';
import { X, User, Smartphone, MapPin, ShoppingBag, RotateCcw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function NodeDetailModal({ nodeData, onClose }) {
  if (!nodeData) return null;

  const type = nodeData.nodeType || 'ENTITY';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {type === 'CUSTOMER' && <User className="w-5 h-5" />}
              {type === 'DEVICE' && <Smartphone className="w-5 h-5" />}
              {type === 'ADDRESS' && <MapPin className="w-5 h-5" />}
              {type === 'ORDER' && <ShoppingBag className="w-5 h-5" />}
              {type === 'REFUND' && <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">{type} ENTITY DETAIL</span>
              <h3 className="text-sm font-bold text-slate-100">{nodeData.label}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Details */}
        <div className="space-y-3 text-xs text-slate-300">
          {type === 'CUSTOMER' && (
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Customer ID:</span>
                <span className="font-mono font-bold text-slate-200">{nodeData.customerId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-200">{nodeData.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono text-slate-200">{nodeData.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850 items-center">
                <span className="text-slate-400">Risk Assessment:</span>
                <RiskBadge level={nodeData.riskLevel} score={nodeData.riskScore} />
              </div>
            </div>
          )}

          {type === 'DEVICE' && (
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Device ID:</span>
                <span className="font-mono font-bold text-slate-200">{nodeData.deviceId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Hardware Fingerprint:</span>
                <span className="font-mono text-blue-400">{nodeData.fingerprint}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Operating System:</span>
                <span className="text-slate-200">{nodeData.os} ({nodeData.browser})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">IP Address:</span>
                <span className="font-mono text-slate-200">{nodeData.ip}</span>
              </div>
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Hardware fingerprint shared across {nodeData.userCount} customer accounts
              </div>
            </div>
          )}

          {type === 'ADDRESS' && (
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Address ID:</span>
                <span className="font-mono font-bold text-slate-200">{nodeData.addressId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Street:</span>
                <span className="text-slate-200 font-medium">{nodeData.street}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">City / State:</span>
                <span className="text-slate-200">{nodeData.city}, {nodeData.state} ({nodeData.zip})</span>
              </div>
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-300 font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Physical delivery location associated with {nodeData.userCount} customer accounts
              </div>
            </div>
          )}

          {type === 'ORDER' && (
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Order ID:</span>
                <span className="font-mono font-bold text-slate-200">{nodeData.orderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-mono font-bold text-blue-400">₹{nodeData.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Status:</span>
                <span className="font-mono text-slate-200">{nodeData.status}</span>
              </div>
              {nodeData.items && nodeData.items.length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Purchased Item(s):</span>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-300">
                    {nodeData.items.map((i, idx) => (
                      <div key={idx}>{i.productTitle} (₹{i.price})</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'REFUND' && (
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Refund Claim ID:</span>
                <span className="font-mono font-bold text-red-400">{nodeData.refundId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Refund Amount:</span>
                <span className="font-mono font-bold text-red-400">₹{nodeData.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Claim Reason:</span>
                <span className="text-slate-200 font-medium">{nodeData.reason}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Days After Order:</span>
                <span className="font-mono text-slate-200">{nodeData.daysAfterOrder} day(s)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
