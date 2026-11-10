import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { InventoryService } from '../services/inventory.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const createPurchase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const itemSchema = z.object({
      medicineId: z.string().min(1),
      batchNumber: z.string().min(1),
      quantity: z.number().int().positive(),
      unitCost: z.number().positive(),
      sellingPrice: z.number().positive(),
      mfgDate: z.string(),
      expiryDate: z.string(),
    });

    const schema = z.object({
      invoiceNumber: z.string().min(1),
      supplierId: z.string().min(1),
      receivedDate: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(itemSchema).min(1),
    });

    const parsed = schema.parse(req.body);

    const purchase = await InventoryService.createPurchase({
      ...parsed,
      createdById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      message: 'Stock-in purchase recorded successfully',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchases = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { receivedDate: 'desc' },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            medicine: { select: { name: true, sku: true } },
            batch: { select: { batchNumber: true, expiryDate: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};
