import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShieldAlert, Users, ShoppingBag, RotateCcw, ArrowRight } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ActionBadge from '../components/ActionBadge';

function ResultSection({ title, icon: Icon, count, children }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{count} found</span>
      </div>
      {children}
    </section>
  );
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ cases: [], customers: [], orders: [], refunds: [] });
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const searchTerm = searchParams.get('q') || '';
    if (!searchTerm.trim()) {
      setResults({ cases: [], customers: [], orders: [], refunds: [] });
      return;
    }

    async function runSearch() {
      setLoading(true);
      try {
        const encoded = encodeURIComponent(searchTerm.trim());
        const [casesRes, customersRes, ordersRes, refundsRes] = await Promise.all([
          api.get(`/cases?search=${encoded}&limit=10`),
          api.get(`/customers?search=${encoded}&limit=10`),
          api.get(`/orders?search=${encoded}&limit=10`),
          api.get(`/refunds?search=${encoded}&limit=10`)
        ]);

        setResults({
          cases: casesRes.data.cases || [],
          customers: customersRes.data.customers || [],
          orders: ordersRes.data.orders || [],
          refunds: refundsRes.data.refunds || []
        });
      } catch (err) {
        console.warn('Search failed:', err.message);
        setResults({ cases: [], customers: [], orders: [], refunds: [] });
      } finally {
        setLoading(false);
      }
    }

    runSearch();
  }, [searchParams]);

  const submitSearch = (e) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery) setSearchParams({ q: cleanQuery });
  };

  const totalResults = results.cases.length + results.customers.length + results.orders.length + results.refunds.length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Search</h1>
          <p className="text-xs text-slate-400 mt-1">Find cases, customers, orders, and refunds from live database records.</p>
        </div>
        <form onSubmit={submitSearch} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, order, refund, or case ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </form>
        <div className="text-xs text-slate-500">
          {loading ? 'Searching...' : query ? `${totalResults} result${totalResults === 1 ? '' : 's'} for "${searchParams.get('q') || query}"` : 'Enter a search term.'}
        </div>
      </div>

      <ResultSection title="Cases" icon={ShieldAlert} count={results.cases.length}>
        {results.cases.length ? (
          <div className="divide-y divide-slate-800">
            {results.cases.map((item) => (
              <button key={item.caseId} onClick={() => navigate(`/investigations/${item.caseId}`)} className="w-full px-5 py-4 text-left hover:bg-slate-800/50 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold text-slate-200">{item.caseId}</div>
                  <div className="text-xs text-slate-400 truncate mt-1">{item.title}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <ActionBadge action={item.recommendedAction} status={item.status} />
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-5 text-xs text-slate-500">No matching cases.</div>
        )}
      </ResultSection>

      <ResultSection title="Customers" icon={Users} count={results.customers.length}>
        {results.customers.length ? (
          <div className="divide-y divide-slate-800">
            {results.customers.map((item) => (
              <button key={item.customerId} onClick={() => navigate(`/customers?search=${encodeURIComponent(item.customerId)}`)} className="w-full px-5 py-4 text-left hover:bg-slate-800/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-xs font-bold text-slate-200">{item.customerId}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.name} · {item.email}</div>
                </div>
                <RiskBadge level={item.riskLevel} score={item.riskScore} />
              </button>
            ))}
          </div>
        ) : (
          <div className="p-5 text-xs text-slate-500">No matching customers.</div>
        )}
      </ResultSection>

      <ResultSection title="Orders" icon={ShoppingBag} count={results.orders.length}>
        {results.orders.length ? (
          <div className="divide-y divide-slate-800">
            {results.orders.map((item) => (
              <div key={item.orderId} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-xs font-bold text-slate-200">{item.orderId}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.customerId} · ₹{Number(item.totalAmount || 0).toLocaleString()}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 text-slate-300 bg-slate-800">{item.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-xs text-slate-500">No matching orders.</div>
        )}
      </ResultSection>

      <ResultSection title="Refunds" icon={RotateCcw} count={results.refunds.length}>
        {results.refunds.length ? (
          <div className="divide-y divide-slate-800">
            {results.refunds.map((item) => (
              <div key={item.refundId} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-xs font-bold text-slate-200">{item.refundId}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.customerId} · {item.orderId} · ₹{Number(item.amount || 0).toLocaleString()}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 text-slate-300 bg-slate-800">{item.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-xs text-slate-500">No matching refunds.</div>
        )}
      </ResultSection>
    </div>
  );
}
