import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Sale } from '../types';
import { Search, ReceiptText, Printer, Calendar } from 'lucide-react';
import { InvoicePrintModal } from '../components/invoice/InvoicePrintModal';

export const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales', {
        params: { search: search || undefined },
      });
      if (res.data.success) {
        setSales(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales();
  };

  const handleOpenInvoice = async (saleId: string) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.data.success) {
        setSelectedSale(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Invoices & Billing Archive</h1>
        <p className="text-xs text-slate-500">
          Search, audit and reprint historical customer dispensing invoices
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, patient name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </form>

        <span className="text-xs text-slate-400 font-medium">
          {sales.length} Total Invoices Recorded
        </span>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Patient / Customer</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Tax GST</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Loading invoices archive...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {sale.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{sale.customerName}</div>
                      {sale.customerPhone && (
                        <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{sale.cashier?.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">₹{sale.subtotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">₹{sale.taxAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-700 text-sm">
                      ₹{sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenInvoice(sale.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-700 transition inline-flex items-center space-x-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedSale && <InvoicePrintModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </div>
  );
};
