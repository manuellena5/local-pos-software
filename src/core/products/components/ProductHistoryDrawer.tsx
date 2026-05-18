import { useEffect, useState } from 'react';
import type { PurchaseHistoryEntry } from '@shared/types';
import { useProductsStore } from '../store/productsStore';
import { productsApi } from '@/lib/api/products';
import { formatCurrency } from '@/lib/utils/pricing';

interface ProductHistoryDrawerProps {
  businessUnitId: number;
}

type DrawerTab = 'compras' | 'movimientos';

interface StockMovement {
  id: number;
  type: string;
  quantity: number;
  reason: string | null;
  unitCost: number | null;
  createdAt: string;
}

export function ProductHistoryDrawer({ businessUnitId }: ProductHistoryDrawerProps) {
  const productId  = useProductsStore((s) => s.drawerProductId);
  const closeDrawer = useProductsStore((s) => s.closeDrawer);
  const allProducts = useProductsStore((s) => s.activeProduct);

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

    fetch(`/api/products/${productId}/stock-movements?businessUnitId=${businessUnitId}`)
      .then((r) => r.json())
      .then((data: StockMovement[]) => setMovements(data))
      .catch(() => {});

    fetch(`/api/products/${productId}?businessUnitId=${businessUnitId}`)
      .then((r) => r.json())
      .then((p: { name: string }) => setProductName(p.name))
      .catch(() => {});
  }, [productId, businessUnitId]);

  const typeLabel = (type: string) => {
    if (type === 'entry') return { label: 'Entrada', cls: 'bg-green-100 text-green-700' };
    if (type === 'sale')  return { label: 'Venta',   cls: 'bg-blue-100 text-blue-700' };
    return { label: 'Ajuste', cls: 'bg-orange-100 text-orange-700' };
  };

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
            purchases.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sin historial de compras</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {purchases.map((p, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{p.supplierName}</span>
                      <span className="font-bold text-blue-700 text-sm">{formatCurrency(p.unitCost)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{p.date.slice(0, 10)}</span>
                      <span>{p.quantity} u.</span>
                      {p.invoiceRef && <span className="font-mono">{p.invoiceRef}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total: {formatCurrency(p.unitCost * p.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            movements.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sin movimientos registrados</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {movements.map((m) => {
                  const { label, cls } = typeLabel(m.type);
                  return (
                    <div key={m.id} className="px-4 py-3 flex items-start gap-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 mt-0.5 ${cls}`}>{label}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold text-gray-800 text-sm">
                            {m.type === 'sale' ? '-' : m.type === 'entry' ? '+' : '='}{m.quantity} u.
                          </span>
                          <span className="text-xs text-gray-400">{m.createdAt.slice(0, 10)}</span>
                        </div>
                        {m.reason && <div className="text-xs text-gray-500 mt-0.5 truncate">{m.reason}</div>}
                        {m.unitCost != null && (
                          <div className="text-xs text-gray-400 mt-0.5">Costo u.: {formatCurrency(m.unitCost)}</div>
                        )}
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
