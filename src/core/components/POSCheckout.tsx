import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useCart } from '@/core/hooks/useCart';
import { usePOS } from '@/core/hooks/usePOS';
import { POSDiscountSection } from './POSDiscountSection';
import { POSPaymentMethods } from './POSPaymentMethods';
import { POSReceiptModal } from './POSReceiptModal';
import { formatCurrency } from '@/lib/utils/pricing';
import { customersApi } from '@/lib/api/customers';
import type { SaleWithItems, StockSummary, Customer } from '@shared/types';

// Fuera del componente para evitar re-mount en cada render
function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{children}</p>;
}

interface POSCheckoutProps {
  businessUnitId: number;
  stockData: Record<number, StockSummary>;
  onSaleComplete: () => void;
}

export function POSCheckout({ businessUnitId, stockData, onSaleComplete }: POSCheckoutProps) {
  const { cart, totals, paymentMethods, discountPercent, discountAmount, setDiscountPercent, setDiscountAmount, clearCart } = useCart();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const { confirmSale, isProcessing, error } = usePOS(businessUnitId, selectedCustomerId);
  const [completedSale, setCompletedSale] = useState<SaleWithItems | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Clientes ────────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;

  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => {});
  }, []);

  const filteredCustomers = customerSearch
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.document ?? '').includes(customerSearch),
      )
    : customers.slice(0, 8);

  // ── Stock ────────────────────────────────────────────────────────────────────
  const stockIssues = cart.filter((item) => {
    const available = stockData[item.productId]?.currentQuantity;
    return available !== undefined && item.quantity > available;
  });
  const hasStockIssues = stockIssues.length > 0;

  // ── Validación confirmación ──────────────────────────────────────────────────
  const totalPaid = paymentMethods.reduce((s, p) => s + p.amount, 0);
  const canConfirm =
    cart.length > 0 &&
    paymentMethods.length > 0 &&
    totalPaid >= totals.totalAmount - 1 &&
    !isProcessing &&
    !hasStockIssues;

  // Motivo de deshabilitación del botón
  let disabledReason: string | null = null;
  if (cart.length === 0) disabledReason = 'Agregá productos al carrito';
  else if (hasStockIssues) disabledReason = 'Hay productos sin stock suficiente';
  else if (paymentMethods.length === 0) disabledReason = 'Seleccioná un medio de pago';
  else if (totalPaid < totals.totalAmount - 1)
    disabledReason = `Falta cubrir ${formatCurrency(totals.totalAmount - totalPaid)}`;

  const handleConfirm = useCallback(async () => {
    const result = await confirmSale();
    if (result) {
      setCompletedSale(result);
      setSelectedCustomerId(undefined);
      setCustomerSearch('');
      onSaleComplete();
    }
  }, [confirmSale, onSaleComplete]);

  // Shortcuts globales: Enter → confirmar, Esc → vaciar carrito
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignorar si el foco está en un input/textarea/select (el usuario está escribiendo)
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Enter' && !isEditable) {
        if (canConfirm) {
          e.preventDefault();
          void handleConfirm();
        }
      }

      if (e.key === 'Escape' && !isEditable) {
        if (cart.length > 0) {
          e.preventDefault();
          setConfirmClear(true);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canConfirm, cart.length, handleConfirm, clearCart]);

  // ── Label del descuento activo ───────────────────────────────────────────────
  const hasDiscount = discountPercent > 0 || discountAmount > 0;
  const discountLabel = discountPercent > 0
    ? `${discountPercent}% porcentual`
    : `$${discountAmount.toFixed(2)} fijo`;

  // ── Total de unidades ───────────────────────────────────────────────────────
  const totalUnits = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <>
      {/* Columna derecha: flex-col, overflow-hidden, NO scroll externo */}
      <div className="flex flex-col h-full overflow-hidden">

        {/* Título */}
        <div className="shrink-0 px-3 pt-2 pb-1 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Resumen de la venta</p>
        </div>

        {/* ── CLIENTE ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 py-1.5 border-b border-gray-100">
          <SectionLabel>Cliente</SectionLabel>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-2 py-1">
              <div>
                <p style={{ fontSize: 13 }} className="font-medium text-blue-800 leading-tight">{selectedCustomer.name}</p>
                {(selectedCustomer.document || selectedCustomer.creditLimit > 0) && (
                  <p style={{ fontSize: 11 }} className="text-blue-500">
                    {selectedCustomer.document && `${selectedCustomer.documentType} ${selectedCustomer.document}`}
                    {selectedCustomer.creditLimit > 0 && ` · Crédito: ${formatCurrency(selectedCustomer.creditLimit - selectedCustomer.creditUsed)}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setSelectedCustomerId(undefined); setShowCustomerSearch(false); }}
                className="text-blue-400 hover:text-blue-600 text-lg leading-none ml-1"
              >×</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                onFocus={() => setShowCustomerSearch(true)}
                onBlur={() => setTimeout(() => setShowCustomerSearch(false), 150)}
                placeholder="Consumidor final (opcional)"
                style={{ height: 28, fontSize: 12 }}
                className="w-full border border-gray-300 rounded px-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {showCustomerSearch && (
                <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-36 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-gray-400">Sin resultados</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => { setSelectedCustomerId(c.id); setCustomerSearch(''); setShowCustomerSearch(false); }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-800">{c.name}</span>
                        {c.document && <span className="text-gray-400">{c.document}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SUBTOTALES ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 py-1.5 border-b border-gray-100" style={{ fontSize: 12, lineHeight: 1.4 }}>
          <div className="flex justify-between text-gray-600">
            <span>Productos</span>
            <span>{totalUnits} {totalUnits === 1 ? 'ud.' : 'uds.'}</span>
          </div>
          <div className="flex justify-between text-gray-600 mt-0.5">
            <span>Subtotal (c/ IVA)</span>
            <span className="font-medium text-gray-800">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-amber-700 mt-0.5">
              <span>Descuento</span>
              <span>−{formatCurrency(totals.discountAmount)}</span>
            </div>
          )}
        </div>

        {/* ── TOTAL A PAGAR ────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 py-1.5 bg-blue-50 border-y-2 border-blue-400 flex items-center justify-between">
          <span style={{ fontSize: 11 }} className="font-semibold text-blue-700 uppercase tracking-wide">Total a pagar</span>
          <span style={{ fontSize: 20 }} className="font-bold text-blue-800 tabular-nums">
            {formatCurrency(totals.totalAmount)}
          </span>
        </div>

        {/* ── DESGLOSE FISCAL (colapsable) ─────────────────────────────────── */}
        {cart.length > 0 && (
          <details className="shrink-0 px-3 py-1 border-b border-gray-100 group" style={{ fontSize: 11 }}>
            <summary className="cursor-pointer select-none list-none flex items-center gap-1 text-gray-400 hover:text-gray-600">
              <span className="group-open:rotate-90 inline-block transition-transform duration-150">▶</span>
              Desglose fiscal (ref.)
            </summary>
            <div className="mt-1 pl-3 border-l-2 border-gray-100 space-y-0.5 text-gray-500">
              <div className="flex justify-between"><span>Sin IVA</span><span className="tabular-nums">{formatCurrency(totals.taxableAmount)}</span></div>
              <div className="flex justify-between"><span>IVA {cart[0]?.taxRate ?? 21}%</span><span className="tabular-nums">{formatCurrency(totals.taxAmount)}</span></div>
            </div>
          </details>
        )}

        {/* ── DESCUENTO ────────────────────────────────────────────────────── */}
        {cart.length > 0 && (
          <div className="shrink-0 px-3 py-1.5 border-b border-gray-100">
            <SectionLabel>Descuento</SectionLabel>
            <POSDiscountSection />
            {hasDiscount && (
              <p style={{ fontSize: 11 }} className="text-green-600 mt-1 flex items-center gap-1">
                <span>{discountLabel} · −{formatCurrency(totals.discountAmount)}</span>
                <button
                  onClick={() => { setDiscountPercent(0); setDiscountAmount(0); }}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                  title="Quitar descuento"
                >×</button>
              </p>
            )}
          </div>
        )}

        {/* ── STOCK ISSUES ─────────────────────────────────────────────────── */}
        {hasStockIssues && (
          <div className="shrink-0 px-3 py-1.5 border-b border-gray-100 text-red-600 bg-red-50" style={{ fontSize: 11 }}>
            <p className="font-semibold">⚠ Stock insuficiente:</p>
            {stockIssues.map((item) => {
              const available = stockData[item.productId]?.currentQuantity ?? 0;
              return <p key={item.productId}>• {item.name}: pedís {item.quantity}, disp. {available}</p>;
            })}
          </div>
        )}

        {/* ── MEDIOS DE PAGO (flex-1, ocupa el espacio restante) ───────────── */}
        <div className="flex-1 min-h-0 overflow-hidden px-3 py-1.5 border-b border-gray-100">
          <SectionLabel>Medios de pago</SectionLabel>
          <POSPaymentMethods />
        </div>

        {/* ── ERROR GENERAL ────────────────────────────────────────────────── */}
        {error && !hasStockIssues && (
          <p style={{ fontSize: 11 }} className="shrink-0 text-red-500 bg-red-50 border border-red-200 rounded mx-3 my-1 px-2 py-1">
            {error}
          </p>
        )}

        {/* ── BOTÓN CONFIRMAR ──────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pt-1.5 pb-1">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{ fontSize: 14, padding: '10px 0' }}
            className={`w-full rounded-lg font-bold transition-all shadow-sm ${
              canConfirm
                ? 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.99]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>Procesando...
              </span>
            ) : canConfirm ? (
              `✓ Confirmar — ${formatCurrency(totals.totalAmount)}`
            ) : (
              '✓ Confirmar venta'
            )}
          </button>

          {disabledReason && !isProcessing && (
            <p style={{ fontSize: 11 }} className="text-center text-gray-400 mt-1">{disabledReason}</p>
          )}
        </div>

        {/* ── HINT DE TECLADO ──────────────────────────────────────────────── */}
        <div className="shrink-0 pb-1.5 text-center" style={{ fontSize: 10 }}>
          <span className="text-gray-300">Enter confirmar · Esc cancelar · F2 buscar</span>
        </div>

      </div>

      {/* Mini-modal confirmación vaciar carrito (reemplaza window.confirm) */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-xs w-full mx-4">
            <p className="text-sm font-medium text-gray-800 mb-4">¿Vaciar el carrito?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearCart();
                  setSelectedCustomerId(undefined);
                  setCustomerSearch('');
                  setConfirmClear(false);
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}

      {completedSale && (
        <POSReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </>
  );
}
