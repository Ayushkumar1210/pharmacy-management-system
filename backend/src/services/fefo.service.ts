import prisma from '../prisma';

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  allocatedQuantity: number;
  unitPrice: number;
  availableQuantity: number;
}

export class FefoService {
  /**
   * Fetch active, non-expired batches for a medicine sorted by Expiry Date ASC (FEFO)
   */
  static async getAvailableBatches(medicineId: string) {
    const today = new Date();

    return await prisma.batch.findMany({
      where: {
        medicineId,
        quantity: { gt: 0 },
        expiryDate: { gt: today },
        status: 'ACTIVE',
      },
      orderBy: {
        expiryDate: 'asc', // FEFO: earliest expiry first
      },
    });
  }

  /**
   * Automatically calculate batch allocation based on FEFO principle
   */
  static async allocateFefo(medicineId: string, requestedQty: number): Promise<BatchAllocation[]> {
    if (requestedQty <= 0) {
      throw new Error('Requested quantity must be greater than zero');
    }

    const batches = await this.getAvailableBatches(medicineId);
    const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);

    if (totalAvailable < requestedQty) {
      throw new Error(
        `Insufficient non-expired stock. Requested: ${requestedQty}, Available (non-expired): ${totalAvailable}`
      );
    }

    const allocations: BatchAllocation[] = [];
    let remainingNeeded = requestedQty;

    for (const batch of batches) {
      if (remainingNeeded <= 0) break;

      const takeQty = Math.min(batch.quantity, remainingNeeded);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        allocatedQuantity: takeQty,
        unitPrice: batch.sellingPrice,
        availableQuantity: batch.quantity,
      });

      remainingNeeded -= takeQty;
    }

    return allocations;
  }

  /**
   * Validate a specific batch for sale (e.g. manual batch selection in POS)
   */
  static async validateBatchForSale(batchId: string, quantityToDeduct: number) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { medicine: true },
    });

    if (!batch) {
      const error: any = new Error(`Batch ID ${batchId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    if (new Date(batch.expiryDate) <= now || batch.status === 'EXPIRED') {
      const expDateStr = new Date(batch.expiryDate).toISOString().split('T')[0];
      const error: any = new Error(
        `Sale blocked: Batch ${batch.batchNumber} for "${batch.medicine.name}" expired on ${expDateStr} and cannot be sold.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (batch.quantity < quantityToDeduct) {
      const error: any = new Error(
        `Insufficient stock for batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${quantityToDeduct}.`
      );
      error.statusCode = 400;
      throw error;
    }

    return batch;
  }
}
