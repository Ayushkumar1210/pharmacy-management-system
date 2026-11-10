import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@pharmacy.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-teal-700/30 mb-3">
            <Pill className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PharmaCore ERP</h1>
          <p className="text-sm text-slate-500 mt-1">
            Clinical Pharmacy Management System | Algions AI Assessment
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Operator Sign In</h2>
            <p className="text-xs text-slate-500">Enter authenticated credentials to access inventory & POS terminal</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Staff Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800 transition"
                placeholder="name@pharmacy.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-teal-600/20"
            >
              {loading ? 'Authenticating...' : 'Sign In to Pharmacy'}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher for Evaluator */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 mb-3">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>Quick Demo Evaluator Logins:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@pharmacy.com')}
                className="px-2.5 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-800 text-xs font-medium hover:bg-purple-100 transition text-center"
              >
                <div className="font-bold">Admin</div>
                <div className="text-[10px] text-purple-600">Full Access</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('pharmacist@pharmacy.com')}
                className="px-2.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs font-medium hover:bg-blue-100 transition text-center"
              >
                <div className="font-bold">Pharmacist</div>
                <div className="text-[10px] text-blue-600">Inventory/Rx</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('cashier@pharmacy.com')}
                className="px-2.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium hover:bg-emerald-100 transition text-center"
              >
                <div className="font-bold">Cashier</div>
                <div className="text-[10px] text-emerald-600">POS / Billing</div>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3 font-mono">
              Demo Password: Password@123
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Built for Algions AI Labs assessment | Zero negative stock invariant & FEFO enabled
        </div>
      </div>
    </div>
  );
};
