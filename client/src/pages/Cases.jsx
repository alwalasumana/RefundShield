import React, { useEffect, useState } from 'react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ActionBadge from '../components/ActionBadge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Cpu, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Cases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const navigate = useNavigate();

  // Sync search input with URL search param changes
  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    setSearch(urlQuery);
    setCurrentPage(1);
  }, [searchParams]);

  useEffect(() => {
    async function loadCases() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (riskFilter) params.set('riskLevel', riskFilter);
        if (statusFilter) params.set('status', statusFilter);
        params.set('page', currentPage.toString());
        params.set('limit', '15');
        
        const res = await api.get(`/cases?${params.toString()}`);
        setCases(res.data.cases || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      } catch (err) {
        console.warn('Cases load error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, [search, riskFilter, statusFilter, currentPage]);

  const handleSearchChange = (val) => {
    setSearch(val);
    const params = {};
    if (val.trim()) params.search = val.trim();
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Suspicious Cases Queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            Case Queue Management: Prioritize cases requiring AI investigation based on risk signals & multi-account coordination.
          </p>
        </div>
        <div className="text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl">
          {totalCount} Active Queue Items
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by case ID, title, or customer ID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => handleFilterChange(setRiskFilter, e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Risk Levels</option>
          <option value="CRITICAL">Critical Risk (80-100)</option>
          <option value="HIGH">High Risk (60-79)</option>
          <option value="MEDIUM">Medium Risk (35-59)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending Review</option>
          <option value="UNDER_INVESTIGATION">Under Investigation</option>
          <option value="VERIFIED">Verified No Abuse</option>
          <option value="CONFIRMED_ABUSE">Confirmed Abuse</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {/* Cases Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading suspicious cases queue...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No cases match the selected filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Case ID</th>
                    <th className="px-4 py-3">Title / Coordinated Group</th>
                    <th className="px-4 py-3">Connected Accounts</th>
                    <th className="px-4 py-3">Risk Assessment</th>
                    <th className="px-4 py-3">Key Trigger</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {cases.map((c) => {
                    const accountsCount = c.customerIds ? c.customerIds.length : 1;
                    const keyTrigger = c.signals && c.signals.length > 0 ? c.signals[0].type.replace(/_/g, ' ') : 'SHARED INFRASTRUCTURE';

                    return (
                      <tr key={c.caseId} className="hover:bg-slate-850/60 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-200">{c.caseId}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{c.title}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-400">{accountsCount} Accounts</td>
                        <td className="px-4 py-3"><RiskBadge level={c.riskLevel} score={c.riskScore} /></td>
                        <td className="px-4 py-3 font-mono text-[11px] text-amber-400 uppercase">{keyTrigger}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            c.status === 'UNDER_INVESTIGATION' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            c.status === 'CONFIRMED_ABUSE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            c.status === 'VERIFIED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3"><ActionBadge action={c.recommendedAction} status={c.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/investigations/${c.caseId}`)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 ml-auto shadow-sm"
                          >
                            <Cpu className="w-3.5 h-3.5" />
                            <span>Investigate Workspace</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center bg-slate-950 px-4 py-3 border-t border-slate-800 text-xs font-mono">
              <div className="text-slate-400">
                Showing page <span className="text-slate-200 font-bold">{currentPage}</span> of{' '}
                <span className="text-slate-200 font-bold">{totalPages}</span> ({totalCount} total items)
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
