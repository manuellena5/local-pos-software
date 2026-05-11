import { useState, useEffect, useCallback } from 'react';
import { useCart } from '@/core/hooks/useCart';
import { usePOS } from '@/core/hooks/usePOS';
import { POSDiscountSection } from './POSDiscountSection';
import { POSPaymentMethods } from './POSPaymentMethods';
import { POSReceiptModal } from './POSReceiptModal';
import { formatCurrency } from '@/lib/utils/pricing';
import { customersApi } from '@/lib/api/customers';
import type { SaleWithItems, StockSummary, Customer } from '@shared/types';

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
          if (window.confirm('¿Vaciar el carrito?')) {
            clearCart();
            setSelectedCustomerId(undefined);
            setCustomerSearch('');
          }
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
      <div className="flex flex-col gap-4">

        {/* ── CLIENTE ──────────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Cliente
          </h3>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-blue-800">{selectedCustomer.name}</p>
                {selectedCustomer.document && (
                  <p className="text-xs text-blue-500">{selectedCustomer.documentType} {selectedCustomer.document}</p>
                )}
                {selectedCustomer.creditLimit > 0 && (
                  <p className="text-xs text-blue-400">
                    Crédito disp: {formatCurrency(selectedCustomer.creditLimit - selectedCustomer.creditUsed)}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setSelectedCustomerId(undefined); setShowCustomerSearch(false); }}
                className="text-blue-400 hover:text-blue-600 text-xl leading-none ml-2"
              >
                ×
              </button>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {showCustomerSearch && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch('');
                          setShowCustomerSearch(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-800">{c.name}</span>
                        {c.document && (
                          <span className="text-xs text-gray-400">{c.document}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── RESUMEN / TOTAL ──────────────────────────────────────────────── */}
        <section>
          <div className="space-y-1 text-sm text-gray-600 mb-3">
            <div className="flex justify-between">
              <span>Productos</span>
              <span>{totalUnits} {totalUnits === 1 ? 'ud.' : 'uds.'}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal (c/ IVA)</span>
              <span className="font-medium text-gray-800">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Descuento</span>
                <span>−{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
          </div>

          {/* ── DESCUENTO — solo visible cuando hay ítems en el carrito ─── */}
          {cart.length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Descuento
              </h3>
              <POSDiscountSection />

              {/* Badge del descuento activo */}
              {hasDiscount && (
                <div className="flex items-center justify-between mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">{discountLabel}</p>
                    <p className="text-sm font-bold text-amber-800">
                      −{formatCurrency(totals.discountAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setDiscountPercent(0); setDiscountAmount(0); }}
                    className="text-amber-400 hover:text-amber-600 text-xl leading-none ml-2"
                    title="Quitar descuento"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Total a pagar — prominente */}
          <div className="bg-blue-50 border-2 border-blue-400 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-700">TOTAL A PAGAR</span>
            <span className="text-3xl font-bold text-blue-800 tabular-nums">
              {formatCurrency(totals.totalAmount)}
            </span>
          </div>

          {/* Desglose fiscal colapsable */}
          {cart.length > 0 && (
            <details className="mt-2 text-xs text-gray-500 group">
              <summary className="cursor-pointer select-none list-none flex items-center gap-1 hover:text-gray-700 transition-colors">
                <span className="group-open:rotate-90 inline-block transition-transform duration-150">▶</span>
                <span>Desglose fiscal (ref.)</span>
              </summary>
              <div className="mt-2 pl-4 space-y-1 border-l-2 border-gray-100">
                <div className="flex justify-between">
                  <span>Sin IVA</span>
                  <span className="tabular-nums">{formatCurrency(totals.taxableAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA {cart[0]?.taxRate ?? 21}% (incluido)</span>
                  <span className="tabular-nums">{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-600 border-t pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(totals.totalAmount)}</span>
                </div>
              </div>
            </details>
          )}
        </section>

        {/* ── STOCK ISSUES ─────────────────────────────────────────────────── */}
        {hasStockIssues && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
            <p className="font-semibold">⚠ Stock insuficiente:</p>
            {stockIssues.map((item) => {
              const available = stockData[item.productId]?.currentQuantity ?? 0;
              return (
                <p key={item.productId} className="text-xs">
                  • {item.name}: pedís {item.quantity}, disponible {available}
                </p>
              );
            })}
          </div>
        )}

        {/* ── MEDIOS DE PAGO ───────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Medios de pago
          </h3>
          <POSPaymentMethods />
        </section>

        {/* ── ERROR GENERAL ────────────────────────────────────────────────── */}
        {error && !hasStockIssues && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* ── BOTÓN CONFIRMAR ──────────────────────────────────────────────── */}
        <section>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-sm ${
              canConfirm
                ? 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.99]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin text-xl">⏳</span>
                Procesando...
              </span>
            ) : canConfirm ? (
              <span>✓ Confirmar — {formatCurrency(totals.totalAmount)}</span>
            ) : (
              '✓ Confirmar venta'
            )}
          </button>

          {disabledReason && !isProcessing && (
            <p className="text-sm text-center text-gray-500 font-medium mt-2">{disabledReason}</p>
          )}
        </section>
      </div>

      {completedSale && (
        <POSReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </>
  );
}
