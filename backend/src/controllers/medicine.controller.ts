import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

export const getMedicines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, categoryId, lowStockOnly } = req.query;
    const now = new Date();

    const whereClause: any = {};

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { sku: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }

    if (categoryId && typeof categoryId === 'string' && categoryId !== 'all') {
      whereClause.categoryId = categoryId;
    }

    const medicines = await prisma.medicine.findMany({
      where: whereClause,
      include: {
        category: true,
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = medicines.map((m) => {
      const activeBatches = m.batches.filter((b) => b.quantity > 0 && new Date(b.expiryDate) > now);
      const expiredBatches = m.batches.filter((b) => b.quantity > 0 && new Date(b.expiryDate) <= now);
      const totalAvailableStock = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      const totalExpiredStock = expiredBatches.reduce((acc, b) => acc + b.quantity, 0);
      const isLowStock = totalAvailableStock <= m.reorderLevel;

      // Find earliest active expiry
      const nextExpiringBatch = activeBatches[0] || null;

      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        sku: m.sku,
        category: m.category,
        dosageForm: m.dosageForm,
        strength: m.strength,
        manufacturer: m.manufacturer,
        reorderLevel: m.reorderLevel,
        description: m.description,
        totalAvailableStock,
        totalExpiredStock,
        isLowStock,
        activeBatchesCount: activeBatches.length,
        nextExpiringDate: nextExpiringBatch ? nextExpiringBatch.expiryDate : null,
        batches: m.batches,
      };
    });

    const filtered = lowStockOnly === 'true' ? enriched.filter((m) => m.isLowStock) : enriched;

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicineById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        batches: {
          include: { supplier: true },
          orderBy: { expiryDate: 'asc' },
        },
        stockMovements: {
          take: 20,
          orderBy: { timestamp: 'desc' },
          include: { performedBy: { select: { name: true, role: true } }, batch: true },
        },
      },
    });

    if (!medicine) {
      res.status(404).json({ success: false, message: 'Medicine not found' });
      return;
    }

    res.json({ success: true, data: medicine });
  } catch (error) {
    next(error);
  }
};

export const createMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      genericName: z.string().min(2),
      sku: z.string().min(2),
      categoryId: z.string().min(1),
      dosageForm: z.string().min(2),
      strength: z.string().min(1),
      manufacturer: z.string().min(2),
      reorderLevel: z.number().int().min(0).default(20),
      description: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const existingSku = await prisma.medicine.findUnique({ where: { sku: body.sku } });
    if (existingSku) {
      res.status(409).json({ success: false, message: `Medicine SKU "${body.sku}" already exists` });
      return;
    }

    const created = await prisma.medicine.create({
      data: body,
      include: { category: true },
    });

    res.status(201).json({ success: true, message: 'Medicine created successfully', data: created });
  } catch (error) {
    next(error);
  }
};

export const updateMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(2).optional(),
      genericName: z.string().min(2).optional(),
      categoryId: z.string().optional(),
      dosageForm: z.string().optional(),
      strength: z.string().optional(),
      manufacturer: z.string().optional(),
      reorderLevel: z.number().int().min(0).optional(),
      description: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const updated = await prisma.medicine.update({
      where: { id },
      data: body,
      include: { category: true },
    });

    res.json({ success: true, message: 'Medicine updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { medicines: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};
