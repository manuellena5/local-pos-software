import { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils/pricing';
import type { CartItem, PaymentMethod, Customer, PrinterStatus } from '@shared/types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia',
  modo: 'Modo / Ualá',
};

interface CartTotals {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  discountPercent?: number;
}

export interface ConfirmResult {
  saleError?: string;
  printError?: string;
}

interface POSSaleConfirmModalProps {
  cart: CartItem[];
  customer: Customer | null;
  paymentMethods: PaymentMethod[];
  totals: CartTotals;
  printerStatus: PrinterStatus;
  /** Ejecuta la venta y opcionalmente imprime. Resuelve con errores si los hay. */
  onConfirm: (shouldPrint: boolean) => Promise<ConfirmResult>;
  /** Cierra el modal sin hacer nada — el carrito queda intacto */
  onCancel: () => void;
}

type Phase = 'idle' | 'processing' | 'print-error' | 'sale-error';

export function POSSaleConfirmModal({
  cart,
  customer,
  paymentMethods,
  totals,
  printerStatus,
  onConfirm,
  onCancel,
}: POSSaleConfirmModalProps) {
  const printerConnected = printerStatus === 'connected';
  const [shouldPrint, setShouldPrint] = useState(printerConnected);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Sincroniza el checkbox si cambia el estado de la impresora (p.ej. se conectó)
  useEffect(() => {
    if (printerConnected && phase === 'idle') setShouldPrint(true);
  }, [printerConnected, phase]);

  // Enter = confirmar, Esc = cancelar (solo en fase idle)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== 'idle') return;
      if (e.key === 'Enter') { e.preventDefault(); void handleConfirm(); }
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, shouldPrint]);

  async function handleConfirm() {
    setPhase('processing');
    setErrorMsg(null);
    const result = await onConfirm(shouldPrint);
    if (result.saleError) {
      setErrorMsg(result.saleError);
      setPhase('sale-error');
    } else if (result.printError) {
      setErrorMsg(result.printError);
      setPhase('print-error');
    }
    // Si no hay errores, el padre cierra el modal vía onConfirm resolviendo sin error
  }

  const totalPaid = paymentMethods.reduce((s, p) => s + p.amount, 0);
  const change = Math.max(0, totalPaid - totals.totalAmount);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Confirmar venta</h2>
          <p className="text-xs text-gray-400 mt-0.5">Revisá el resumen antes de confirmar</p>
        </div>

        {/* Body scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">

          {/* Cliente */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
            <p className="text-sm text-gray-800">
              {customer ? customer.name : 'Consumidor final'}
            </p>
          </div>

          {/* Ítems */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Ítems ({cart.reduce((s, i) => s + i.quantity, 0)} uds.)
            </p>
            <div className="space-y-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1 pr-2">
                    {item.quantity}× {item.name}
                    {item.discountPercent > 0 && (
                      <span className="text-amber-600 ml-1">−{item.discountPercent}%</span>
                    )}
                  </span>
                  <span className="text-gray-900 font-medium tabular-nums flex-shrink-0">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="border-t border-gray-100 pt-2 space-y-1">
            {totals.discountAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-amber-700">
                  <span>Descuento</span>
                  <span className="tabular-nums">−{formatCurrency(totals.discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-gray-900">
              <span>TOTAL</span>
              <span className="tabular-nums text-base">{formatCurrency(totals.totalAmount)}</span>
            </div>
          </div>

          {/* Medios de pago */}
          <div className="border-t border-gray-100 pt-2 space-y-1">
            {paymentMethods.map((pm) => (
              <div key={pm.method} className="flex justify-between text-sm text-gray-700">
                <span>{METHOD_LABELS[pm.method] ?? pm.method}</span>
                <span className="tabular-nums">{formatCurrency(pm.amount)}</span>
              </div>
            ))}
            {change > 0.005 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Vuelto</span>
                <span className="tabular-nums">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          {/* Checkbox imprimir */}
          <div className="border-t border-gray-100 pt-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shouldPrint}
                onChange={(e) => setShouldPrint(e.target.checked)}
                disabled={phase === 'processing'}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Imprimir ticket</span>
              {!printerConnected && (
                <span className="text-xs text-amber-600">(impresora desconectada)</span>
              )}
            </label>
          </div>

          {/* Error de venta */}
          {phase === 'sale-error' && errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-red-700">Error al registrar la venta</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
            </div>
          )}

          {/* Error de impresión */}
          {phase === 'print-error' && errorMsg && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-amber-800">✓ Venta registrada</p>
              <p className="text-xs text-amber-700 mt-0.5">
                No se pudo imprimir el ticket: {errorMsg}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Podés reimprimir desde la pantalla de ventas.
              </p>
            </div>
          )}

        </div>

        {/* Footer con botones */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          {phase === 'print-error' ? (
            // Venta ya confirmada pero falló la impresión → solo Cerrar
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-700"
            >
              Cerrar
            </button>
          ) : phase === 'sale-error' ? (
            // Error de venta → Reintentar y Cancelar
            <>
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setPhase('idle'); setErrorMsg(null); }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
              >
                Reintentar
              </button>
            </>
          ) : (
            // Estado normal: Cancelar y Confirmar
            <>
              <button
                onClick={onCancel}
                disabled={phase === 'processing'}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => void handleConfirm()}
                disabled={phase === 'processing'}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {phase === 'processing' ? (
                  <>
                    <span className="animate-spin text-base">⏳</span>
                    Procesando...
                  </>
                ) : (
                  `✓ Confirmar — ${formatCurrency(totals.totalAmount)}`
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
