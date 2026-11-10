import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';

describe('Pharmacy Management System - Acceptance Tests & Core Rules', () => {
  let adminToken: string;
  let cashierToken: string;
  let pharmacistToken: string;

  beforeAll(async () => {
    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@pharmacy.com', password: 'Password@123' });
    adminToken = adminRes.body.token;

    // Authenticate Pharmacist
    const pharmRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pharmacist@pharmacy.com', password: 'Password@123' });
    pharmacistToken = pharmRes.body.token;

    // Authenticate Cashier
    const cashierRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cashier@pharmacy.com', password: 'Password@123' });
    cashierToken = cashierRes.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // Acceptance Test 1: Sale deducts quantity from correct batch (FEFO) & records stock movement
  // =========================================================================
  describe('Acceptance Test 1: FEFO Sale & Stock Movement Ledger', () => {
    it('should deduct stock from the earliest-expiring active batch and log a stock movement', async () => {
      // Find Dolo 650mg which has two active batches: DOL-2024-EARLY and DOL-2024-LATE
      const dolo = await prisma.medicine.findUnique({
        where: { sku: 'MED-DOLO-650' },
        include: {
          batches: {
            where: { quantity: { gt: 0 }, expiryDate: { gt: new Date() } },
            orderBy: { expiryDate: 'asc' },
          },
        },
      });

      expect(dolo).not.toBeNull();
      expect(dolo!.batches.length).toBeGreaterThanOrEqual(2);

      const targetBatch = dolo!.batches[0]; // Earliest expiry batch (FEFO candidate)
      const initialQty = targetBatch.quantity;
      const sellQty = 5;

      const saleRes = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          customerName: 'Test Patient (FEFO Validation)',
          customerPhone: '9988776655',
          paymentMethod: 'CASH',
          taxPercent: 5,
          items: [
            {
              medicineId: dolo!.id,
              quantity: sellQty, // Should auto-allocate from targetBatch under FEFO
            },
          ],
        });

      expect(saleRes.status).toBe(201);
      expect(saleRes.body.success).toBe(true);
      expect(saleRes.body.data.invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);

      // Verify batch quantity in database
      const updatedBatch = await prisma.batch.findUnique({
        where: { id: targetBatch.id },
      });
      expect(updatedBatch!.quantity).toBe(initialQty - sellQty);

      // Verify Stock Movement record
      const movement = await prisma.stockMovement.findFirst({
        where: {
          batchId: targetBatch.id,
          movementType: 'SALE',
          referenceId: saleRes.body.data.id,
        },
      });

      expect(movement).not.toBeNull();
      expect(movement!.quantityDelta).toBe(-sellQty);
      expect(movement!.balanceAfter).toBe(initialQty - sellQty);
    });
  });

  // =========================================================================
  // Acceptance Test 2: An expired batch cannot be sold
  // =========================================================================
  describe('Acceptance Test 2: Expired Batch Sale Blocking', () => {
    it('should strictly reject sale attempt from an expired batch with HTTP 400', async () => {
      // Find the expired Azithromycin batch (AZI-EXP-OCT)
      const expiredBatch = await prisma.batch.findFirst({
        where: {
          batchNumber: 'AZI-EXP-OCT',
        },
        include: { medicine: true },
      });

      expect(expiredBatch).not.toBeNull();
      expect(new Date(expiredBatch!.expiryDate).getTime()).toBeLessThan(Date.now());

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          customerName: 'Expired Sale Test',
          items: [
            {
              medicineId: expiredBatch!.medicineId,
              batchId: expiredBatch!.id, // Explicitly requesting the expired batch
              quantity: 1,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);

      // Verify expired batch quantity has NOT changed
      const unchangedBatch = await prisma.batch.findUnique({
        where: { id: expiredBatch!.id },
      });
      expect(unchangedBatch!.quantity).toBe(expiredBatch!.quantity);
    });
  });

  // =========================================================================
  // Acceptance Test 3: System warns about low stock and near-expiry batches
  // =========================================================================
  describe('Acceptance Test 3: Low-stock and Near-Expiry Alerts', () => {
    it('should correctly identify low-stock medicines and near-expiry batches', async () => {
      const res = await request(app)
        .get('/api/reports/alerts')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { expiredBatches, nearExpiryBatches, lowStockMedicines, summary } = res.body.data;

      // Must identify the expired batch AZI-EXP-OCT
      expect(expiredBatches.some((b: any) => b.batchNumber === 'AZI-EXP-OCT')).toBe(true);

      // Must identify the near-expiry batch DOL-2024-EARLY (< 30 days)
      expect(nearExpiryBatches.some((b: any) => b.batchNumber === 'DOL-2024-EARLY')).toBe(true);

      // Must identify Atorvastatin (12 remaining vs 40 reorder level) or Telmisartan (8 remaining vs 30 reorder)
      expect(lowStockMedicines.some((m: any) => m.sku === 'MED-ATOR-20' || m.sku === 'MED-TELM-40')).toBe(true);

      expect(summary.expiredCount).toBeGreaterThanOrEqual(1);
      expect(summary.nearExpiryCount).toBeGreaterThanOrEqual(1);
      expect(summary.lowStockCount).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // Acceptance Test 4: Returns/adjustments require a reason and are auditable
  // =========================================================================
  describe('Acceptance Test 4: Return/Adjustment Reason Requirement & Audit Trail', () => {
    it('should REJECT return/adjustment if reason is missing or empty', async () => {
      const batch = await prisma.batch.findFirst({
        where: { quantity: { gt: 10 } },
      });

      const res = await request(app)
        .post('/api/returns/adjust')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          medicineId: batch!.medicineId,
          batchId: batch!.id,
          type: 'DAMAGE_BREAKAGE',
          quantity: 2,
          reason: '   ', // Blank / whitespace reason
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/reason is mandatory/i);
    });

    it('should succeed with valid reason, adjust stock, and create auditable movement', async () => {
      const batch = await prisma.batch.findFirst({
        where: { quantity: { gt: 10 }, expiryDate: { gt: new Date() } },
      });

      const initialQty = batch!.quantity;
      const adjustQty = 2;
      const auditReason = 'Accidental bottle drop during shelf restocking';

      const res = await request(app)
        .post('/api/returns/adjust')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          medicineId: batch!.medicineId,
          batchId: batch!.id,
          type: 'DAMAGE_BREAKAGE',
          quantity: adjustQty,
          reason: auditReason,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify batch quantity decreased
      const updated = await prisma.batch.findUnique({ where: { id: batch!.id } });
      expect(updated!.quantity).toBe(initialQty - adjustQty);

      // Verify audit movement was created with reason
      const movement = await prisma.stockMovement.findFirst({
        where: {
          batchId: batch!.id,
          movementType: 'DAMAGE_BREAKAGE',
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(movement).not.toBeNull();
      expect(movement!.reason).toBe(auditReason);
      expect(movement!.quantityDelta).toBe(-adjustQty);
      expect(movement!.balanceAfter).toBe(initialQty - adjustQty);
    });

    it('should reject adjustments that would cause negative stock', async () => {
      const batch = await prisma.batch.findFirst({
        where: { quantity: { gt: 0 } },
      });

      const excessiveQty = batch!.quantity + 500;

      const res = await request(app)
        .post('/api/returns/adjust')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          medicineId: batch!.medicineId,
          batchId: batch!.id,
          type: 'DAMAGE_BREAKAGE',
          quantity: excessiveQty,
          reason: 'Attempting invalid deduction',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/negative stock/i);
    });
  });

  // =========================================================================
  // Acceptance Test 5: Stock report reconciles with opening, purchases, sales, & adjustments
  // =========================================================================
  describe('Acceptance Test 5: Full Inventory Reconciliation', () => {
    it('should reconcile calculated stock from audit movements with physical batch stock (discrepancy = 0)', async () => {
      const res = await request(app)
        .get('/api/reports/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.allReconciled).toBe(true);

      for (const item of res.body.data) {
        expect(item.discrepancy).toBe(0);
        expect(item.isReconciled).toBe(true);
        expect(item.calculatedClosingStock).toBe(item.actualBatchStock);
      }
    });
  });

  // =========================================================================
  // Security & RBAC Test: Cashier cannot adjust inventory
  // =========================================================================
  describe('Security & Role-Based Access Control (RBAC)', () => {
    it('should forbid Cashier from performing stock adjustments (requires PHARMACIST or ADMIN)', async () => {
      const batch = await prisma.batch.findFirst();

      const res = await request(app)
        .post('/api/returns/adjust')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          medicineId: batch!.medicineId,
          batchId: batch!.id,
          type: 'AUDIT_ADJUSTMENT',
          quantity: 1,
          reason: 'Unauthorized cashier adjustment',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });
  });
});
