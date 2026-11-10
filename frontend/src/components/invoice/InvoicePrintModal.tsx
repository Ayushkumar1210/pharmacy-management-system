import React from 'react';
import { Sale } from '../../types';
import { Printer, X, CheckCircle } from 'lucide-react';

interface Props {
  sale: Sale | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<Props> = ({ sale, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2 text-teal-700 font-semibold">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            <span>Sale Completed Successfully</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div id="printable-invoice" className="p-8 text-slate-800 text-sm overflow-y-auto">
          {/* Pharmacy Letterhead */}
          <div className="text-center pb-4 border-b-2 border-dashed border-slate-300">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              PharmaCore Healthcare Pharmacy
            </h1>
            <p className="text-xs text-slate-500">Retail & Hospital Pharmacy Unit | Lic No: DL-2024-98442X</p>
            <p className="text-xs text-slate-500">GSTIN: 07AABCP1234D1Z2 | Ph: +91 11 2345 6789</p>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
            <div>
              <p><span className="text-slate-500">Invoice No:</span> <strong className="text-slate-900 font-mono">{sale.invoiceNumber}</strong></p>
              <p><span className="text-slate-500">Date:</span> {new Date(sale.createdAt).toLocaleString()}</p>
              <p><span className="text-slate-500">Billed By:</span> {sale.cashier?.name || 'Cashier'}</p>
              <p><span className="text-slate-500">Payment:</span> <strong className="uppercase">{sale.paymentMethod}</strong></p>
            </div>
            <div className="text-right">
              <p><span className="text-slate-500">Patient:</span> <strong>{sale.customerName}</strong></p>
              {sale.customerPhone && <p><span className="text-slate-500">Phone:</span> {sale.customerPhone}</p>}
              {sale.doctorName && <p><span className="text-slate-500">Doctor / Rx:</span> {sale.doctorName}</p>}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2">Item / Strength</th>
                  <th className="py-2">Batch</th>
                  <th className="py-2">Exp</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="py-2">
                    <td className="py-2 font-medium text-slate-900">
                      {item.medicine?.name || 'Medicine'}
                    </td>
                    <td className="py-2 font-mono text-slate-600">{item.batch?.batchNumber || '-'}</td>
                    <td className="py-2 text-slate-500">
                      {item.batch?.expiryDate ? new Date(item.batch.expiryDate).toISOString().slice(2, 7) : '-'}
                    </td>
                    <td className="py-2 text-right font-medium">{item.quantity}</td>
                    <td className="py-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2 text-right font-semibold">₹{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="border-t-2 border-dashed border-slate-300 pt-3 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.taxPercent > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({sale.taxPercent}%):</span>
                  <span>₹{sale.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span>-₹{sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Grand Total:</span>
                <span className="text-teal-700">₹{sale.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 text-[11px]">
                <span>Tendered / Paid:</span>
                <span>₹{sale.amountPaid.toFixed(2)}</span>
              </div>
              {sale.changeReturned > 0 && (
                <div className="flex justify-between text-slate-800 font-medium text-[11px]">
                  <span>Change Returned:</span>
                  <span>₹{sale.changeReturned.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Terms */}
          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            <p>Thank you for choosing PharmaCore. Get well soon!</p>
            <p className="mt-0.5">Medicines eligible for return only with unbroken seal within 48h and original bill.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
