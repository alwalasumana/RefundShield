import React, { useEffect, useState } from 'react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Refunds() {
  const [activeTab, setActiveTab] = useState('ledger');
  const navigate = useNavigate();

  // ── Ledger State ────────────────────────────────────────────────────────────
  const [refunds, setRefunds] = useState([]);
  const [refundLoading, setRefundLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Customers State ─────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [custLoading, setCustLoading] = useState(true);
  const [custSearch, setCustSearch] = useState('');
  const [custPage, setCustPage] = useState(1);
  const [custTotalPages, setCustTotalPages] = useState(1);
  const [custTotalCount, setCustTotalCount] = useState(0);

  // ── Load Refunds ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadRefunds() {
      setRefundLoading(true);
      try {
        let amountMin = '';
        let isSuspiciousCluster = '';
        if (filterType === 'HIGH_VALUE') amountMin = '25000';
        else if (filterType === 'HIGH_FREQUENCY') isSuspiciousCluster = 'true';

        const res = await api.get(
          `/refunds?search=${search}&amountMin=${amountMin}&isSuspiciousCluster=${isSuspiciousCluster}&sortBy=amount&sortOrder=${sortOrder}&page=${currentPage}&limit=50`
        );
        setRefunds(res.data.refunds || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      } catch (err) {
        console.error('Failed to load refunds:', err);
      } finally {
        setRefundLoading(false);
      }
    }
    loadRefunds();
  }, [search, filterType, sortOrder, currentPage]);

  // ── Load Customers ───────────────────────────────────────────────────────────
  useEffect(() => { setCustPage(1); }, [custSearch]);

  useEffect(() => {
    async function loadCustomers() {
      setCustLoading(true);
      try {
        const res = await api.get(`/customers?search=${custSearch}&limit=15&page=${custPage}`);
        setCustomers(res.data.customers || []);
        setCustTotalPages(res.data.pages || 1);
        setCustTotalCount(res.data.total || 0);
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setCustLoading(false);
      }
    }
    loadCustomers();
  }, [custSearch, custPage]);

  const TABS = [
    { id: 'ledger',    label: 'Refund Risk Ledger',      icon: FileText },
    { id: 'customers', label: 'Customer Directory',       icon: Users    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Risk Intelligence</h1>
          <p className="text-xs text-slate-400 mt-1">Refund ledger and customer network directory.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── LEDGER TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by refund ID, order ID, or customer ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Refund Claims</option>
              <option value="HIGH_VALUE">High-Value Claims (≥ ₹25,000)</option>
              <option value="HIGH_FREQUENCY">High-Frequency Suspicious Clusters</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {refundLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading refund claims ledger...</div>
            ) : refunds.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No refund claims match your filters.</div>
            ) : (
              <>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Refund ID</th>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer ID</th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-slate-900/50 select-none" onClick={() => { setSortOrder(s => s === 'desc' ? 'asc' : 'desc'); setCurrentPage(1); }}>
                        <div className="flex items-center gap-1.5">
                          <span>Amount</span>
                          <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === 'desc' ? 'text-blue-400' : 'text-indigo-400'}`} />
                        </div>
                      </th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {refunds.map((r) => (
                      <tr key={r.refundId} className="hover:bg-slate-850/60 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-200">{r.refundId}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{r.orderId}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{r.customerId}</td>
                        <td className="px-4 py-3 font-mono font-bold text-red-400">₹{r.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{r.reason}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => navigate(`/investigations/${r.customerId}`)} className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition">
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center bg-slate-950 px-4 py-3 border-t border-slate-800 text-xs font-mono">
                  <div className="text-slate-400">
                    Page <span className="text-slate-200 font-bold">{currentPage}</span> of <span className="text-slate-200 font-bold">{totalPages}</span> ({totalCount.toLocaleString()} total)
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-30 transition">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-30 transition">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOMERS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer ID, name, email, or phone..."
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {custLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading customers...</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Customer ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Risk Level</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {customers.map((c) => (
                    <tr key={c.customerId} className="hover:bg-slate-850/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">{c.customerId}</td>
                      <td className="px-4 py-3 font-medium">
                        {c.name}
                        {c.isPlantedFraud && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">Planted Ring</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{c.email}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{c.phone}</td>
                      <td className="px-4 py-3"><RiskBadge level={c.riskLevel} score={c.riskScore} /></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => navigate(`/cases/${c.customerId}`)} className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold">
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!custLoading && custTotalPages > 1 && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-200">{customers.length}</span> of <span className="font-semibold text-slate-200">{custTotalCount}</span> customers
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCustPage(p => Math.max(1, p - 1))} disabled={custPage === 1} className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-lg text-xs disabled:opacity-50 transition">Previous</button>
                <span className="text-xs text-slate-400">Page <span className="font-semibold text-slate-200">{custPage}</span> of <span className="font-semibold text-slate-200">{custTotalPages}</span></span>
                <button onClick={() => setCustPage(p => Math.min(custTotalPages, p + 1))} disabled={custPage === custTotalPages} className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-lg text-xs disabled:opacity-50 transition">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
