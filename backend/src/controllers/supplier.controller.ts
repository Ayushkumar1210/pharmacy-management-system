import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

export const getSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchases: true, batches: true },
        },
      },
    });

    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      contactPerson: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().min(5),
      address: z.string().optional(),
      taxId: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        contactPerson: body.contactPerson || null,
        email: body.email || null,
        phone: body.phone,
        address: body.address || null,
        taxId: body.taxId || null,
      },
    });

    res.status(201).json({ success: true, message: 'Supplier added successfully', data: supplier });
  } catch (error) {
    next(error);
  }
};
