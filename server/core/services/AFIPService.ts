import { getAFIPConfig, getPointOfSale, isMockMode } from '../../config/afip.config';
import { logger } from '../../lib/logger';
import type { AFIPInvoiceRequest, AFIPInvoiceResponse } from '../types';

const CTX = 'AFIPService';

/**
 * Genera un CAE falso con formato AFIP (14 dígitos) para el modo mock.
 */
function mockCAE(): string {
  const digits = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('');
  return digits;
}

/**
 * Genera una fecha de vencimiento de CAE a 10 días desde hoy en formato YYYYMMDD.
 */
function mockCAEExpiration(): string {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Formatea el número de factura en el estilo AFIP: "B-0001-00000001"
 */
function formatInvoiceNumber(type: 'B' | 'C', pointOfSale: number, number: number): string {
  const pos = String(pointOfSale).padStart(4, '0');
  const num = String(number).padStart(8, '0');
  return `${type}-${pos}-${num}`;
}

export class AFIPService {
  /**
   * Solicita un CAE a AFIP (o genera uno mock en desarrollo).
   *
   * Lanza un error si la comunicación falla o AFIP devuelve errores de validación.
   * El llamador es responsable de manejar reintentos y actualizar la DB.
   */
  async requestCAE(req: AFIPInvoiceRequest): Promise<AFIPInvoiceResponse> {
    if (isMockMode()) {
      return this.requestCAEMock(req);
    }
    return this.requestCAEReal(req);
  }

  // ── Mock mode ──────────────────────────────────────────────────────────────

  private async requestCAEMock(req: AFIPInvoiceRequest): Promise<AFIPInvoiceResponse> {
    logger.info(CTX, 'Mock mode — generating fake CAE', { saleId: req.saleId });

    // Simular latencia realista
    await new Promise((resolve) => setTimeout(resolve, 200));

    const cae = mockCAE();
    const caeExpiration = mockCAEExpiration();
    const pos = getPointOfSale();
    // Usamos saleId como número de comprobante en mock
    const invoiceNumber = formatInvoiceNumber(req.invoiceType, pos, req.saleId);

    logger.info(CTX, 'Mock CAE issued', { saleId: req.saleId, cae, invoiceNumber });

    return {
      success: true,
      cae,
      caeExpiration,
      invoiceNumber,
    };
  }

  // ── Real AFIP via @afipsdk/afip.js ──────────────────────────────────────────

  private async requestCAEReal(req: AFIPInvoiceRequest): Promise<AFIPInvoiceResponse> {
    const config = getAFIPConfig();
    const pos = getPointOfSale();

    logger.info(CTX, 'Requesting real CAE from AFIP', {
      saleId: req.saleId,
      invoiceType: req.invoiceType,
      totalAmount: req.totalAmount,
      env: config.environment,
    });

    try {
      // Importación dinámica para evitar que el SDK falle en mock/test
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Afip = require('@afipsdk/afip.js');

      const afip = new Afip({
        CUIT: config.cuit,
        cert: config.certPath,
        key: config.keyPath,
        production: config.environment === 'production',
        res_folder: '.afip-cache',
        ta_folder: '.afip-cache',
      });

      // Determinar tipo numérico de comprobante:
      // 6 = Factura B, 11 = Factura C
      const voucherType = req.invoiceType === 'B' ? 6 : 11;

      // Obtener último número de comprobante
      const lastVoucher = await afip.ElectronicBilling.getLastVoucher(pos, voucherType);
      const nextNumber = lastVoucher + 1;

      const voucherData = {
        'CantReg': 1,
        'PtoVta': pos,
        'CbteTipo': voucherType,
        'Concepto': 1, // Productos
        'DocTipo': 99, // Consumidor final
        'DocNro': 0,
        'CbteDesde': nextNumber,
        'CbteHasta': nextNumber,
        'CbteFch': req.date,
        'ImpTotal': req.totalAmount,
        'ImpTotConc': 0,
        'ImpNeto': req.taxableAmount,
        'ImpOpEx': 0,
        'ImpIVA': req.taxAmount,
        'ImpTrib': 0,
        'MonId': 'PES',
        'MonCotiz': 1,
        'Iva': [
          {
            'Id': req.taxRate === 21 ? 5 : req.taxRate === 10.5 ? 4 : 3,
            'BaseImp': req.taxableAmount,
            'Importe': req.taxAmount,
          },
        ],
      };

      const result = await afip.ElectronicBilling.createVoucher(voucherData);

      const cae: string = result.CAE;
      const caeExpiration: string = result.CAEFchVto;
      const invoiceNumber = formatInvoiceNumber(req.invoiceType, pos, nextNumber);

      logger.info(CTX, 'Real CAE issued', { saleId: req.saleId, cae, invoiceNumber });

      return { success: true, cae, caeExpiration, invoiceNumber };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(CTX, 'AFIP CAE request failed', { saleId: req.saleId, error: message });
      return { success: false, error: message };
    }
  }
}
