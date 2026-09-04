import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, RotateCcw, ShieldAlert, Cpu, ShoppingBag } from 'lucide-react';

export default function Sidebar() {
  // Ordered by logical data dependency flow:
  // 1. Dashboard (Overview)
  // 2. Refund Risk Ledger (Raw Transaction Ingestion Ledger)
  // 3. Suspicious Cases Queue (Tier 1 Flagged Network Alerts)
  // 4. AI Investigations (Tier 2 Audits & Decision Catalog)
  // 5. Customers (Reference Master Directory)
  // 6. Checkout Simulator (Sandbox Demo Overlay)
  const navItems = [
    { label: 'Dashboard',          path: '/dashboard',     icon: LayoutDashboard },
    { label: 'Risk Intelligence',  path: '/refunds',       icon: RotateCcw },
    { label: 'Suspicious Cases',   path: '/cases',         icon: ShieldAlert },
    { label: 'AI Investigations',  path: '/investigations', icon: Cpu },
    { label: 'Checkout Simulator', path: '/sandbox',       icon: ShoppingBag }
  ];

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800 p-4 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">
          Investigation Portal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
}
