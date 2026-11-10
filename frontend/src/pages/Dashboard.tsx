import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { DashboardMetrics, AlertSummary, Sale } from '../types';
import {
  IndianRupee,
  ShoppingCart,
  Pill,
  AlertTriangle,
  Clock,
  TrendingUp,
  PackageX,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { InvoicePrintModal } from '../components/invoice/InvoicePrintModal';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [metricRes, alertRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/reports/alerts'),
        ]);

        if (metricRes.data.success) setMetrics(metricRes.data.data);
        if (alertRes.data.success) setAlerts(alertRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const viewInvoice = async (saleId: string) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.data.success) {
        setSelectedSale(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time batch stock tracking, FEFO dispensing & safety compliance
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/pos"
            className="flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Terminal</span>
          </Link>
          <Link
            to="/purchases"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span>Stock-In</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Revenue</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              ₹{(metrics?.todayRevenue || 0).toFixed(2)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {metrics?.todaySalesCount || 0} completed invoices
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Valuation (Cost)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              ₹{(metrics?.totalInventoryCost || 0).toLocaleString()}
            </div>
            <div className="text-xs text-teal-600 font-medium mt-1">
              Retail MRP: ₹{(metrics?.totalRetailValue || 0).toLocaleString()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Near Expiry Batches Alert */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Near Expiry (≤60d)</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {metrics?.nearExpiryBatchesCount || 0} Batches
            </div>
            <div className="text-xs text-red-600 font-medium mt-1">
              {metrics?.expiredBatchesCount || 0} expired (sale blocked)
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <PackageX className="w-3.5 h-3.5" />
              <span>Low Stock Alerts</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {metrics?.lowStockMedicinesCount || 0} Items
            </div>
            <div className="text-xs text-slate-400 mt-1">Below configured reorder level</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Critical Safety Alerts & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Near Expiry & FEFO Priority Batches */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-800">Near-Expiry / FEFO Priority Batches</h2>
            </div>
            <Link to="/reports?tab=alerts" className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <div className="p-0 overflow-x-auto">
            {alerts && alerts.nearExpiryBatches.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5">Medicine</th>
                    <th className="px-4 py-2.5">Batch</th>
                    <th className="px-4 py-2.5">Expiry</th>
                    <th className="px-4 py-2.5 text-right">Stock</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.nearExpiryBatches.slice(0, 5).map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{batch.medicine?.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{batch.batchNumber}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(batch.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{batch.quantity}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {batch.daysRemaining} days left
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No batches currently near expiration (≤ 60 days).
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
            <div className="flex items-center space-x-2">
              <PackageX className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-800">Medicines Below Reorder Level</h2>
            </div>
            <Link to="/inventory?lowStock=true" className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center">
              Catalogue <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <div className="p-0 overflow-x-auto">
            {alerts && alerts.lowStockMedicines.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5">Medicine</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5 text-right">Available</th>
                    <th className="px-4 py-2.5 text-right">Reorder Threshold</th>
                    <th className="px-4 py-2.5 text-right">Shortfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.lowStockMedicines.slice(0, 5).map((med) => (
                    <tr key={med.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{med.name}</td>
                      <td className="px-4 py-3 text-slate-500">{med.category}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">{med.availableStock}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{med.reorderLevel}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-700">-{med.shortfall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                All medicine stock levels are currently above reorder thresholds.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Recent Dispensing Invoices</h2>
            <p className="text-xs text-slate-400">Latest completed point-of-sale customer receipts</p>
          </div>
          <Link to="/sales" className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center">
            All Invoices <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {metrics && metrics.recentSales.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{sale.customerName}</td>
                    <td className="px-4 py-3 text-slate-500">{sale.cashier?.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{sale.items.length}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">₹{sale.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => viewInvoice(sale.id)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded transition"
                      >
                        Print / View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">No invoices recorded yet.</div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedSale && <InvoicePrintModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </div>
  );
};
