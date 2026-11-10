import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { FefoService } from '../services/fefo.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { medicineId, status, isExpired } = req.query;
    const now = new Date();

    const where: any = {};
    if (medicineId && typeof medicineId === 'string') {
      where.medicineId = medicineId;
    }
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (isExpired === 'true') {
      where.expiryDate = { lte: now };
    } else if (isExpired === 'false') {
      where.expiryDate = { gt: now };
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        medicine: { select: { id: true, name: true, genericName: true, sku: true, dosageForm: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    res.json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

export const getFefoRecommendation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { medicineId, quantity } = req.query;

    if (!medicineId || typeof medicineId !== 'string') {
      res.status(400).json({ success: false, message: 'medicineId query parameter is required' });
      return;
    }

    const qty = parseInt(quantity as string, 10);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: 'Valid positive quantity is required' });
      return;
    }

    const allocations = await FefoService.allocateFefo(medicineId, qty);

    res.json({
      success: true,
      message: 'FEFO allocation calculated successfully',
      allocations,
    });
  } catch (error) {
    next(error);
  }
};

export const createBatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      medicineId: z.string().min(1),
      batchNumber: z.string().min(1),
      quantity: z.number().int().min(1),
      purchasePrice: z.number().positive(),
      sellingPrice: z.number().positive(),
      mfgDate: z.string(),
      expiryDate: z.string(),
      supplierId: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const mfg = new Date(body.mfgDate);
    const exp = new Date(body.expiryDate);

    if (exp <= mfg) {
      res.status(400).json({ success: false, message: 'Expiry date must be after manufacturing date' });
      return;
    }

    const created = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          medicineId: body.medicineId,
          batchNumber: body.batchNumber.trim(),
          quantity: body.quantity,
          initialQuantity: body.quantity,
          purchasePrice: body.purchasePrice,
          sellingPrice: body.sellingPrice,
          mfgDate: mfg,
          expiryDate: exp,
          supplierId: body.supplierId || null,
          status: exp <= new Date() ? 'EXPIRED' : 'ACTIVE',
        },
      });

      // Record opening stock movement
      await tx.stockMovement.create({
        data: {
          timestamp: new Date(),
          movementType: 'PURCHASE',
          medicineId: body.medicineId,
          batchId: batch.id,
          quantityDelta: body.quantity,
          balanceAfter: body.quantity,
          reason: `Manual Batch Ingestion (${batch.batchNumber})`,
          performedById: req.user!.id,
        },
      });

      return batch;
    });

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};
