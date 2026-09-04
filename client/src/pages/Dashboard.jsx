import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Cpu, IndianRupee, Network, RefreshCw, ShieldAlert, TrendingUp, Loader2, Zap, ShieldCheck } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../services/api';
import ActionBadge from '../components/ActionBadge';
import RiskBadge from '../components/RiskBadge';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefund, setAutoRefund] = useState(45);
  const [checkoutBlock, setCheckoutBlock] = useState(80);
  const [updating, setUpdating] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [compilerPrompt, setCompilerPrompt] = useState('Harden security: block checkout above 75, and allow instant auto-refunds under 35.');
  const [compilerLogs, setCompilerLogs] = useState(['[RefundShield AI Compiler v2.0]', 'Status: Ready. Enter custom policy prompts in plain English.']);
  const [compiling, setCompiling] = useState(false);
  const navigate = useNavigate();

  const handleCompilePolicy = async () => {
    setCompiling(true);
    setCompilerLogs(['[RefundShield AI Compiler v2.0] Initiating prompt translation...', '[Compiler] Tokenizing intent strings...']);
    try {
      const res = await api.post('/guardrails/compile', { prompt: compilerPrompt });
      // Simulated processing delay to make it look like compiling is executing
      setTimeout(() => {
        setCompilerLogs(res.data.logs || []);
        if (res.data.guardrails) {
          setAutoRefund(res.data.guardrails.autoRefundThreshold);
          setCheckoutBlock(res.data.guardrails.checkoutBlockThreshold);
          setSaveMsg('Guardrails updated via AI compiler!');
          setTimeout(() => setSaveMsg(''), 3000);
        }
        setCompiling(false);
      }, 1000);
    } catch (err) {
      setCompilerLogs([
        '[RefundShield AI Compiler v2.0]',
        `[Error] Compilation failed: ${err.response?.data?.error || err.message}`
      ]);
      setCompiling(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.warn('Failed to fetch dashboard stats:', err.message);
      setStats(null);
      setError('Live dashboard data is unavailable. Check that the API server and database are running.');
    } finally {
      setLoading(false);
    }
  };

  const loadGuardrails = async () => {
    try {
      const res = await api.get('/guardrails');
      setAutoRefund(res.data.autoRefundThreshold);
      setCheckoutBlock(res.data.checkoutBlockThreshold);
    } catch (err) {
      console.warn('Failed to load guardrails:', err.message);
    }
  };

  const handleUpdateGuardrails = async (refundVal, blockVal) => {
    setUpdating(true);
    try {
      await api.post('/guardrails', {
        autoRefundThreshold: refundVal,
        checkoutBlockThreshold: blockVal
      });
      setSaveMsg('Guardrails updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      console.warn('Failed to save guardrails:', err.message);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchStats();
    loadGuardrails();
  }, []);

  const formatNumber = (value) => typeof value === 'number' ? value.toLocaleString() : loading ? '...' : '-';
  const networks = stats?.topSuspiciousNetworks || [];
  const riskDistribution = stats?.riskDistribution || [];
  const refundTrends = stats?.refundTrends || [];
  const hasRiskData = riskDistribution.some((item) => item.count > 0);
  const hasTrendData = refundTrends.some((item) => item.orders > 0 || item.refunds > 0);

  const statCards = [
    { label: 'Active Suspicious Networks', value: formatNumber(stats?.highRiskCasesCount), icon: Network, color: 'text-blue-400' },
    { label: 'Value Under Investigation', value: typeof stats?.totalRefundValueUnderInvestigation === 'number' ? `₹${stats.totalRefundValueUnderInvestigation.toLocaleString()}` : loading ? '...' : '-', icon: IndianRupee, color: 'text-amber-400' },
    { label: 'Completed Reviews', value: formatNumber(stats?.completedInvestigationsCount), icon: Cpu, color: 'text-cyan-400' },
    { label: 'Human Review Queue', value: formatNumber(stats?.pendingCasesCount), icon: ShieldAlert, color: 'text-red-400' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Refund Abuse Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            {stats
              ? `Monitoring ${formatNumber(stats.totalCustomers)} customers, ${formatNumber(stats.totalRefunds)} refunds, and ${formatNumber(stats.pendingCasesCount)} active reviews.`
              : 'Loading live investigation metrics from your database.'}
          </p>
          <p className="text-[11px] text-slate-500 mt-2 max-w-3xl">
            AI investigates from internal evidence: refund frequency, shared devices, shared addresses, connected accounts, repeated products, and claim timing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-xl"
            title="Refresh stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/investigations')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Cpu className="w-4 h-4" />
            <span>Investigation Catalog</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900 text-red-200 rounded-xl px-4 py-3 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
              <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">{card.label}</div>
                <div className="text-lg font-extrabold text-slate-100 font-mono mt-0.5">{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RefundShield Dynamic Guardrails Configuration */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span>RefundShield Dynamic Security Guardrails & AI Compiler</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Harden or loosen transaction controls using sliders, or type custom security rules in plain English to compile policies instantly.</p>
          </div>
          {saveMsg && (
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] rounded-lg font-bold">
              {saveMsg}
            </span>
          )}
        </div>

        {/* TOP BLOCK: AI Rule Compiler Box & Live Terminal Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 border-b border-slate-800/60">
          {/* Prompt Entry Input */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-350 uppercase tracking-wider font-mono">1. Describe Policy in Plain English</label>
            <textarea
              rows={3}
              value={compilerPrompt}
              onChange={(e) => setCompilerPrompt(e.target.value)}
              placeholder="e.g. Block checkout if risk is greater than 70, and auto-refund claims below 30."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleCompilePolicy}
              disabled={compiling || !compilerPrompt}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/15 flex items-center gap-2 transition disabled:opacity-50"
            >
              {compiling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling AI Rules...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Compile & Apply Policy</span>
                </>
              )}
            </button>
          </div>

          {/* Terminal Console Logs */}
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">AI compiler output logs</label>
            <div className="h-32 bg-slate-950 border border-slate-850 p-3 rounded-xl font-mono text-[10px] overflow-y-auto space-y-1 shadow-inner text-emerald-400">
              {compilerLogs.map((log, index) => (
                <div key={index} className={log.startsWith('[Error]') ? 'text-red-400' : log.startsWith('[Warning]') ? 'text-amber-400' : ''}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM BLOCK: Interactive Sliders & Zone Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Slider 1: Auto-Refund Threshold */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Instant Auto-Refund Threshold</span>
              <span className="font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{autoRefund}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={autoRefund}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAutoRefund(val);
                handleUpdateGuardrails(val, checkoutBlock);
              }}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Refund claims scoring <strong>below {autoRefund}%</strong> will be approved instantly by AI, saving customer support overhead.
            </p>
          </div>

          {/* Slider 2: Checkout Block Threshold */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Checkout Card Interception Threshold</span>
              <span className="font-bold font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{checkoutBlock}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={checkoutBlock}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCheckoutBlock(val);
                handleUpdateGuardrails(autoRefund, val);
              }}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Customers with risk scores <strong>at or above {checkoutBlock}%</strong> will have their cards automatically declined by the Razorpay Checkout simulator.
            </p>
          </div>
        </div>

        {/* Dynamic Zone Bar Visualizer */}
        <div className="space-y-2 pt-2">
          <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Dynamic Risk Zone Map</span>
          <div className="h-6 w-full rounded-lg overflow-hidden flex font-mono text-[9px] font-bold text-center text-white select-none">
            <div 
              style={{ width: `${autoRefund}%` }} 
              className="bg-green-600/90 flex items-center justify-center transition-all duration-200"
              title={`Risk 0 - ${autoRefund}: Instantly auto-refunded by AI`}
            >
              {autoRefund > 10 ? 'INSTANT REFUND' : ''}
            </div>
            <div 
              style={{ width: `${checkoutBlock - autoRefund}%` }} 
              className="bg-amber-650/90 flex items-center justify-center transition-all duration-200 border-l border-r border-slate-900"
              title={`Risk ${autoRefund} - ${checkoutBlock}: Sent to human queue`}
            >
              {checkoutBlock - autoRefund > 15 ? 'HUMAN REVIEW' : ''}
            </div>
            <div 
              style={{ width: `${100 - checkoutBlock}%` }} 
              className="bg-red-600/90 flex items-center justify-center transition-all duration-200"
              title={`Risk ${checkoutBlock} - 100: Payment blocked at checkout`}
            >
              {100 - checkoutBlock > 10 ? 'BLOCK CHECKOUT' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-200">Customer Risk Distribution</h2>
            <span className="text-[10px] font-mono text-slate-400">Score 0 - 100</span>
          </div>
          <div className="h-56">
            {hasRiskData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistribution}>
                  <XAxis dataKey="level" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-xs text-slate-500">
                {loading ? 'Loading risk distribution...' : 'No risk data available.'}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-200">Refund Volume Trends</h2>
            <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live database
            </span>
          </div>
          <div className="h-56">
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={refundTrends}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="refunds" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="abuseScore" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-xs text-slate-500">
                {loading ? 'Loading refund trends...' : 'No order or refund activity in the last 6 months.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Active Suspicious Networks</h2>
            <p className="text-xs text-slate-400">Open cases requiring investigator review.</p>
          </div>
          <button onClick={() => navigate('/cases')} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            View Cases <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {networks.length ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Accounts</th>
                  <th className="px-4 py-3">Refunds</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {networks.map((net) => (
                  <tr key={net.caseId} className="hover:bg-slate-850/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{net.caseId}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{net.title}</td>
                    <td className="px-4 py-3 font-mono text-blue-400 font-bold">{net.accountsCount}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{net.refundsCount}</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">₹{Number(net.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><RiskBadge level={net.riskLevel} score={net.riskScore} /></td>
                    <td className="px-4 py-3"><ActionBadge action={net.recommendedAction} status={net.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/investigations/${net.caseId}`)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/20"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              {loading ? 'Loading active networks...' : 'No active suspicious networks found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
