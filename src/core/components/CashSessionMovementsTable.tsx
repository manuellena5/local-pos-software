import { useState, useEffect, useMemo, Fragment } from 'react';
import { ChevronDown } from 'lucide-react';
import { salesApi } from '@/lib/api/sales';
import { formatTime, formatDateTime, parseUtcTimestamp } from '@/lib/utils/dateFormat';
import type { CashMovement, CashMovementType, CashPaymentMethodType, SaleListEntry, SaleItem } from '@shared/types';

function fmtMoney(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

function isEgress(type: CashMovementType): boolean {
  return type === 'refund' || type === 'withdrawal';
}

const MOVEMENT_LABEL: Record<CashMovementType, string> = {
  opening: 'Apertura',
  sale: 'Venta',
  refund: 'Anulación',
  deposit: 'Ingreso',
  withdrawal: 'Egreso',
  other: 'Otro',
};

const MOVEMENT_BADGE: Record<CashMovementType, string> = {
  opening: 'bg-gray-100 text-gray-600',
  sale: 'bg-blue-100 text-blue-700',
  refund: 'bg-red-100 text-red-700',
  deposit: 'bg-green-100 text-green-700',
  withdrawal: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-500',
};

const PAYMENT_METHOD_LABEL: Record<CashPaymentMethodType, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
  card: 'Tarjeta',
  other: 'Otro',
};

const PAYMENT_METHOD_BADGE: Record<CashPaymentMethodType, string> = {
  cash: 'bg-emerald-100 text-emerald-700',
  transfer: 'bg-indigo-100 text-indigo-700',
  mercadopago: 'bg-sky-100 text-sky-700',
  card: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-600',
};

/** Movimientos sin medio de pago propio en la UI (apertura y anulaciones) */
function showsPaymentMethod(type: CashMovementType): boolean {
  return type === 'sale' || type === 'withdrawal';
}

type TypeFilter = 'all' | 'sale' | 'withdrawal' | 'refund' | 'opening';

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'sale', label: 'Ventas' },
  { value: 'withdrawal', label: 'Egresos' },
  { value: 'refund', label: 'Anulaciones' },
  { value: 'opening', label: 'Apertura' },
];

function saleDescription(entry: SaleListEntry | undefined, saleNumber: number | null): string {
  const label = saleNumber != null ? `Venta #${saleNumber}` : 'Venta';
  if (!entry || entry.items.length === 0) return label;
  const first = entry.items[0]!;
  const extra = entry.items.length > 1 ? ` + ${entry.items.length - 1} más` : '';
  return `${label} · ${first.productName}${extra} · ${entry.totalItems} art`;
}

interface Props {
  movements: CashMovement[];
  businessUnitId: number;
  cashSessionId: number | null;
  onNavigateToSale?: (saleId: number) => void;
}

