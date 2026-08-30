import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Refunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  
  // Sorting & Pagination States
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(2608);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadRefunds() {
      setLoading(true);
      try {
        let amountMin = '';
        let isSuspiciousCluster = '';

        if (filterType === 'HIGH_VALUE') {
          amountMin = '25000';
        } else if (filterType === 'HIGH_FREQUENCY') {
          isSuspiciousCluster = 'true';
        }

        const res = await api.get(
          `/refunds?search=${search}&amountMin=${amountMin}&isSuspiciousCluster=${isSuspiciousCluster}&sortBy=amount&sortOrder=${sortOrder}&page=${currentPage}&limit=50`
        );

        setRefunds(res.data.refunds || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      } catch (err) {
        console.error('Failed to load refunds:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRefunds();
  }, [search, filterType, sortOrder, currentPage]);

  const handleSortToggle = () => {
    const nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(nextOrder);
    setCurrentPage(1); // Reset page on sort toggle
  };

  const handleFilterChange = (val) => {
    setFilterType(val);
    setCurrentPage(1); // Reset page on filter toggle
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Refund Risk & Abuse Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring {totalCount.toLocaleString()}+ refund requests in real-time.
          </p>
        </div>
        <div className="text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl">
          {totalCount.toLocaleString()} Total Records
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by refund ID, order ID, or customer ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Refund Claims</option>
          <option value="HIGH_VALUE">High-Value Claims (≥ ₹25,000)</option>
          <option value="HIGH_FREQUENCY">High-Frequency Suspicious Clusters</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading refund claims ledger...</div>
        ) : refunds.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No refund claims match your search filters.</div>
        ) : (
          <>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3">Refund ID</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer ID</th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:bg-slate-900/50 transition select-none whitespace-nowrap"
                    onClick={handleSortToggle}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Refund Amount</span>
                      <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortOrder === 'desc' ? 'text-blue-400' : 'text-indigo-400'}`} />
                    </div>
                  </th>
                  <th className="px-4 py-3">Claim Reason</th>
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
                    <td className="px-4 py-3 font-medium text-slate-300 max-w-xs truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/investigations/${r.customerId}`)}
                        className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center bg-slate-950 px-4 py-3 border-t border-slate-800 text-xs font-mono">
              <div className="text-slate-400">
                Showing page <span className="text-slate-200 font-bold">{currentPage}</span> of{' '}
                <span className="text-slate-200 font-bold">{totalPages}</span> ({totalCount.toLocaleString()} total items)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
