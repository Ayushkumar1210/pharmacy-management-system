import { Response, NextFunction } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getAuditTrail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { medicineId, batchId, movementType, limit = '100', page = '1' } = req.query;

    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const where: any = {};
    if (medicineId && typeof medicineId === 'string') {
      where.medicineId = medicineId;
    }
    if (batchId && typeof batchId === 'string') {
      where.batchId = batchId;
    }
    if (movementType && typeof movementType === 'string' && movementType !== 'ALL') {
      where.movementType = movementType;
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        take,
        skip,
        orderBy: { timestamp: 'desc' },
        include: {
          medicine: { select: { name: true, sku: true, dosageForm: true } },
          batch: { select: { batchNumber: true, expiryDate: true } },
          performedBy: { select: { name: true, role: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page as string, 10),
      totalPages: Math.ceil(total / take),
      data: movements,
    });
  } catch (error) {
    next(error);
  }
};
