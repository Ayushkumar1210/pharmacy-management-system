import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { SaleService } from '../services/sale.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const createSale = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const itemSchema = z.object({
      medicineId: z.string().min(1),
      batchId: z.string().optional(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive().optional(),
    });

    const bodySchema = z.object({
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      doctorName: z.string().optional(),
      paymentMethod: z.enum(['CASH', 'CARD', 'UPI']).default('CASH'),
      taxPercent: z.number().min(0).max(100).default(0),
      discount: z.number().min(0).default(0),
      amountPaid: z.number().min(0).optional(),
      items: z.array(itemSchema).min(1),
    });

    const parsed = bodySchema.parse(req.body);

    const sale = await SaleService.createSale({
      ...parsed,
      cashierId: req.user!.id,
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

export const getSales = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, limit = '50', page = '1' } = req.query;
    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const where: any = {};
    if (search && typeof search === 'string') {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page as string, 10),
      totalPages: Math.ceil(total / take),
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};

export const getSaleById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        cashier: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, genericName: true, sku: true, dosageForm: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
        },
        returns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale invoice not found' });
      return;
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};
