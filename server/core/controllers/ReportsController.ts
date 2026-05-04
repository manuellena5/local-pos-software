import type { Request, Response, NextFunction } from 'express';
import type { ReportService } from '../services/ReportService';

function getBUId(req: Request): number {
  return parseInt(req.query['businessUnitId'] as string, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ReportsController {
  constructor(private readonly service: ReportService) {}

  getSalesReport = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const { date, fromDate, toDate } = req.query as Record<string, string>;

      if (date) {
        const data = this.service.getSalesByDate(businessUnitId, date);
        res.json({ data: [data], error: null });
        return;
      }

      const from = fromDate ?? getToday();
      const to = toDate ?? getToday();
      const data = this.service.getSalesByRange(businessUnitId, from, to);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getTopProducts = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const limit = parseInt(req.query['limit'] as string ?? '10', 10);
      const data = this.service.getTopProducts(businessUnitId, limit);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getTopCustomers = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const limit = parseInt(req.query['limit'] as string ?? '10', 10);
      const data = this.service.getTopCustomers(businessUnitId, limit);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getStockMovements = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const { fromDate, toDate } = req.query as Record<string, string>;
      const data = this.service.getStockMovements(businessUnitId, { fromDate, toDate });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  exportCSV = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const reportType = req.query['reportType'] as string;
      const { fromDate, toDate, limit } = req.query as Record<string, string>;

      let csv = '';
      let filename = `reporte_${reportType}_${getToday()}.csv`;

      if (reportType === 'sales') {
        const from = fromDate ?? getToday();
        const to = toDate ?? getToday();
        const data = this.service.getSalesByRange(businessUnitId, from, to);
        csv = this.service.generateCSV(
          data.map((d) => ({
            date: d.date,
            totalSales: d.totalSales,
            totalAmount: d.totalAmount,
            avgTicket: d.avgTicket,
          })),
          [
            { key: 'date', label: 'Fecha' },
            { key: 'totalSales', label: 'Cantidad de Ventas' },
            { key: 'totalAmount', label: 'Monto Total ($)' },
            { key: 'avgTicket', label: 'Ticket Promedio ($)' },
          ],
        );
        filename = `ventas_${from}_${to}.csv`;
      } else if (reportType === 'top-products') {
        const lim = parseInt(limit ?? '10', 10);
        const data = this.service.getTopProducts(businessUnitId, lim);
        csv = this.service.generateCSV(data as unknown as Record<string, unknown>[], [
          { key: 'name', label: 'Producto' },
          { key: 'category', label: 'Categoría' },
          { key: 'quantity', label: 'Cantidad Vendida' },
          { key: 'revenue', label: 'Ingresos ($)' },
        ]);
      } else if (reportType === 'top-customers') {
        const lim = parseInt(limit ?? '10', 10);
        const data = this.service.getTopCustomers(businessUnitId, lim);
        csv = this.service.generateCSV(data as unknown as Record<string, unknown>[], [
          { key: 'name', label: 'Cliente' },
          { key: 'purchaseCount', label: 'Cantidad de Compras' },
          { key: 'totalSpent', label: 'Total Gastado ($)' },
        ]);
      } else {
        res.status(400).json({ data: null, error: { code: 'INVALID_PARAM', message: 'reportType inválido' } });
        return;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  };
}
