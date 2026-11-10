import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { StockMovement } from '../types';
import { ClipboardList, Filter, ArrowUpRight, ArrowDownLeft, ShieldCheck, Search } from 'lucide-react';

export const AuditTrail: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementType, setMovementType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit', {
        params: { movementType: movementType !== 'ALL' ? movementType : undefined },
      });
      if (res.data.success) {
        setMovements(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [movementType]);

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">PURCHASE (STOCK-IN)</span>;
      case 'SALE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">SALE DISPENSING</span>;
      case 'CUSTOMER_RETURN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">CUSTOMER RETURN</span>;
      case 'DAMAGE_BREAKAGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">DAMAGE / BREAKAGE</span>;
      case 'EXPIRED_DISPOSAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">EXPIRED DISPOSAL</span>;
      case 'AUDIT_ADJUSTMENT_ADD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">AUDIT ADDITION</span>;
      case 'AUDIT_ADJUSTMENT_SUB':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">AUDIT DEDUCTION</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movement Audit Ledger</h1>
          <p className="text-xs text-slate-500">
            Immutable, chronological audit log of every stock alteration in the pharmacy
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Movement Filter */}
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 shadow-sm"
          >
            <option value="ALL">All Movement Types</option>
            <option value="PURCHASE">Purchases (Stock-In)</option>
            <option value="SALE">Sales (Dispensed)</option>
            <option value="CUSTOMER_RETURN">Customer Returns</option>
            <option value="DAMAGE_BREAKAGE">Damage / Breakage</option>
            <option value="EXPIRED_DISPOSAL">Expired Disposals</option>
            <option value="AUDIT_ADJUSTMENT_ADD">Audit Additions</option>
            <option value="AUDIT_ADJUSTMENT_SUB">Audit Deductions</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Movement Type</th>
                <th className="px-4 py-3">Medicine Name & SKU</th>
                <th className="px-4 py-3">Batch Number</th>
                <th className="px-4 py-3 text-right">Quantity Delta</th>
                <th className="px-4 py-3 text-right">Balance After</th>
                <th className="px-4 py-3">Audit Reason</th>
                <th className="px-4 py-3">Staff Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading audit trail ledger...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No movements recorded for this filter.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getMovementBadge(m.movementType)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{m.medicine?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.medicine?.sku}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {m.batch?.batchNumber}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={`font-bold inline-flex items-center space-x-0.5 ${
                          m.quantityDelta > 0 ? 'text-teal-600' : 'text-rose-600'
                        }`}
                      >
                        <span>{m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {m.balanceAfter}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={m.reason || ''}>
                      {m.reason || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{m.performedBy?.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{m.performedBy?.role}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
