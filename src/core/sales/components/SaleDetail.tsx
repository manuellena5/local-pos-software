import { useState } from 'react';
import { salesApi } from '@/lib/api/sales';
import { formatDateTime as fmtDateTime } from '@/lib/utils/dateFormat';
import { CancelSaleModal } from './CancelSaleModal';
import { useSaleDetail } from '../hooks/useSaleDetail';
import { useAppStore } from '@/core/store/appStore';
import type { Sale } from '@shared/types';
import type { CancelSaleResponse } from '@/lib/api/sales';

interface Props {
  sale: Sale;
  businessUnitId: number;
  onSaleUpdated: (updated: Sale) => void;
}

function fmtMoney(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  issued: 'Emitida',
  error: 'Error AFIP',
  failed: 'Fallida',
};

const INVOICE_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  issued: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  modo: 'Modo/Ualá',
  other: 'Otro',
};

function paymentLabel(method: string): string {
  return PAYMENT_METHOD_LABEL[method.toLowerCase()] ?? method;
}

export function SaleDetail({ sale, businessUnitId, onSaleUpdated }: Props) {
  const { detail, loading } = useSaleDetail(sale.id, businessUnitId);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reprinting, setReprinting] = useState(false);
  const [reprintMsg, setReprintMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<CancelSaleResponse | null>(null);
  const printerStatus = useAppStore((s) => s.printerStatus);

  async function handleReprint() {
    setReprintMsg(null);

    if (printerStatus !== 'connected') {
      setReprintMsg({ text: 'Impresora no disponible. Verificá la conexión en Configuración.', ok: false });
      return;
    }

    setReprinting(true);
    try {
      const result = await salesApi.reprint(sale.id, businessUnitId);
      if (result.success) {
        setReprintMsg({ text: 'Ticket enviado a la impresora.', ok: true });
      } else {
        setReprintMsg({ text: result.error ?? 'No se pudo imprimir. Verificá la impresora.', ok: false });
      }
    } catch {
      setReprintMsg({ text: 'No se pudo reimprimir. Verificá la impresora.', ok: false });
    } finally {
      setReprinting(false);
    }
  }

  function handleCancelled(response: CancelSaleResponse) {
    setShowCancelModal(false);
    setCancelSuccess(response);
    onSaleUpdated(response.sale.sale);
  }

  const items = detail?.items ?? [];
  const isCompleted = sale.status === 'completed';
  const hasCae = sale.invoiceStatus === 'issued' && sale.cae !== null;
  const paid = sale.paymentMethods.reduce((s, p) => s + p.amount, 0);
  const change = Math.max(0, paid - sale.totalAmount);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showCancelModal && (
        <CancelSaleModal
          saleId={sale.id}
          saleNumber={sale.saleNumber}
          businessUnitId={businessUnitId}
          onCancelled={handleCancelled}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {/* Header */}
      <div className="shrink-0 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Venta #{sale.saleNumber}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{fmtDateTime(sale.createdAt)}</p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
              isCompleted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}
          >
            {isCompleted ? 'Completada' : 'Anulada'}
          </span>
        </div>

        {!isCompleted && sale.cancellationReason && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs text-red-700 font-medium">Motivo de anulación:</p>
            <p className="text-xs text-red-600 mt-0.5">{sale.cancellationReason}</p>
            {sale.cancelledAt && (
              <p className="text-xs text-red-400 mt-1">{fmtDateTime(sale.cancelledAt)}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 mt-4 pb-4">
        {/* Aviso post-anulación con factura */}
        {cancelSuccess?.hasInvoice && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5">
            <p className="text-xs text-amber-800 font-semibold">⚠ Esta venta tenía CAE emitido</p>
            <p className="text-xs text-amber-700 mt-1">
              Recordá emitir la nota de crédito correspondiente en AFIP (comprobante {sale.invoiceNumber}).
            </p>
          </div>
        )}

        {/* Cliente */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Cliente
          </p>
          <p className="text-sm text-gray-800">
            {sale.customerId ? `Cliente #${sale.customerId}` : 'Consumidor final'}
          </p>
        </section>

        {/* Ítems */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Ítems
          </p>
          {loading ? (
            <p className="text-xs text-gray-400">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-400">Sin ítems</p>
          ) : (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 py-1.5 px-3">Producto</th>
                    <th className="text-right font-medium text-gray-500 py-1.5 px-3">Cant.</th>
                    <th className="text-right font-medium text-gray-500 py-1.5 px-3">P. unit.</th>
                    <th className="text-right font-medium text-gray-500 py-1.5 px-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-2 px-3 text-gray-800">
                        {item.productName}
                        {item.discountPercent > 0 && (
                          <span className="ml-1 text-amber-600">−{item.discountPercent}%</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-2 px-3 text-right text-gray-600">
                        {fmtMoney(item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-800">
                        {fmtMoney(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200">
                  {sale.discountAmount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1.5 px-3 text-gray-500">
                        Subtotal
                      </td>
                      <td className="py-1.5 px-3 text-right text-gray-600">
                        {fmtMoney(sale.subtotal)}
                      </td>
                    </tr>
                  )}
                  {sale.discountAmount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1.5 px-3 text-amber-700">
                        Descuento{sale.discountPercent > 0 ? ` (${sale.discountPercent}%)` : ''}
                      </td>
                      <td className="py-1.5 px-3 text-right text-amber-700">
                        −{fmtMoney(sale.discountAmount)}
                      </td>
                    </tr>
                  )}
                  {sale.roundingAdjustment < 0 && (
                    <tr>
                      <td colSpan={3} className="py-1.5 px-3 text-orange-700">
                        Redondeo (efectivo)
                      </td>
                      <td className="py-1.5 px-3 text-right text-orange-700">
                        −{fmtMoney(sale.roundingAdjustment)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="py-2 px-3 font-semibold text-gray-900">
                      Total
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">
                      {fmtMoney(sale.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Pago */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Pago
          </p>
          <div className="space-y-1">
            {sale.paymentMethods.map((pm, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600">{paymentLabel(pm.method)}</span>
                <span className="font-medium text-gray-800">{fmtMoney(pm.amount)}</span>
              </div>
            ))}
            {change > 0.01 && (
              <div className="flex justify-between text-sm border-t border-gray-100 pt-1 mt-1">
                <span className="text-gray-500">Vuelto</span>
                <span className="text-gray-600">{fmtMoney(change)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Facturación */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Facturación
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Comprobante</span>
              <span className="text-gray-800">
                {sale.invoiceNumber ?? (sale.invoiceStatus === 'pending' ? 'Ticket' : '—')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Estado AFIP</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_STATUS_COLOR[sale.invoiceStatus]}`}
              >
                {INVOICE_STATUS_LABEL[sale.invoiceStatus]}
              </span>
            </div>
            {sale.cae && (
              <div className="flex justify-between">
                <span className="text-gray-500">CAE</span>
                <span className="text-gray-700 font-mono text-xs">{sale.cae}</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Acciones */}
      <div className="shrink-0 border-t border-gray-100 pt-4 space-y-2 bg-white">
        {reprintMsg && (
          <p
            className="text-xs text-center px-2 py-1.5 rounded"
            style={{
              background: reprintMsg.ok ? '#f0fdf4' : '#fef2f2',
              color: reprintMsg.ok ? '#16a34a' : '#dc2626',
            }}
          >
            {reprintMsg.text}
          </p>
        )}
        <button
          onClick={handleReprint}
          disabled={reprinting}
          className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {reprinting ? 'Enviando...' : '🖨 Reimprimir ticket'}
        </button>
        {hasCae && (
          <button
            className="w-full py-2 border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            onClick={() => window.alert('PDF de factura — próximamente (RF-AF-07 Fase 11)')}
          >
            📄 Ver / Descargar factura PDF
          </button>
        )}
        {isCompleted && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-semibold transition-colors"
          >
            Anular venta
          </button>
        )}
      </div>
    </div>
  );
}
