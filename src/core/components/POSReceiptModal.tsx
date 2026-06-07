import { useState } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { formatCurrency } from '@/lib/utils/pricing';
import { printerApi } from '@/lib/api/printer';
import type { SaleWithItems, SaleTicketData, Customer } from '@shared/types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia',
  modo: 'Modo / Ualá',
};

interface POSReceiptModalProps {
  sale: SaleWithItems;
  customer?: Customer | null;
  onClose: () => void;
}

function buildFiscalCondition(customer: Customer | null | undefined): string {
  if (!customer) return 'CONSUMIDOR FINAL';
  return `CONSUMIDOR FINAL - ${customer.name}`;
}

function buildCustomerDocFields(
  customer: Customer | null | undefined,
): { customerDocType?: number; customerDoc?: number } {
  if (!customer || !customer.document) return { customerDocType: 99, customerDoc: 0 };
  const docNum = parseInt(customer.document.replace(/[-.\s]/g, ''), 10);
  if (isNaN(docNum)) return { customerDocType: 99, customerDoc: 0 };
  if (customer.documentType === 'CUIT') return { customerDocType: 80, customerDoc: docNum };
  if (customer.documentType === 'DNI') return { customerDocType: 96, customerDoc: docNum };
  return { customerDocType: 99, customerDoc: 0 };
}

export function buildTicketData(
  sale: SaleWithItems,
  config: ReturnType<typeof useAppStore.getState>['config'],
  activeBU: ReturnType<typeof useAppStore.getState>['activeBU'],
  customer: Customer | null | undefined,
): SaleTicketData {
  const { sale: s, items } = sale;
  // createdAt viene de SQLite datetime('now') que devuelve UTC sin 'Z'.
  // Sin el sufijo, JS lo interpreta como hora local → 3h de más en Argentina.
  const raw = s.createdAt;
  const utcStr = raw.includes('Z') || raw.includes('+') ? raw : raw.replace(' ', 'T') + 'Z';
  const dateObj = new Date(utcStr);
  const date = dateObj.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = dateObj.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalPaid = s.paymentMethods.reduce((acc, p) => acc + p.amount, 0);
  const change = totalPaid > s.totalAmount
    ? Math.round((totalPaid - s.totalAmount) * 100) / 100
    : undefined;

  return {
    saleNumber: String(s.saleNumber).padStart(4, '0'),
    date,
    time,
    businessName: config?.businessName ?? 'LocalPos',
    businessAddress: (() => {
      const street = config?.addressStreet ?? '';
      const city = config?.addressCity ?? '';
      const parts = [street, city].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : (config?.address ?? '');
    })(),
    cuit: config?.cuit ?? '',
    ingBrutos: config?.ingBrutos || undefined,
    businessFiscalCondition: config?.fiscalCondition === 'responsable_inscripto'
      ? 'Responsable Inscripto'
      : 'Monotributista',
    businessUnitName: activeBU?.name ?? '',
    fiscalCondition: buildFiscalCondition(customer),
    ...buildCustomerDocFields(customer),
    items: items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.lineTotal,
      itemDiscount: item.discountPercent > 0 ? item.discountPercent : undefined,
    })),
    subtotalBeforeDiscount: s.discountAmount > 0 ? s.subtotal : undefined,
    globalDiscount: s.discountPercent > 0 ? s.discountPercent : undefined,
    globalDiscountAmount: s.discountAmount > 0 ? s.discountAmount : undefined,
    total: s.totalAmount,
    payments: s.paymentMethods.map((p) => ({
      method: METHOD_LABELS[p.method] ?? p.method,
      amount: p.amount,
    })),
    change,
    cae: s.cae ?? undefined,
    caeVto: s.caeExpiration ?? undefined,
    invoiceNumber: s.invoiceNumber ?? undefined,
  };
}

