import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  ReceiptText,
  Truck,
  RotateCcw,
  ClipboardList,
  BarChart3,
  Users,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { hasRole } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'PHARMACIST', 'CASHIER'] },
    { to: '/pos', label: 'POS Billing', icon: ShoppingCart, roles: ['ADMIN', 'PHARMACIST', 'CASHIER'], highlight: true },
    { to: '/inventory', label: 'Medicine & Batches', icon: Pill, roles: ['ADMIN', 'PHARMACIST', 'CASHIER'] },
    { to: '/sales', label: 'Sales Invoices', icon: ReceiptText, roles: ['ADMIN', 'PHARMACIST', 'CASHIER'] },
    { to: '/purchases', label: 'Purchases (Stock-In)', icon: Truck, roles: ['ADMIN', 'PHARMACIST'] },
    { to: '/adjustments', label: 'Returns & Adjustments', icon: RotateCcw, roles: ['ADMIN', 'PHARMACIST'] },
    { to: '/audit', label: 'Stock Movement Ledger', icon: ClipboardList, roles: ['ADMIN', 'PHARMACIST'] },
    { to: '/reports', label: 'Reports & Audit', icon: BarChart3, roles: ['ADMIN', 'PHARMACIST'] },
    { to: '/suppliers', label: 'Suppliers Directory', icon: Users, roles: ['ADMIN', 'PHARMACIST'] },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-teal-900/40">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              PharmaCore <span className="text-[10px] bg-teal-900 text-teal-300 px-1.5 py-0.2 rounded font-semibold uppercase">ERP</span>
            </div>
            <div className="text-[11px] text-slate-400">Algions AI Labs Assessment</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations & Inventory
        </div>

        {navItems.map((item) => {
          const isAllowed = hasRole(...(item.roles as any));
          if (!isAllowed) return null;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : item.highlight
                    ? 'bg-slate-800/80 text-teal-300 hover:bg-slate-800'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.highlight && (
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded font-bold">
                  FAST
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Safety Notice Footer */}
      <div className="p-4 mx-3 mb-4 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center space-x-1.5 text-teal-400 font-semibold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>FEFO & Safety Invariant</span>
        </div>
        <p className="leading-relaxed">
          Zero negative stock rule enforced by SQLite transactions. Expired batches cannot be dispensed.
        </p>
      </div>
    </aside>
  );
};
