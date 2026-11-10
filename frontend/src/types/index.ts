export type Role = 'ADMIN' | 'PHARMACIST' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { medicines: number };
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address?: string;
  taxId?: string;
  _count?: { purchases: number; batches: number };
}

export interface Batch {
  id: string;
  batchNumber: string;
  medicineId: string;
  medicine?: Medicine;
  supplierId?: string;
  supplier?: Supplier;
  quantity: number;
  initialQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mfgDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  sku: string;
  categoryId: string;
  category?: Category;
  dosageForm: string;
  strength: string;
  manufacturer: string;
  reorderLevel: number;
  description?: string;
  totalAvailableStock?: number;
  totalExpiredStock?: number;
  isLowStock?: boolean;
  activeBatchesCount?: number;
  nextExpiringDate?: string | null;
  batches?: Batch[];
}

export interface SaleItem {
  id?: string;
  medicineId: string;
  medicine?: Medicine;
  batchId: string;
  batch?: Batch;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  doctorName?: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  changeReturned: number;
  status: string;
  cashierId: string;
  cashier?: { id: string; name: string; email?: string; role?: string };
  createdAt: string;
  items: SaleItem[];
}

export interface StockMovement {
  id: string;
  timestamp: string;
  movementType: string;
  medicineId: string;
  medicine: { name: string; sku: string; dosageForm?: string };
  batchId: string;
  batch: { batchNumber: string; expiryDate: string };
  quantityDelta: number;
  balanceAfter: number;
  reason?: string;
  referenceId?: string;
  performedBy: { name: string; role: string };
}

export interface StockReconciliationItem {
  medicineId: string;
  name: string;
  sku: string;
  category: string;
  totalPurchases: number;
  totalSales: number;
  totalReturns: number;
  totalAdjustmentsAdd: number;
  totalAdjustmentsSub: number;
  calculatedClosingStock: number;
  actualBatchStock: number;
  discrepancy: number;
  isReconciled: boolean;
  activeBatchesCount: number;
}

export interface AlertSummary {
  expiredBatches: (Batch & { alertType: string; daysRemaining: number; lossValue: number })[];
  nearExpiryBatches: (Batch & { alertType: string; daysRemaining: number; atRiskValue: number })[];
  lowStockMedicines: {
    id: string;
    name: string;
    sku: string;
    category: string;
    reorderLevel: number;
    availableStock: number;
    shortfall: number;
  }[];
  summary: {
    expiredCount: number;
    nearExpiryCount: number;
    lowStockCount: number;
  };
}

export interface DashboardMetrics {
  todayRevenue: number;
  todaySalesCount: number;
  totalMedicines: number;
  totalInventoryCost: number;
  totalRetailValue: number;
  expiredBatchesCount: number;
  nearExpiryBatchesCount: number;
  lowStockMedicinesCount: number;
  recentSales: Sale[];
}
