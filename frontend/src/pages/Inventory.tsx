import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Medicine, Category, Batch } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Pill,
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle,
  X,
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { hasRole } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState<Medicine | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Medicine Form State
  const [newMed, setNewMed] = useState({
    name: '',
    genericName: '',
    sku: '',
    categoryId: '',
    dosageForm: 'Tablet',
    strength: '',
    manufacturer: '',
    reorderLevel: 20,
    description: '',
  });

  // New Batch Form State
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    quantity: 100,
    purchasePrice: 0,
    sellingPrice: 0,
    mfgDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medRes, catRes] = await Promise.all([
        api.get('/medicines', {
          params: {
            search: search || undefined,
            categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
            lowStockOnly: lowStockFilter ? 'true' : undefined,
          },
        }),
        api.get('/medicines/categories'),
      ]);

      if (medRes.data.success) setMedicines(medRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, lowStockFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await api.post('/medicines', {
        ...newMed,
        reorderLevel: Number(newMed.reorderLevel),
      });
      if (res.data.success) {
        setShowAddMedModal(false);
        setNewMed({
          name: '',
          genericName: '',
          sku: '',
          categoryId: '',
          dosageForm: 'Tablet',
          strength: '',
          manufacturer: '',
          reorderLevel: 20,
          description: '',
        });
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create medicine.');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddBatchModal) return;
    setFormError(null);
    try {
      const res = await api.post('/batches', {
        medicineId: showAddBatchModal.id,
        batchNumber: newBatch.batchNumber,
        quantity: Number(newBatch.quantity),
        purchasePrice: Number(newBatch.purchasePrice),
        sellingPrice: Number(newBatch.sellingPrice),
        mfgDate: newBatch.mfgDate,
        expiryDate: newBatch.expiryDate,
      });

      if (res.data.success) {
        setShowAddBatchModal(null);
        setNewBatch({
          batchNumber: '',
          quantity: 100,
          purchasePrice: 0,
          sellingPrice: 0,
          mfgDate: new Date().toISOString().slice(0, 10),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        });
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create batch.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medicine & Batch Inventory</h1>
          <p className="text-xs text-slate-500">
            Granular batch tracking with individual expiry dates, reorder thresholds & safety locks
          </p>
        </div>

        {hasRole('ADMIN', 'PHARMACIST') && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddMedModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by medicine name, generic name, SKU or manufacturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              lowStockFilter
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Medicine / Generic</th>
                <th className="px-4 py-3">SKU & Category</th>
                <th className="px-4 py-3">Form & Strength</th>
                <th className="px-4 py-3 text-right">Active Stock</th>
                <th className="px-4 py-3 text-right">Reorder Level</th>
                <th className="px-4 py-3">Active Batches</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading medicine inventory...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No medicines match the active search/filters.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => {
                  const isExpanded = expandedMedId === med.id;
                  const activeBatches = (med.batches || []).filter(
                    (b) => b.quantity > 0 && new Date(b.expiryDate) > new Date()
                  );
                  const expiredBatches = (med.batches || []).filter(
                    (b) => new Date(b.expiryDate) <= new Date()
                  );

                  return (
                    <React.Fragment key={med.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition cursor-pointer ${
                          isExpanded ? 'bg-slate-50' : ''
                        }`}
                        onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-teal-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 text-sm">{med.name}</div>
                          <div className="text-slate-500 text-[11px]">{med.genericName} • {med.manufacturer}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-slate-700">{med.sku}</div>
                          <div className="text-slate-400 text-[11px]">{med.category?.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {med.dosageForm} {med.strength}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div
                            className={`font-bold text-sm ${
                              med.isLowStock ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {med.totalAvailableStock || 0}
                          </div>
                          {med.isLowStock && (
                            <span className="text-[10px] font-bold text-rose-600">Low Stock!</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 font-medium">
                          {med.reorderLevel}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              {activeBatches.length} Active
                            </span>
                            {expiredBatches.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                {expiredBatches.length} Expired
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {hasRole('ADMIN', 'PHARMACIST') && (
                            <button
                              onClick={() => setShowAddBatchModal(med)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 rounded-lg transition"
                            >
                              + New Batch
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Batch Drilldown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="px-8 py-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Granular Batches for {med.name}</span>
                                </h4>
                                <span className="text-[11px] text-slate-400">
                                  Sorted by Expiry Date (FEFO Dispensing Order)
                                </span>
                              </div>

                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase text-[10px]">
                                    <th className="py-2 text-left">Batch Number</th>
                                    <th className="py-2 text-left">Mfg Date</th>
                                    <th className="py-2 text-left">Expiry Date</th>
                                    <th className="py-2 text-right">Cost Price</th>
                                    <th className="py-2 text-right">Retail MRP</th>
                                    <th className="py-2 text-right">Available Qty</th>
                                    <th className="py-2 text-center">Batch Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(med.batches || []).map((b) => {
                                    const isExpired = new Date(b.expiryDate) <= new Date();
                                    const isNearExpiry =
                                      !isExpired &&
                                      new Date(b.expiryDate).getTime() - Date.now() <=
                                        60 * 24 * 60 * 60 * 1000;

                                    return (
                                      <tr key={b.id} className="py-2">
                                        <td className="py-2 font-mono font-semibold text-slate-800">
                                          {b.batchNumber}
                                        </td>
                                        <td className="py-2 text-slate-500">
                                          {new Date(b.mfgDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-2 font-medium text-slate-700">
                                          {new Date(b.expiryDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-2 text-right text-slate-600">
                                          ₹{b.purchasePrice.toFixed(2)}
                                        </td>
                                        <td className="py-2 text-right font-semibold text-slate-900">
                                          ₹{b.sellingPrice.toFixed(2)}
                                        </td>
                                        <td className="py-2 text-right font-bold text-slate-900">
                                          {b.quantity}
                                        </td>
                                        <td className="py-2 text-center">
                                          {isExpired ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                                              EXPIRED (Sale Blocked)
                                            </span>
                                          ) : isNearExpiry ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                              Near Expiry (FEFO Priority)
                                            </span>
                                          ) : b.quantity === 0 ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                              Depleted
                                            </span>
                                          ) : (
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-800">
                                              Active & Healthy
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Add New Medicine to Catalogue</h3>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mx-6 mt-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMedicine} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Augmentin 625 Duo"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Generic Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin + Clavulanic Acid"
                    value={newMed.genericName}
                    onChange={(e) => setNewMed({ ...newMed, genericName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MED-AUG-625"
                    value={newMed.sku}
                    onChange={(e) => setNewMed({ ...newMed, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Category *</label>
                  <select
                    required
                    value={newMed.categoryId}
                    onChange={(e) => setNewMed({ ...newMed, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Dosage Form</label>
                  <select
                    value={newMed.dosageForm}
                    onChange={(e) => setNewMed({ ...newMed, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 625mg"
                    value={newMed.strength}
                    onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMed.reorderLevel}
                    onChange={(e) => setNewMed({ ...newMed, reorderLevel: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Manufacturer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GlaxoSmithKline Pharmaceuticals"
                  value={newMed.manufacturer}
                  onChange={(e) => setNewMed({ ...newMed, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Add Inventory Batch</h3>
                <p className="text-[11px] text-slate-500">{showAddBatchModal.name}</p>
              </div>
              <button
                onClick={() => setShowAddBatchModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mx-6 mt-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BATCH-2025-01"
                  value={newBatch.batchNumber}
                  onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Stock Quantity (Units) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newBatch.quantity}
                  onChange={(e) => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={newBatch.purchasePrice || ''}
                    onChange={(e) => setNewBatch({ ...newBatch, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Selling MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={newBatch.sellingPrice || ''}
                    onChange={(e) => setNewBatch({ ...newBatch, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Mfg Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatch.mfgDate}
                    onChange={(e) => setNewBatch({ ...newBatch, mfgDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatch.expiryDate}
                    onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold"
                >
                  Create Batch & Log Ingestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
