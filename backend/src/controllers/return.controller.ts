import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { InventoryService } from '../services/inventory.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const createAdjustment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schema = z.object({
      medicineId: z.string().min(1),
      batchId: z.string().min(1),
      type: z.enum(['CUSTOMER_RETURN', 'DAMAGE_BREAKAGE', 'EXPIRED_DISPOSAL', 'AUDIT_ADJUSTMENT']),
      quantity: z.number().int().positive(),
      isAddition: z.boolean().optional(),
      reason: z.string().min(3, 'Detailed reason is strictly mandatory'),
      saleId: z.string().optional(),
      refundUnitPrice: z.number().min(0).optional(),
    });

    const parsed = schema.parse(req.body);

    const result = await InventoryService.processAdjustment({
      ...parsed,
      performedById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      message: 'Stock adjustment/return processed successfully and recorded in audit log',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getReturns = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const returns = await prisma.return.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        sale: { select: { invoiceNumber: true, customerName: true } },
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
      count: returns.length,
      data: returns,
    });
  } catch (error) {
    next(error);
  }
};
