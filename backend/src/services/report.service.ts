import prisma from '../prisma';

export class ReportService {
  /**
   * Acceptance Test 5: Reconcile stock across opening stock, purchases, sales, and adjustments
   */
  static async getStockReconciliation() {
    const medicines = await prisma.medicine.findMany({
      include: {
        category: true,
        batches: true,
        stockMovements: true,
      },
      orderBy: { name: 'asc' },
    });

    const reconciliation = medicines.map((med) => {
      let totalPurchases = 0;
      let totalSales = 0;
      let totalReturns = 0;
      let totalAdjustmentsAdd = 0;
      let totalAdjustmentsSub = 0;

      for (const m of med.stockMovements) {
        if (m.movementType === 'PURCHASE') {
          totalPurchases += m.quantityDelta;
        } else if (m.movementType === 'SALE') {
          totalSales += Math.abs(m.quantityDelta);
        } else if (m.movementType === 'CUSTOMER_RETURN') {
          totalReturns += m.quantityDelta;
        } else if (m.movementType === 'AUDIT_ADJUSTMENT_ADD') {
          totalAdjustmentsAdd += m.quantityDelta;
        } else if (
          m.movementType === 'AUDIT_ADJUSTMENT_SUB' ||
          m.movementType === 'DAMAGE_BREAKAGE' ||
          m.movementType === 'EXPIRED_DISPOSAL'
        ) {
          totalAdjustmentsSub += Math.abs(m.quantityDelta);
        }
      }

      // Calculated closing stock based on audit movements formula:
      // Purchases - Sales + Returns + AdjustmentsAdd - AdjustmentsSub
      const calculatedClosingStock =
        totalPurchases - totalSales + totalReturns + totalAdjustmentsAdd - totalAdjustmentsSub;

      // Actual physical stock recorded in batch records
      const actualBatchStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);

      // Invariant check: reconciliation discrepancy should be 0
      const isReconciled = calculatedClosingStock === actualBatchStock;

      return {
        medicineId: med.id,
        name: med.name,
        sku: med.sku,
        category: med.category.name,
        totalPurchases,
        totalSales,
        totalReturns,
        totalAdjustmentsAdd,
        totalAdjustmentsSub,
        calculatedClosingStock,
        actualBatchStock,
        discrepancy: calculatedClosingStock - actualBatchStock,
        isReconciled,
        activeBatchesCount: med.batches.filter((b) => b.quantity > 0).length,
      };
    });

    return reconciliation;
  }

  /**
   * Acceptance Test 3: Low-stock and Near-expiry alerts
   */
  static async getAlerts() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // 1. Batches near expiry (< 60 days) or already expired
    const allBatches = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
      },
      include: {
        medicine: true,
        supplier: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    const expiredBatches: any[] = [];
    const nearExpiryBatches: any[] = [];

    for (const b of allBatches) {
      const exp = new Date(b.expiryDate);
      if (exp <= now) {
        expiredBatches.push({
          ...b,
          alertType: 'EXPIRED',
          daysRemaining: Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          lossValue: b.quantity * b.purchasePrice,
        });
      } else if (exp <= in60Days) {
        nearExpiryBatches.push({
          ...b,
          alertType: exp <= in30Days ? 'CRITICAL_NEAR_EXPIRY' : 'NEAR_EXPIRY',
          daysRemaining: Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          atRiskValue: b.quantity * b.purchasePrice,
        });
      }
    }

    // 2. Low stock medicines (sum of non-expired batch quantities <= reorderLevel)
    const medicines = await prisma.medicine.findMany({
      include: {
        category: true,
        batches: {
          where: {
            quantity: { gt: 0 },
            expiryDate: { gt: now },
          },
        },
      },
    });

    const lowStockMedicines = medicines
      .map((med) => {
        const availableStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          id: med.id,
          name: med.name,
          sku: med.sku,
          category: med.category.name,
          reorderLevel: med.reorderLevel,
          availableStock,
          isLowStock: availableStock <= med.reorderLevel,
          shortfall: Math.max(0, med.reorderLevel - availableStock),
        };
      })
      .filter((m) => m.isLowStock);

    return {
      expiredBatches,
      nearExpiryBatches,
      lowStockMedicines,
      summary: {
        expiredCount: expiredBatches.length,
        nearExpiryCount: nearExpiryBatches.length,
        lowStockCount: lowStockMedicines.length,
      },
    };
  }

  /**
   * Inventory Valuation Report
   */
  static async getInventoryValuation() {
    const batches = await prisma.batch.findMany({
      where: { quantity: { gt: 0 } },
      include: { medicine: { include: { category: true } } },
    });

    let totalPurchaseCost = 0;
    let totalRetailValue = 0;
    const categoryBreakdown: Record<string, { purchaseCost: number; retailValue: number; units: number }> = {};

    for (const b of batches) {
      const costVal = b.quantity * b.purchasePrice;
      const retailVal = b.quantity * b.sellingPrice;

      totalPurchaseCost += costVal;
      totalRetailValue += retailVal;

      const catName = b.medicine.category.name;
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { purchaseCost: 0, retailValue: 0, units: 0 };
      }
      categoryBreakdown[catName].purchaseCost += costVal;
      categoryBreakdown[catName].retailValue += retailVal;
      categoryBreakdown[catName].units += b.quantity;
    }

    return {
      totalPurchaseCost: Math.round(totalPurchaseCost * 100) / 100,
      totalRetailValue: Math.round(totalRetailValue * 100) / 100,
      potentialProfitMargin: Math.round((totalRetailValue - totalPurchaseCost) * 100) / 100,
      categoryBreakdown,
      batchesEvaluated: batches.length,
    };
  }

  /**
   * Sales & Revenue Report
   */
  static async getSalesSummary(days: number = 30) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: fromDate },
      },
      include: {
        items: {
          include: {
            batch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let totalDiscountGiven = 0;
    let totalEstimatedCost = 0;

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalTaxCollected += sale.taxAmount;
      totalDiscountGiven += sale.discount;

      for (const item of sale.items) {
        totalEstimatedCost += item.quantity * item.batch.purchasePrice;
      }
    }

    const estimatedGrossProfit = totalRevenue - totalTaxCollected - totalEstimatedCost;

    return {
      totalSalesCount: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
      totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
      estimatedGrossProfit: Math.round(estimatedGrossProfit * 100) / 100,
      periodDays: days,
    };
  }
}