export function POSReceiptModal({ sale, customer, onClose }: POSReceiptModalProps) {
  const config = useAppStore((s) => s.config);
  const activeBU = useAppStore((s) => s.activeBU);
  const printerStatus = useAppStore((s) => s.printerStatus);
  const { sale: s, items } = sale;
  const [isPrinting, setIsPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<'success' | 'error' | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const fecha = new Date(s.createdAt).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  async function handlePrint() {
    if (printerStatus !== 'connected') return;
    setIsPrinting(true);
    setPrintResult(null);
    setPrintError(null);
    try {
      const ticketData = buildTicketData(sale, config, activeBU, customer);
      const result = await printerApi.printTicket(ticketData);
      if (result.success) {
        setPrintResult('success');
      } else {
        setPrintResult('error');
        setPrintError(result.error ?? 'Error al imprimir.');
      }
    } catch {
      setPrintResult('error');
      setPrintError('No se pudo conectar con el servicio de impresión.');
    } finally {
      setIsPrinting(false);
    }
  }

  const printerDisconnected = printerStatus !== 'connected';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* Contenido del ticket */}
        <div className="p-6 font-mono text-sm">
          {/* Encabezado */}
          <div className="text-center mb-4">
            <p className="text-base font-bold">{config?.businessName ?? 'LocalPos'}</p>
            {config?.address && (
              <p className="text-xs text-gray-500">{config.address}</p>
            )}
            {config?.cuit && (
              <p className="text-xs text-gray-500">CUIT: {config.cuit}</p>
            )}
            {activeBU && (
              <p className="text-xs text-gray-400 mt-1">{activeBU.name}</p>
            )}
          </div>

          <div className="border-t border-dashed border-gray-300 my-2" />

          {/* Número y fecha */}
          <div className="flex justify-between text-xs text-gray-500 mb-3">
            <span>Venta #{String(s.saleNumber).padStart(3, '0')}</span>
            <span>{fecha}</span>
          </div>

          {/* Ítems */}
          <div className="space-y-1 mb-3">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <span className="flex-1 truncate text-gray-800">
                    {item.quantity}x {item.productName}
                  </span>
                  <span>{formatCurrency(item.lineTotal)}</span>
                </div>
                <div className="text-xs text-gray-400 pl-4">
                  {formatCurrency(item.unitPrice)} c/u
                  {item.discountPercent > 0 && ` · desc ${item.discountPercent}%`}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 my-2" />

          {/* Total */}
          <div className="space-y-0.5 text-xs">
            {s.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>−{formatCurrency(s.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-sm border-t pt-1 mt-1">
              <span>TOTAL</span>
              <span>{formatCurrency(s.totalAmount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 my-2" />

          {/* Desglose fiscal */}
          <div className="space-y-0.5 text-xs">
            <p className="text-gray-400 uppercase tracking-wide text-center mb-1">Desglose fiscal</p>
            <div className="flex justify-between text-gray-600">
              <span>Sin IVA</span>
              <span>{formatCurrency(s.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA {s.taxRate}% (incl)</span>
              <span>{formatCurrency(s.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-700 font-medium border-t pt-0.5 mt-0.5">
              <span>TOTAL</span>
              <span>{formatCurrency(s.totalAmount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 my-2" />

          {/* Medios de pago */}
          <div className="text-xs text-gray-600 space-y-0.5">
            {s.paymentMethods.map((p) => (
              <div key={p.method} className="flex justify-between">
                <span>{METHOD_LABELS[p.method] ?? p.method}</span>
                <span>${p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Factura electrónica AFIP */}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="text-xs text-center space-y-0.5">
            {s.invoiceStatus === 'issued' && s.cae ? (
              <>
                <p className="font-medium text-gray-700">
                  {s.invoiceNumber ?? 'Factura emitida'}
                </p>
                <p className="text-gray-500">CAE: {s.cae}</p>
                {s.caeExpiration && (
                  <p className="text-gray-400">Vto CAE: {s.caeExpiration}</p>
                )}
              </>
            ) : s.invoiceStatus === 'failed' || s.invoiceStatus === 'error' ? (
              <p className="text-red-500">Error de facturacion AFIP</p>
            ) : (
              <p className="text-yellow-600">Factura pendiente de emision</p>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 mt-4">
            Gracias por su compra!
          </div>
        </div>

        {/* Feedback de impresión */}
        {printerDisconnected && (
          <p className="text-xs text-red-500 text-center px-6 pb-2">
            Impresora no conectada. Verificá la conexión en Configuración.
          </p>
        )}
        {printResult === 'success' && (
          <p className="text-xs text-green-600 text-center px-6 pb-2">Impreso correctamente.</p>
        )}
        {printResult === 'error' && printError && (
          <p className="text-xs text-red-500 text-center px-6 pb-2">{printError}</p>
        )}

        {/* Botones */}
        <div className="flex gap-2 px-6 pb-4">
          <button
            onClick={handlePrint}
            disabled={printerDisconnected || isPrinting}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
