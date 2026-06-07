import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../lib/errors';
import { printerService } from '../services/PrinterService';
import type { PrinterRepository } from '../repositories/PrinterRepository';

const saleTicketDataSchema = z.object({
  saleNumber: z.string(),
  date: z.string(),
  time: z.string(),
  businessName: z.string(),
  businessAddress: z.string(),
  cuit: z.string(),
  ingBrutos: z.string().optional(),
  businessFiscalCondition: z.string().optional(),
  businessUnitName: z.string(),
  fiscalCondition: z.string(),
  customerDocType: z.number().optional(),
  customerDoc: z.number().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      subtotal: z.number(),
      itemDiscount: z.number().optional(),
    }),
  ),
  subtotalBeforeDiscount: z.number().optional(),
  globalDiscount: z.number().optional(),
  globalDiscountAmount: z.number().optional(),
  total: z.number(),
  payments: z.array(
    z.object({
      method: z.string(),
      amount: z.number(),
    }),
  ),
  change: z.number().optional(),
  cae: z.string().optional(),
  caeVto: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

const printerConfigSchema = z.object({
  type: z.enum(['usb', 'network']),
  usbVendorId: z.number().optional(),
  usbProductId: z.number().optional(),
  portPath: z.string().optional(),
  host: z.string().optional(),
  port: z.number().optional(),
  characterSet: z.string().optional(),
  width: z.number().optional(),
});

export class PrinterController {
  constructor(private readonly repo: PrinterRepository) {}

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await printerService.checkStatus();
      const { config } = this.repo.getConfig();
      res.json({ data: { status, config }, error: null });
    } catch (err) {
      next(err);
    }
  };

  detectPorts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ports = await printerService.detectPorts();
      res.json({ data: { ports }, error: null });
    } catch (err) {
      next(err);
    }
  };

  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = printerConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Configuración inválida');
      }
      const result = await printerService.connect(parsed.data);
      if (result.success) {
        this.repo.saveConfig(parsed.data, true);
      }
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  };

  testPrint = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await printerService.testPrint();
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  };

  disconnect = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      printerService.disconnect();
      res.json({ data: { success: true }, error: null });
    } catch (err) {
      next(err);
    }
  };

  printTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = saleTicketDataSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos del ticket inválidos');
      }
      const result = await printerService.printSaleTicket(parsed.data);
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  };

  saveConfig = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = printerConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Configuración inválida');
      }
      this.repo.saveConfig(parsed.data, false);
      res.json({ data: { success: true }, error: null });
    } catch (err) {
      next(err);
    }
  };
}
