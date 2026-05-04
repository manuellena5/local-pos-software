import { useAppStore } from '@/core/store/appStore';
import { formatCurrency } from '@/lib/utils/pricing';
import type { SaleWithItems } from '@shared/types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia',
  modo: 'Modo / Ualá',
};

interface POSReceiptModalProps {
  sale: SaleWithItems;
  onClose: () => void;
}

export function POSReceiptModal({ sale, onClose }: POSReceiptModalProps) {
  const config = useAppStore((s) => s.config);
  const activeBU = useAppStore((s) => s.activeBU);
  const { sale: s, items } = sale;

  const fecha = new Date(s.createdAt).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* Contenido del ticket (imprimible) */}
        <div id="receipt" className="p-6 font-mono text-sm">
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
              <p className="text-red-500">⚠ Error de facturación AFIP</p>
            ) : (
              <p className="text-yellow-600">🕐 Factura pendiente de emisión</p>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 mt-4">
            ¡Gracias por su compra!
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 px-6 pb-4">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Imprimir
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
