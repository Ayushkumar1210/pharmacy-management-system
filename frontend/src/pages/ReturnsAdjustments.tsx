import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Medicine, Batch } from '../types';
import { RotateCcw, Plus, AlertCircle, ShieldAlert, CheckCircle2, X } from 'lucide-react';

export const ReturnsAdjustments: React.FC = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedMedId, setSelectedMedId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [type, setType] = useState<'CUSTOMER_RETURN' | 'DAMAGE_BREAKAGE' | 'EXPIRED_DISPOSAL' | 'AUDIT_ADJUSTMENT'>('CUSTOMER_RETURN');
  const [isAddition, setIsAddition] = useState(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [refundUnitPrice, setRefundUnitPrice] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [retRes, medRes] = await Promise.all([
        api.get('/returns'),
        api.get('/medicines'),
      ]);

      if (retRes.data.success) setReturns(retRes.data.data);
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

  const selectedMedicine = medicines.find((m) => m.id === selectedMedId);
  const selectedBatch = selectedMedicine?.batches?.find((b) => b.id === selectedBatchId);

  // Calculate live projection
  let delta = 0;
  if (type === 'CUSTOMER_RETURN') delta = quantity;
  else if (type === 'DAMAGE_BREAKAGE' || type === 'EXPIRED_DISPOSAL') delta = -quantity;
  else if (type === 'AUDIT_ADJUSTMENT') delta = isAddition ? quantity : -quantity;

  const currentBatchStock = selectedBatch?.quantity || 0;
  const projectedStock = currentBatchStock + delta;
  const isNegativeStockRisk = projectedStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMedId || !selectedBatchId) {
      setError('Please select both a medicine and a batch.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A detailed reason is mandatory for compliance and audit trail.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (isNegativeStockRisk) {
      setError(`Cannot execute adjustment: Stock cannot become negative (${projectedStock}).`);
      return;
    }

    try {
      const res = await api.post('/returns/adjust', {
        medicineId: selectedMedId,
        batchId: selectedBatchId,
        type,
        isAddition,
        quantity,
        reason: reason.trim(),
        refundUnitPrice: type === 'CUSTOMER_RETURN' ? refundUnitPrice : 0,
      });

      if (res.data.success) {
        setShowModal(false);
        setSelectedMedId('');
        setSelectedBatchId('');
        setReason('');
        setQuantity(1);
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process adjustment.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Returns & Stock Adjustments</h1>
          <p className="text-xs text-slate-500">
            Audit-tracked stock returns, breakage write-offs, expired disposal & cycle counts
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Adjustment / Return</span>
        </button>
      </div>

      {/* Audit Invariant Banner */}
      <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0" />
        <span>
          <strong>Audit Compliance Rule:</strong> Every return and stock write-off requires a mandatory human reason. Every change is logged immutably into the permanent ledger.
        </span>
      </div>

      {/* Returns History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Return / Audit Ref</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Medicine & Batch</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Reason (Mandatory)</th>
                <th className="px-4 py-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading returns and adjustments...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No returns or stock adjustments recorded yet.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => {
                  const item = ret.items?.[0];
                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{ret.returnNumber}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(ret.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                          {ret.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item?.medicine?.name}</div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          Batch: {item?.batch?.batchNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {item?.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={ret.reason}>
                        "{ret.reason}"
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ret.createdBy?.name}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Record Stock Return / Adjustment</h3>
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Medicine *</label>
                <select
                  required
                  value={selectedMedId}
                  onChange={(e) => {
                    setSelectedMedId(e.target.value);
                    setSelectedBatchId('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.totalAvailableStock || 0} active in stock)
                    </option>
                  ))}
                </select>
              </div>

              {selectedMedicine && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Batch to Adjust *</label>
                  <select
                    required
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 font-mono"
                  >
                    <option value="">Select Batch</option>
                    {(selectedMedicine.batches || []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} - Available: {b.quantity} units (Exp: {new Date(b.expiryDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Adjustment Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="CUSTOMER_RETURN">Customer Return (+ Stock)</option>
                    <option value="DAMAGE_BREAKAGE">Damage / Breakage (- Stock)</option>
                    <option value="EXPIRED_DISPOSAL">Expired Disposal (- Stock)</option>
                    <option value="AUDIT_ADJUSTMENT">Physical Audit Correction</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Units *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 font-bold"
                  />
                </div>
              </div>

              {type === 'AUDIT_ADJUSTMENT' && (
                <div className="flex items-center space-x-4 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="font-semibold text-slate-700">Audit Direction:</span>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="dir"
                      checked={isAddition}
                      onChange={() => setIsAddition(true)}
                    />
                    <span>Add Units Found (+)</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="dir"
                      checked={!isAddition}
                      onChange={() => setIsAddition(false)}
                    />
                    <span>Deduct Missing Units (-)</span>
                  </label>
                </div>
              )}

              {/* Live Projection Box */}
              {selectedBatch && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    isNegativeStockRisk
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-semibold">Batch Stock: </span>
                    <span>{currentBatchStock} units</span>
                    <span className="mx-2">➔</span>
                    <span className="font-bold">Projected: {projectedStock} units</span>
                  </div>
                  {isNegativeStockRisk && (
                    <span className="font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Negative stock forbidden!
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Mandatory Audit Reason * <span className="text-[10px] text-slate-400 font-normal">(Min 3 chars)</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Patient returned sealed pack within 24h with bill, or Box dropped in store room..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isNegativeStockRisk || !reason.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded font-bold"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
