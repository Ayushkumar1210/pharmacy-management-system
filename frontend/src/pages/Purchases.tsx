import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Supplier, Medicine } from '../types';
import { Truck, Plus, PackageCheck, Calendar, X, AlertCircle } from 'lucide-react';

interface PurchaseOrderRow {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  mfgDate: string;
  expiryDate: string;
}

export const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseOrderRow[]>([
    {
      medicineId: '',
      batchNumber: '',
      quantity: 100,
      unitCost: 0,
      sellingPrice: 0,
      mfgDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purRes, supRes, medRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/medicines'),
      ]);

      if (purRes.data.success) setPurchases(purRes.data.data);
      if (supRes.data.success) setSuppliers(supRes.data.data);
      if (medRes.data.success) setMedicines(medRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        medicineId: '',
        batchNumber: '',
        quantity: 100,
        unitCost: 0,
        sellingPrice: 0,
        mfgDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Supplier invoice number is required');
      return;
    }
    for (const item of items) {
      if (!item.medicineId || !item.batchNumber.trim() || item.quantity <= 0) {
        setError('Please complete all medicine item details correctly');
        return;
      }
    }

    try {
      const res = await api.post('/purchases', {
        supplierId,
        invoiceNumber,
        notes,
        items,
      });

      if (res.data.success) {
        setShowModal(false);
        setSupplierId('');
        setInvoiceNumber('');
        setNotes('');
        setItems([
          {
            medicineId: '',
            batchNumber: '',
            quantity: 100,
            unitCost: 0,
            sellingPrice: 0,
            mfgDate: new Date().toISOString().slice(0, 10),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          },
        ]);
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record purchase order.');
    }
  };

  const totalEstimatedCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Supplier Purchases & Stock-In</h1>
          <p className="text-xs text-slate-500">
            Ingest manufacturer purchase orders, create batches and register purchase movements
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Supplier Stock-In</span>
        </button>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Supplier Invoice #</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Date Received</th>
                <th className="px-4 py-3">Processed By</th>
                <th className="px-4 py-3 text-right">Items Ingested</th>
                <th className="px-4 py-3 text-right">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No supplier purchases recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.invoiceNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.supplier?.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(p.receivedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.createdBy?.name}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-medium">
                      {p.items?.length || 0} batches
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                      ₹{p.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock-In Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Record Stock-In Purchase Order</h3>
                <p className="text-[11px] text-slate-500">Generates batches and logs auditable stock additions</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mx-6 mt-4 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Supplier *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Supplier Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUP-INV-2024-889"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">Medicine Line Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-teal-600 hover:text-teal-700 font-semibold text-xs flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Medicine *</label>
                          <select
                            required
                            value={item.medicineId}
                            onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                          >
                            <option value="">Select Medicine</option>
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.dosageForm})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Batch Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="BATCH-XX"
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono uppercase"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Cost Price (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={item.unitCost || ''}
                            onChange={(e) => handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Retail MRP (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={item.sellingPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Expiry Date *</label>
                          <input
                            type="date"
                            required
                            value={item.expiryDate}
                            onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                          />
                        </div>

                        <div className="col-span-3 flex items-end justify-between pt-4">
                          <span className="font-semibold text-slate-700">₹{(item.quantity * item.unitCost).toFixed(2)}</span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="block font-semibold text-slate-700 uppercase mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional delivery details, truck number, physical inspection notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs">
                  <span className="text-slate-500">Calculated Ingestion Value: </span>
                  <strong className="text-slate-900 text-sm">₹{totalEstimatedCost.toFixed(2)}</strong>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold"
                  >
                    Commit Stock-In & Batches
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