export function CashSessionMovementsTable({
  movements,
  businessUnitId,
  cashSessionId,
  onNavigateToSale,
}: Props) {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saleEntries, setSaleEntries] = useState<Map<number, SaleListEntry>>(new Map());
  const [saleItemsCache, setSaleItemsCache] = useState<Record<number, SaleItem[]>>({});
  const [loadingItemsFor, setLoadingItemsFor] = useState<number | null>(null);
  const [reprinting, setReprinting] = useState<number | null>(null);
  const [reprintMsg, setReprintMsg] = useState<{ saleId: number; text: string; ok: boolean } | null>(null);

  // Preview de ítems + cliente de todas las ventas de la sesión, en un solo fetch.
  useEffect(() => {
    if (!cashSessionId) { setSaleEntries(new Map()); return; }
    let cancelled = false;
    salesApi
      .listFiltered(businessUnitId, { cashSessionId })
      .then((entries) => {
        if (cancelled) return;
        setSaleEntries(new Map(entries.map((e) => [e.id, e])));
      })
      .catch(() => { if (!cancelled) setSaleEntries(new Map()); });
    return () => { cancelled = true; };
  }, [businessUnitId, cashSessionId]);

  const balance = movements.reduce((total, m) => (isEgress(m.type) ? total - m.amount : total + m.amount), 0);

  const visibleMovements = useMemo(() => {
    const filtered = typeFilter === 'all' ? movements : movements.filter((m) => m.type === typeFilter);
    return [...filtered].sort((a, b) => {
      const diff = parseUtcTimestamp(a.createdAt).getTime() - parseUtcTimestamp(b.createdAt).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [movements, typeFilter, sortOrder]);

  async function handleToggleExpand(saleId: number) {
    if (expandedId === saleId) { setExpandedId(null); return; }
    setExpandedId(saleId);
    setReprintMsg(null);
    if (!saleItemsCache[saleId]) {
      setLoadingItemsFor(saleId);
      try {
        const detail = await salesApi.get(saleId, businessUnitId);
        setSaleItemsCache((prev) => ({ ...prev, [saleId]: detail.items }));
      } catch {
        setSaleItemsCache((prev) => ({ ...prev, [saleId]: [] }));
      } finally {
        setLoadingItemsFor(null);
      }
    }
  }

  async function handleReprint(saleId: number) {
    setReprinting(saleId);
    setReprintMsg(null);
    try {
      const result = await salesApi.reprint(saleId, businessUnitId);
      setReprintMsg({
        saleId,
        text: result.success ? 'Ticket enviado a la impresora.' : (result.error ?? 'No se pudo imprimir.'),
        ok: result.success,
      });
    } catch {
      setReprintMsg({ saleId, text: 'No se pudo reimprimir. Verificá la impresora.', ok: false });
    } finally {
      setReprinting(null);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Controles de orden y filtro */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                typeFilter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortOrder((v) => (v === 'desc' ? 'asc' : 'desc'))}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
        >
          {sortOrder === 'desc' ? '↓ Recientes primero' : '↑ Antiguos primero'}
        </button>
      </div>

      {visibleMovements.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <p className="text-sm">No hay movimientos para este filtro.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Hora</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Tipo</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Descripción</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Medio</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Monto</th>
                <th className="py-2 px-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {visibleMovements.map((m) => {
                const isSale = m.type === 'sale' && m.saleId != null;
                const entry = m.saleId != null ? saleEntries.get(m.saleId) : undefined;
                const isExpanded = isSale && expandedId === m.saleId;
                const description = isSale ? saleDescription(entry, entry?.saleNumber ?? null) : m.description;

                return (
                  <Fragment key={m.id}>
                    <tr
                      className={`border-b border-gray-50 ${isSale ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      role={isSale ? 'button' : undefined}
                      tabIndex={isSale ? 0 : undefined}
                      aria-expanded={isSale ? isExpanded : undefined}
                      onClick={isSale ? () => void handleToggleExpand(m.saleId!) : undefined}
                      onKeyDown={
                        isSale
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                void handleToggleExpand(m.saleId!);
                              }
                            }
                          : undefined
                      }
                    >
                      <td className="py-2 px-3 text-gray-400 font-mono text-xs">{formatTime(m.createdAt)}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOVEMENT_BADGE[m.type]}`}>
                          {MOVEMENT_LABEL[m.type]}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700">{description}</td>
                      <td className="py-2 px-3">
                        {showsPaymentMethod(m.type) ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_METHOD_BADGE[m.paymentMethod]}`}
                          >
                            {PAYMENT_METHOD_LABEL[m.paymentMethod]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className={`py-2 px-3 text-right font-medium ${isEgress(m.type) ? 'text-red-600' : 'text-green-700'}`}>
                        {isEgress(m.type) ? '−' : '+'}
                        {fmtMoney(m.amount)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isSale && (
                          <ChevronDown
                            size={16}
                            className={`inline-block text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        )}
                      </td>
                    </tr>

                    {isSale && isExpanded && (
                      <tr key={`${m.id}-detail`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-3">
                            {/* Encabezado */}
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  Venta #{entry?.saleNumber ?? '—'} · {formatDateTime(m.createdAt)}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {entry?.customerName
                                    ? `${entry.customerName}${entry.customerDocument ? ` · ${entry.customerDocumentType ?? ''} ${entry.customerDocument}` : ''}`
                                    : 'Consumidor final'}
                                </p>
                              </div>
                            </div>

                            {/* Ítems */}
                            {loadingItemsFor === m.saleId ? (
                              <p className="text-xs text-gray-400">Cargando ítems...</p>
                            ) : (
                              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                      <th className="text-left font-medium text-gray-500 py-1.5 px-3">Producto</th>
                                      <th className="text-right font-medium text-gray-500 py-1.5 px-3">Cant.</th>
                                      <th className="text-right font-medium text-gray-500 py-1.5 px-3">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(saleItemsCache[m.saleId!] ?? []).map((item) => (
                                      <tr key={item.id} className="border-b border-gray-50 last:border-0">
                                        <td className="py-1.5 px-3 text-gray-800">{item.productName}</td>
                                        <td className="py-1.5 px-3 text-right text-gray-600">{item.quantity}</td>
                                        <td className="py-1.5 px-3 text-right font-medium text-gray-800">
                                          {fmtMoney(item.lineTotal)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Medio y total */}
                            <div className="flex items-center justify-between text-sm">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_METHOD_BADGE[m.paymentMethod]}`}
                              >
                                {PAYMENT_METHOD_LABEL[m.paymentMethod]}
                              </span>
                              <span className="font-semibold text-gray-900">Total: {fmtMoney(m.amount)}</span>
                            </div>

                            {reprintMsg?.saleId === m.saleId && (
                              <p className={`text-xs ${reprintMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                                {reprintMsg.text}
                              </p>
                            )}

                            {/* Acciones */}
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); onNavigateToSale?.(m.saleId!); }}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100"
                              >
                                Ver venta
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); void handleReprint(m.saleId!); }}
                                disabled={reprinting === m.saleId}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                              >
                                {reprinting === m.saleId ? 'Enviando...' : 'Comprobante'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={4} className="py-2.5 px-3 text-sm font-semibold text-gray-700">
                  Balance de la sesión
                </td>
                <td colSpan={2} className={`py-2.5 px-3 text-right text-sm font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {balance >= 0 ? '+' : '−'}
                  {fmtMoney(balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
