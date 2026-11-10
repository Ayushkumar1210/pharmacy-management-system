# Live Coding & Debugging Challenge Guide
## Preparation for the 10-Minute Live Change Task
**ALGIONS AI LABS — Technical Evaluation Round**

The assessment brief notes:
> *"Shortlisted candidates will attend a 15-minute technical walkthrough and a 10-minute live change/debugging task. You must explain your own architecture and modify your own work."*

Here are the top 5 live coding / debugging challenges an interviewer is likely to ask, along with the exact files to modify and ready-to-use code snippets.

---

### Challenge 1: "Add a Batch Quarantine / Recall feature"
**Interview Question**: *"If a pharmaceutical company announces a batch recall for safety reasons, how would you allow pharmacists to flag a batch as `RECALLED` and ensure it can never be dispensed at POS?"*

#### Where to modify:
1. **`backend/src/services/fefo.service.ts`**:
   In `getAvailableBatches()`, ensure only `'ACTIVE'` status batches are selected:
   ```typescript
   // Line 20: Ensure status is strictly ACTIVE (RECALLED is blocked)
   where: {
     medicineId,
     quantity: { gt: 0 },
     expiryDate: { gt: today },
     status: 'ACTIVE', // RECALLED or EXPIRED are automatically excluded!
   }
   ```
2. **In `validateBatchForSale()`**:
   ```typescript
   if (batch.status === 'RECALLED') {
     const error: any = new Error(`Sale blocked: Batch ${batch.batchNumber} has been RECALLED for safety reasons.`);
     error.statusCode = 400;
     throw error;
   }
   ```
3. **Endpoint to recall**: In `backend/src/controllers/batch.controller.ts`, add:
   ```typescript
   export const recallBatch = async (req: Request, res: Response) => {
     const { batchId } = req.params;
     const updated = await prisma.batch.update({
       where: { id: batchId },
       data: { status: 'RECALLED' },
     });
     res.json({ success: true, message: 'Batch quarantined and recalled', data: updated });
   };
   ```

---

### Challenge 2: "Make Near-Expiry Alert Window Configurable (e.g. 90 days instead of 60)"
**Interview Question**: *"Some hospital pharmacies want a 90-day or 120-day warning window for slow-moving drugs. How would you make the alert window dynamic?"*

#### Where to modify:
1. **`backend/src/services/report.service.ts`**:
   Update `getAlerts()` signature:
   ```typescript
   static async getAlerts(warningDays: number = 60) {
     const now = new Date();
     const inDays = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);
     // ...
     for (const b of allBatches) {
       const exp = new Date(b.expiryDate);
       if (exp <= now) {
         expiredBatches.push(...);
       } else if (exp <= inDays) {
         nearExpiryBatches.push(...);
       }
     }
   }
   ```
2. **`backend/src/controllers/report.controller.ts`**:
   ```typescript
   export const getAlertsReport = async (req: Request, res: Response) => {
     const days = req.query.days ? parseInt(req.query.days as string, 10) : 60;
     const alerts = await ReportService.getAlerts(days);
     res.json({ success: true, data: alerts });
   };
   ```

---

### Challenge 3: "Add Line-Item Discount in addition to Bill-Level Discount"
**Interview Question**: *"How would you support a discount on a specific medicine (e.g. 10% off on senior citizen vitamins)?"*

#### Where to modify:
1. **`backend/prisma/schema.prisma`**:
   Add `discount Float @default(0)` to `SaleItem`.
2. **`backend/src/services/sale.service.ts`**:
   In `SaleItemInput`, add `discount?: number;`.
   ```typescript
   const lineDiscount = item.discount || 0;
   const lineTotal = (unitPrice * item.quantity) - lineDiscount;
   ```
   Save `discount: lineDiscount` into `tx.saleItem.create({ ... })`.

---

### Challenge 4: "Add CSV Export for Inventory Reconciliation"
**Interview Question**: *"The pharmacy auditor needs a CSV download of the reconciliation report. How would you generate it?"*

#### Code snippet:
In `frontend/src/pages/Reports.tsx`:
```typescript
const exportReconciliationCSV = () => {
  const headers = "Medicine,SKU,Category,Purchases,Sales,Returns,Adjustments,CalculatedStock,BatchStock,Discrepancy\n";
  const rows = reconciliation.map(r => 
    `"${r.name}","${r.sku}","${r.category}",${r.totalPurchases},${r.totalSales},${r.totalReturns},${r.totalAdjustmentsAdd - r.totalAdjustmentsSub},${r.calculatedClosingStock},${r.actualBatchStock},${r.discrepancy}`
  ).join("\n");

  const blob = new Blob([headers + rows], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Stock_Reconciliation_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};
```

---

### Challenge 5: "How to debug a negative stock attempt"
**Interview Question**: *"If a cashier reports they got an error message 'Action rejected: negative stock', how do you trace what happened?"*

#### How to answer:
1. *"Open the Stock Movement Ledger at `/audit` or query `StockMovement` table in SQLite."*
2. *"Filter by the specific `batchId` to see the sequence of all transactions and `balanceAfter` snapshots."*
3. *"The atomic transaction in `SaleService` or `InventoryService` checks `currentBatch.quantity < requestedQuantity` inside `prisma.$transaction`. If another sale completed a millisecond prior and depleted the batch, our safety invariant caught the race condition and threw an informative error rather than allowing data corruption."*
