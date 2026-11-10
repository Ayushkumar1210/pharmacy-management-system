import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Supplier } from '../types';
import { Users, Plus, Phone, Mail, MapPin, FileText, X } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSup, setNewSup] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/suppliers', newSup);
      if (res.data.success) {
        setShowModal(false);
        setNewSup({
          name: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: '',
          taxId: '',
        });
        fetchSuppliers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers & Distributors Directory</h1>
          <p className="text-xs text-slate-500">
            Authorized pharmaceutical distributors, contact details & procurement tax registrations
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Distributor</span>
        </button>
      </div>

      {/* Grid of Suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center p-8 text-slate-400 text-xs">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-3 text-center p-8 text-slate-400 text-xs">No suppliers found.</div>
        ) : (
          suppliers.map((sup) => (
            <div key={sup.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{sup.name}</h3>
                  <p className="text-xs text-slate-500">{sup.contactPerson || 'Authorized Representative'}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  {sup._count?.purchases || 0} POs
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sup.phone}</span>
                </div>
                {sup.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                )}
                {sup.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight text-slate-500">{sup.address}</span>
                  </div>
                )}
                {sup.taxId && (
                  <div className="flex items-center space-x-2 pt-1">
                    <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-700 font-semibold">{sup.taxId}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Add Pharmaceutical Distributor</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Company / Agency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MedSource National Distributors"
                  value={newSup.name}
                  onChange={(e) => setNewSup({ ...newSup, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Verma (Manager)"
                  value={newSup.contactPerson}
                  onChange={(e) => setNewSup({ ...newSup, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91..."
                    value={newSup.phone}
                    onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="orders@agency.com"
                    value={newSup.email}
                    onChange={(e) => setNewSup({ ...newSup, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">GSTIN / Drug License ID</label>
                <input
                  type="text"
                  placeholder="e.g. 07AAACM1234F1Z5"
                  value={newSup.taxId}
                  onChange={(e) => setNewSup({ ...newSup, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Warehouse Address</label>
                <textarea
                  rows={2}
                  placeholder="Physical dispatch address..."
                  value={newSup.address}
                  onChange={(e) => setNewSup({ ...newSup, address: e.target.value })}
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
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold"
                >
                  Save Distributor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
