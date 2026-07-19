import { useEffect, useState } from 'react';
import type { PurchaseHistoryEntry, StockMovement } from '@shared/types';
import { useProductsStore } from '../store/productsStore';
import { productsApi } from '@/lib/api/products';
import { stockApi } from '@/lib/api/stock';
import { formatCurrency } from '@/lib/utils/pricing';
import { getStockMovementLabel } from '@/lib/utils/stockLabels';
import { formatDate } from '@/lib/utils/dateFormat';

interface ProductHistoryDrawerProps {
  businessUnitId: number;
}

type DrawerTab = 'compras' | 'movimientos';

export function ProductHistoryDrawer({ businessUnitId }: ProductHistoryDrawerProps) {
  const productId  = useProductsStore((s) => s.drawerProductId);
  const closeDrawer = useProductsStore((s) => s.closeDrawer);

  const [activeTab, setActiveTab] = useState<DrawerTab>('compras');
  const [purchases, setPurchases] = useState<PurchaseHistoryEntry[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading]    = useState(false);
  const [productName, setProductName] = useState('');

  const isOpen = productId !== null;

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setActiveTab('compras');
    setPurchases([]);
    setMovements([]);

    productsApi.getPurchaseHistory(productId, businessUnitId)
      .then(setPurchases)
      .catch(() => {})
      .finally(() => setLoading(false));

    stockApi.getMovements(productId, businessUnitId)
      .then(setMovements)
      .catch(() => {});

    productsApi.get(productId, businessUnitId)
      .then((p) => setProductName(p.name))
      .catch(() => {});
  }, [productId, businessUnitId]);

  const PURCHASE_EXCLUDE = new Set(['stock_inicial', 'ajuste_variante', 'ajuste_manual', 'anulacion']);

  const visiblePurchases = purchases.filter((p) => !PURCHASE_EXCLUDE.has(p.reason ?? ''));

  function movementBadge(type: string, reason?: string | null): { label: string; cls: string } {
    if (reason === 'stock_inicial' || reason === 'ajuste_variante') return { label: 'Inicial',    cls: 'bg-blue-100 text-blue-700'   };
    if (type === 'sale')                                             return { label: 'Venta',     cls: 'bg-indigo-100 text-indigo-700' };
    if (reason === 'anulacion')                                      return { label: 'Anulación', cls: 'bg-red-100 text-red-700'      };
    if (reason === 'ajuste_manual')                                  return { label: 'Ajuste',    cls: 'bg-orange-100 text-orange-700' };
    if (type === 'entry')                                            return { label: 'Entrada',   cls: 'bg-green-100 text-green-700'  };
    return { label: 'Ajuste', cls: 'bg-orange-100 text-orange-700' };
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={closeDrawer} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <div>
            <div className="font-bold text-gray-900 text-sm">{productName || 'Historial'}</div>
            <div className="text-xs text-gray-400">Compras y movimientos</div>
          </div>
          <button onClick={closeDrawer} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        {/* Internal tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {(['compras', 'movimientos'] as DrawerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors capitalize ${
                activeTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'compras' ? '📦 Compras' : '↕️ Movimientos de stock'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando…</div>
          ) : activeTab === 'compras' ? (
            visiblePurchases.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Todavía no hay compras registradas para este producto.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {visiblePurchases.map((p: PurchaseHistoryEntry, i: number) => {
                  const sourceLabel = getStockMovementLabel(p.reason ?? '', p.supplierName || undefined);
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-gray-800 text-sm">{sourceLabel}</span>
                        {p.unitCost > 0 && (
                          <span className="font-bold text-blue-700 text-sm">{formatCurrency(p.unitCost)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{formatDate(p.date)}</span>
                        <span>{p.quantity} u.</span>
                      </div>
                      {p.unitCost > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Total: {formatCurrency(p.unitCost * p.quantity)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            movements.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sin movimientos registrados</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {movements.map((m) => {
                  const { label, cls } = movementBadge(m.type, m.reason);
                  const reasonText = getStockMovementLabel(m.reason ?? '', m.supplierName ?? undefined);
                  const sign = m.type === 'sale' ? '−' : m.type === 'entry' ? '+' : '=';
                  return (
                    <div key={m.id} className="px-4 py-3 flex items-start gap-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 mt-0.5 ${cls}`}>{label}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold text-gray-800 text-sm">
                            {sign}{Math.abs(m.quantity)} u.
                            {m.quantityBefore != null && m.quantityAfter != null && (
                              <span className="font-normal text-xs text-gray-400 ml-1.5">
                                ({m.quantityBefore} → {m.quantityAfter})
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(m.createdAt)}</span>
                        </div>
                        {m.variantLabel && (
                          <div className="text-xs text-purple-600 mt-0.5 truncate">{m.variantLabel}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{reasonText}</div>
                        <div className="flex gap-3 mt-0.5">
                          {m.unitCost != null && (
                            <span className="text-xs text-gray-400">Costo u.: {formatCurrency(m.unitCost)}</span>
                          )}
                          {m.supplierName && (
                            <span className="text-xs text-gray-400">📦 {m.supplierName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
