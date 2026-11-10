import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Shield, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout, login } = useAuth();
  const [alertCount, setAlertCount] = useState({ low: 0, expired: 0, near: 0 });

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/reports/alerts');
        if (res.data.success) {
          setAlertCount({
            low: res.data.data.summary.lowStockCount,
            expired: res.data.data.summary.expiredCount,
            near: res.data.data.summary.nearExpiryCount,
          });
        }
      } catch (e) {
        // quiet catch
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const switchRole = async (email: string) => {
    try {
      await login(email, 'Password@123');
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const roleBadgeColor = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    PHARMACIST: 'bg-blue-100 text-blue-800 border-blue-200',
    CASHIER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }[user?.role || 'CASHIER'];

  const totalAlerts = alertCount.low + alertCount.expired + alertCount.near;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
        </span>
        <span className="text-xs font-medium text-slate-500">Pharmacy DB Active (SQLite ACID)</span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Quick Demo Role Switcher for Reviewer / Professor */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100 p-1 rounded-md text-xs border border-slate-200">
          <span className="text-slate-500 font-medium px-2">Demo Role:</span>
          <button
            onClick={() => switchRole('admin@pharmacy.com')}
            className={`px-2 py-1 rounded font-medium transition ${
              user?.role === 'ADMIN' ? 'bg-white shadow text-purple-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => switchRole('pharmacist@pharmacy.com')}
            className={`px-2 py-1 rounded font-medium transition ${
              user?.role === 'PHARMACIST' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pharmacist
          </button>
          <button
            onClick={() => switchRole('cashier@pharmacy.com')}
            className={`px-2 py-1 rounded font-medium transition ${
              user?.role === 'CASHIER' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cashier
          </button>
        </div>

        {/* Alerts Pill */}
        <Link
          to="/reports?tab=alerts"
          className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>
            {totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''}
          </span>
          {alertCount.expired > 0 && (
            <span className="bg-red-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
              {alertCount.expired} Exp
            </span>
          )}
        </Link>

        {/* User Badge */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</div>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${roleBadgeColor}`}>
              {user?.role}
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
