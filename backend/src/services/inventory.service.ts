import prisma from '../prisma';

export interface StockAdjustmentInput {
  medicineId: string;
  batchId: string;
  type: 'CUSTOMER_RETURN' | 'DAMAGE_BREAKAGE' | 'EXPIRED_DISPOSAL' | 'AUDIT_ADJUSTMENT';
  quantity: number; // Positive magnitude of change
  isAddition?: boolean; // For audit adjustment: true = add, false = subtract
  reason: string; // MANDATORY!
  saleId?: string;
  refundUnitPrice?: number;
  performedById: string;
}

export interface PurchaseItemInput {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  mfgDate: string | Date;
  expiryDate: string | Date;
}

export interface CreatePurchaseInput {
  invoiceNumber: string;
  supplierId: string;
  receivedDate?: string | Date;
  notes?: string;
  items: PurchaseItemInput[];
  createdById: string;
}

export class InventoryService {
  /**
   * Process Stock Adjustments and Returns with mandatory reason and strict non-negative check
   */
  static async processAdjustment(input: StockAdjustmentInput) {
    // 1. Mandatory reason check
    if (!input.reason || input.reason.trim().length < 3) {
      const error: any = new Error('A detailed reason is mandatory for all returns and stock adjustments.');
      error.statusCode = 400;
      throw error;
    }

    if (input.quantity <= 0) {
      const error: any = new Error('Adjustment quantity must be greater than zero.');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: input.batchId },
        include: { medicine: true },
      });

      if (!batch) {
        const error: any = new Error(`Batch ID ${input.batchId} not found`);
        error.statusCode = 404;
        throw error;
      }

      // Determine delta and movement type
      let delta = 0;
      let movementType = input.type.toString();

      if (input.type === 'CUSTOMER_RETURN') {
        delta = input.quantity; // Stock increases
      } else if (input.type === 'DAMAGE_BREAKAGE' || input.type === 'EXPIRED_DISPOSAL') {
        delta = -input.quantity; // Stock decreases
      } else if (input.type === 'AUDIT_ADJUSTMENT') {
        delta = input.isAddition ? input.quantity : -input.quantity;
        movementType = input.isAddition ? 'AUDIT_ADJUSTMENT_ADD' : 'AUDIT_ADJUSTMENT_SUB';
      }

      const newQuantity = batch.quantity + delta;

      // Invariant: Stock must NEVER silently or explicitly become negative!
      if (newQuantity < 0) {
        const error: any = new Error(
          `Action rejected: Adjustment would result in negative stock (${newQuantity}) for batch ${batch.batchNumber}. Available: ${batch.quantity}`
        );
        error.statusCode = 400;
        throw error;
      }

      // Update batch
      const updatedBatch = await tx.batch.update({
        where: { id: batch.id },
        data: {
          quantity: newQuantity,
          status: newQuantity === 0 ? 'DEPLETED' : (new Date(batch.expiryDate) < new Date() ? 'EXPIRED' : 'ACTIVE'),
        },
      });

      // Generate return number if applicable
      const returnNumber = `RET-${Date.now().toString().slice(-8)}`;
      const returnRecord = await tx.return.create({
        data: {
          returnNumber,
          saleId: input.saleId || null,
          type: input.type,
          reason: input.reason.trim(),
          refundAmount: (input.refundUnitPrice || 0) * input.quantity,
          createdById: input.performedById,
          items: {
            create: {
              medicineId: batch.medicineId,
              batchId: batch.id,
              quantity: input.quantity,
              refundUnitPrice: input.refundUnitPrice || 0,
            },
          },
        },
      });

      // Log auditable StockMovement
      const movement = await tx.stockMovement.create({
        data: {
          timestamp: new Date(),
          movementType,
          medicineId: batch.medicineId,
          batchId: batch.id,
          quantityDelta: delta,
          balanceAfter: newQuantity,
          reason: input.reason.trim(),
          referenceId: returnRecord.id,
          performedById: input.performedById,
        },
      });

      return {
        returnRecord,
        updatedBatch,
        movement,
      };
    });
  }

  /**
   * Process Stock-In Purchase Orders from Suppliers
   */
  static async createPurchase(input: CreatePurchaseInput) {
    if (!input.items || input.items.length === 0) {
      const error: any = new Error('Purchase order must contain at least one medicine item');
      error.statusCode = 400;
      throw error;
    }

    const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    return await prisma.$transaction(async (tx) => {
      // Create purchase header
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber: input.invoiceNumber.trim(),
          supplierId: input.supplierId,
          receivedDate: input.receivedDate ? new Date(input.receivedDate) : new Date(),
          totalAmount,
          notes: input.notes?.trim() || null,
          createdById: input.createdById,
        },
      });

      for (const item of input.items) {
        // Upsert batch: if batchNumber exists for medicine, add stock; otherwise create new batch
        let batch = await tx.batch.findUnique({
          where: {
            medicineId_batchNumber: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber.trim(),
            },
          },
        });

        const mfgDate = new Date(item.mfgDate);
        const expiryDate = new Date(item.expiryDate);

        if (batch) {
          batch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              quantity: batch.quantity + item.quantity,
              initialQuantity: batch.initialQuantity + item.quantity,
              purchasePrice: item.unitCost,
              sellingPrice: item.sellingPrice,
              mfgDate,
              expiryDate,
              status: expiryDate <= new Date() ? 'EXPIRED' : 'ACTIVE',
            },
          });
        } else {
          batch = await tx.batch.create({
            data: {
              batchNumber: item.batchNumber.trim(),
              medicineId: item.medicineId,
              supplierId: input.supplierId,
              quantity: item.quantity,
              initialQuantity: item.quantity,
              purchasePrice: item.unitCost,
              sellingPrice: item.sellingPrice,
              mfgDate,
              expiryDate,
              status: expiryDate <= new Date() ? 'EXPIRED' : 'ACTIVE',
            },
          });
        }

        // Create PurchaseItem
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            medicineId: item.medicineId,
            batchId: batch.id,
            quantity: item.quantity,
            unitCost: item.unitCost,
            sellingPrice: item.sellingPrice,
            mfgDate,
            expiryDate,
            totalCost: item.quantity * item.unitCost,
          },
        });

        // Record StockMovement
        await tx.stockMovement.create({
          data: {
            timestamp: new Date(),
            movementType: 'PURCHASE',
            medicineId: item.medicineId,
            batchId: batch.id,
            quantityDelta: item.quantity,
            balanceAfter: batch.quantity,
            reason: `Supplier purchase invoice ${input.invoiceNumber}`,
            referenceId: purchase.id,
            performedById: input.createdById,
          },
        });
      }

      return purchase;
    });
  }
}
