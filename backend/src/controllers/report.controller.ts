import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { ReportService } from '../services/report.service';

export const getReconciliationReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const report = await ReportService.getStockReconciliation();
    const allReconciled = report.every((r) => r.isReconciled);

    res.json({
      success: true,
      allReconciled,
      totalMedicinesEvaluated: report.length,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const alerts = await ReportService.getAlerts();
    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

export const getValuationReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const valuation = await ReportService.getInventoryValuation();
    res.json({ success: true, data: valuation });
  } catch (error) {
    next(error);
  }
};

export const getSalesSummaryReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const summary = await ReportService.getSalesSummary(days);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySales, alerts, valuation, totalMedicines, recentSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      ReportService.getAlerts(),
      ReportService.getInventoryValuation(),
      prisma.medicine.count(),
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { cashier: { select: { name: true } }, items: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        todayRevenue: todaySales._sum.totalAmount || 0,
        todaySalesCount: todaySales._count.id || 0,
        totalMedicines,
        totalInventoryCost: valuation.totalPurchaseCost,
        totalRetailValue: valuation.totalRetailValue,
        expiredBatchesCount: alerts.summary.expiredCount,
        nearExpiryBatchesCount: alerts.summary.nearExpiryCount,
        lowStockMedicinesCount: alerts.summary.lowStockCount,
        recentSales,
      },
    });
  } catch (error) {
    next(error);
  }
};
