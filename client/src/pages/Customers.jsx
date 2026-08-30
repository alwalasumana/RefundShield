import React, { useEffect, useState } from 'react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      try {
        const res = await api.get(`/customers?search=${search}&limit=15&page=${page}`);
        setCustomers(res.data.customers || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, [search, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100">Customer Network Directory</h1>
        <p className="text-xs text-slate-400">Search 5,000+ synthetic customers and inspect risk scores.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer ID, name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
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
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                        Planted Ring
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{c.email}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{c.phone}</td>
                  <td className="px-4 py-3"><RiskBadge level={c.riskLevel} score={c.riskScore} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/cases/${c.customerId}`)}
                      className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-200">{customers.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalCount}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 font-medium rounded-lg text-xs disabled:opacity-50 transition"
            >
              Previous
            </button>
            <span className="text-xs text-slate-400">
              Page <span className="font-semibold text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-200">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 font-medium rounded-lg text-xs disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
