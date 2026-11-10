import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Medicine, Batch, Sale } from '../types';
import {
  Search,
  Plus,
  Trash2,
  Receipt,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { InvoicePrintModal } from '../components/invoice/InvoicePrintModal';

interface CartItem {
  medicine: Medicine;
  batchId?: string; // If undefined, backend auto-allocates via FEFO
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
}

export const PosBilling: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Load medicines list
  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await api.get('/medicines');
        if (res.data.success) {
          setMedicines(res.data.data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchMedicines();
  }, []);

  // Filter medicines by search query
  const filteredMedicines = medicines.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q)
    );
  });

  const addToCart = (med: Medicine) => {
    setError(null);
    if ((med.totalAvailableStock || 0) <= 0) {
      setError(`"${med.name}" has no non-expired stock available!`);
      return;
    }

    // Default to earliest active batch (FEFO priority)
    const activeBatches = (med.batches || []).filter(
      (b) => b.quantity > 0 && new Date(b.expiryDate) > new Date()
    );

    if (activeBatches.length === 0) {
      setError(`No active non-expired batches found for ${med.name}.`);
      return;
    }

    const fefoBatch = activeBatches[0]; // Earliest expiry

    // Check if already in cart
    const existingIndex = cart.findIndex(
      (item) => item.medicine.id === med.id && item.batchId === fefoBatch.id
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      if (updated[existingIndex].quantity + 1 > fefoBatch.quantity) {
        setError(`Cannot exceed available batch stock (${fefoBatch.quantity} units).`);
        return;
      }
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          medicine: med,
          batchId: fefoBatch.id,
          batchNumber: fefoBatch.batchNumber,
          expiryDate: fefoBatch.expiryDate,
          quantity: 1,
          unitPrice: fefoBatch.sellingPrice,
          availableStock: fefoBatch.quantity,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.availableStock) {
      setError(`Cannot exceed batch available stock (${item.availableStock} units).`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  // Subtotal and Totals
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);
  const tendered = parseFloat(amountPaid) || grandTotal;
  const changeDue = Math.max(0, tendered - grandTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Please add at least one item to the cart.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        customerName,
        customerPhone: customerPhone || undefined,
        doctorName: doctorName || undefined,
        paymentMethod,
        taxPercent,
        discount,
        amountPaid: tendered,
        items: cart.map((item) => ({
          medicineId: item.medicine.id,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const res = await api.post('/sales', payload);
      if (res.data.success) {
        setCompletedSale(res.data.data);
        // Clear cart and reset inputs
        setCart([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setDoctorName('');
        setDiscount(0);
        setAmountPaid('');

        // Refresh medicines to reflect updated stock levels
        const refreshed = await api.get('/medicines');
        if (refreshed.data.success) setMedicines(refreshed.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process sale. Please check batch quantities.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Point of Sale (POS) Billing</h1>
          <p className="text-xs text-slate-500">
            Real-time FEFO stock deduction, tax calculation & instant printable receipt
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>FEFO Auto-Allocation Enforced</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Medicine Selector (Left) vs Checkout Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Medicine Catalog Browser (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[740px]">
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-100 flex items-center space-x-3 bg-slate-50/50">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search medicine brand, generic name, or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {filteredMedicines.length} Items
            </span>
          </div>

          {/* Medicines Grid/List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
            {filteredMedicines.map((med) => {
              const activeBatches = (med.batches || []).filter(
                (b) => b.quantity > 0 && new Date(b.expiryDate) > new Date()
              );
              const earliestBatch = activeBatches[0];
              const isOutOfStock = (med.totalAvailableStock || 0) <= 0;

              return (
                <div
                  key={med.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg transition"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">{med.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {med.dosageForm}
                      </span>
                      {med.isLowStock && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{med.genericName} • {med.manufacturer}</div>
                    {earliestBatch && (
                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
                        <span className="font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-semibold">
                          FEFO: {earliestBatch.batchNumber}
                        </span>
                        <span>Exp: {new Date(earliestBatch.expiryDate).toLocaleDateString()}</span>
                        <span className="font-semibold text-slate-800">₹{earliestBatch.sellingPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-xs font-bold ${isOutOfStock ? 'text-red-600' : 'text-slate-800'}`}>
                        {med.totalAvailableStock || 0} in stock
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {activeBatches.length} active batch{activeBatches.length !== 1 ? 'es' : ''}
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(med)}
                      disabled={isOutOfStock}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Dispense</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Cart & Invoicing Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[740px]">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800">Current Dispensing Order</h2>
            </div>
            <span className="text-xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <Receipt className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">Dispensing cart is empty</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select medicines from the catalog to allocate batches and generate bill
                </p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{item.medicine.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Batch: <span className="font-semibold text-slate-700">{item.batchNumber}</span> (Exp: {item.expiryDate?.slice(0, 7)})
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-slate-400 hover:text-red-600 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-slate-400 ml-1">@ ₹{item.unitPrice.toFixed(2)}</span>
                    </div>

                    <div className="font-bold text-slate-900">
                      ₹{(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer & Pricing Controls */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3 shrink-0">
            {/* Customer Inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Patient Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Patient Name"
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Payment:</span>
              {(['CASH', 'UPI', 'CARD'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition ${
                    paymentMethod === method
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* Summary Lines */}
            <div className="space-y-1 text-xs pt-1 border-t border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1">
                  Tax GST:
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value))}
                    className="ml-1 text-[11px] bg-white border border-slate-200 rounded px-1 py-0.5"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-20 text-right px-2 py-0.5 text-xs bg-white border border-slate-200 rounded"
                />
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-teal-700 text-base">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold transition shadow-md shadow-teal-700/20 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Processing Sale...' : `Settle & Print Invoice (₹${grandTotal.toFixed(2)})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {completedSale && <InvoicePrintModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
    </div>
  );
};
