import prisma from '../prisma';
import { FefoService } from './fefo.service';

export interface SaleItemInput {
  medicineId: string;
  batchId?: string; // Optional: If omitted, FEFO auto-allocates!
  quantity: number;
  unitPrice?: number;
}

export interface CreateSaleInput {
  customerName?: string;
  customerPhone?: string;
  doctorName?: string;
  paymentMethod?: string;
  taxPercent?: number;
  discount?: number;
  amountPaid?: number;
  items: SaleItemInput[];
  cashierId: string;
}

export class SaleService {
  /**
   * Generate next sequential invoice number
   */
  private static async generateInvoiceNumber(): Promise<string> {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${todayStr}`;
    const count = await prisma.sale.count({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
    });
    const seq = (count + 1).toString().padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  /**
   * Process a complete sale atomically with FEFO deduction and stock movements
   */
  static async createSale(input: CreateSaleInput) {
    if (!input.items || input.items.length === 0) {
      const error: any = new Error('Sale must contain at least one item');
      error.statusCode = 400;
      throw error;
    }

    // Step 1: Resolve all line items into concrete batch deductions
    // If batchId is specified, validate it.
    // If batchId is not specified, run FEFO allocation!
    const resolvedDeductions: {
      medicineId: string;
      batchId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];

    for (const item of input.items) {
      if (item.quantity <= 0) {
        const error: any = new Error('Quantity must be greater than zero for all items');
        error.statusCode = 400;
        throw error;
      }

      if (item.batchId) {
        // Specific batch requested
        const batch = await FefoService.validateBatchForSale(item.batchId, item.quantity);
        const unitPrice = item.unitPrice ?? batch.sellingPrice;
        resolvedDeductions.push({
          medicineId: batch.medicineId,
          batchId: batch.id,
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
        });
      } else {
        // Auto FEFO allocation
        const allocations = await FefoService.allocateFefo(item.medicineId, item.quantity);
        for (const alloc of allocations) {
          const unitPrice = alloc.unitPrice;
          resolvedDeductions.push({
            medicineId: item.medicineId,
            batchId: alloc.batchId,
            quantity: alloc.allocatedQuantity,
            unitPrice,
            lineTotal: unitPrice * alloc.allocatedQuantity,
          });
        }
      }
    }

    // Step 2: Calculate financial totals
    const subtotal = resolvedDeductions.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxPercent = Math.max(0, input.taxPercent || 0);
    const discount = Math.max(0, input.discount || 0);
    const taxAmount = (subtotal * taxPercent) / 100;
    const totalAmount = Math.max(0, subtotal + taxAmount - discount);
    const amountPaid = input.amountPaid ?? totalAmount;
    const changeReturned = Math.max(0, amountPaid - totalAmount);

    const invoiceNumber = await this.generateInvoiceNumber();

    // Step 3: Run database transaction: lock & deduct batches, write sale, items, & audit logs
    const result = await prisma.$transaction(async (tx) => {
      // Create Sale Header
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerName: input.customerName?.trim() || 'Walk-in Customer',
          customerPhone: input.customerPhone?.trim() || null,
          doctorName: input.doctorName?.trim() || null,
          paymentMethod: input.paymentMethod || 'CASH',
          subtotal,
          taxPercent,
          taxAmount,
          discount,
          totalAmount,
          amountPaid,
          changeReturned,
          status: 'COMPLETED',
          cashierId: input.cashierId,
        },
      });

      // Process each deduction
      for (const deduction of resolvedDeductions) {
        // Fetch current batch inside transaction to guarantee freshness
        const currentBatch = await tx.batch.findUnique({
          where: { id: deduction.batchId },
        });

        if (!currentBatch) {
          throw new Error(`Batch ID ${deduction.batchId} no longer exists`);
        }

        const now = new Date();
        if (new Date(currentBatch.expiryDate) <= now || currentBatch.status === 'EXPIRED') {
          throw new Error(`Batch ${currentBatch.batchNumber} has expired and cannot be sold`);
        }

        if (currentBatch.quantity < deduction.quantity) {
          throw new Error(
            `Insufficient stock for batch ${currentBatch.batchNumber}. Available: ${currentBatch.quantity}, Required: ${deduction.quantity}`
          );
        }

        const newQuantity = currentBatch.quantity - deduction.quantity;
        const newStatus = newQuantity === 0 ? 'DEPLETED' : currentBatch.status;

        // Atomic update batch stock
        await tx.batch.update({
          where: { id: currentBatch.id },
          data: {
            quantity: newQuantity,
            status: newStatus,
          },
        });

        // Create SaleItem
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            medicineId: deduction.medicineId,
            batchId: deduction.batchId,
            quantity: deduction.quantity,
            unitPrice: deduction.unitPrice,
            lineTotal: deduction.lineTotal,
          },
        });

        // Create auditable Stock Movement entry
        await tx.stockMovement.create({
          data: {
            timestamp: new Date(),
            movementType: 'SALE',
            medicineId: deduction.medicineId,
            batchId: deduction.batchId,
            quantityDelta: -deduction.quantity, // Negative delta
            balanceAfter: newQuantity,
            reason: `Dispensed on invoice ${invoiceNumber}`,
            referenceId: sale.id,
            performedById: input.cashierId,
          },
        });
      }

      return sale;
    });

    // Step 4: Return populated sale with full line item details
    return await prisma.sale.findUnique({
      where: { id: result.id },
      include: {
        cashier: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, genericName: true, sku: true, dosageForm: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
        },
      },
    });
  }
}
