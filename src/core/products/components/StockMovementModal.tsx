import { useEffect, useState } from 'react';
import type { StockMovementType } from '@shared/types';
import { useProductsStore } from '../store/productsStore';
import { productsApi } from '@/lib/api/products';

interface StockMovementModalProps {
  businessUnitId: number;
  onRefetch: () => void;
  onToast: (msg: string, type?: 'ok' | 'error') => void;
}

interface ProductMini {
  name: string;
  currentStock: number;
  sku: string;
}

const TYPE_OPTIONS: { id: StockMovementType; label: string; icon: string; color: string }[] = [
  { id: 'entrada',  label: 'Entrada',  icon: '⬆️', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'salida',   label: 'Salida',   icon: '⬇️', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'ajuste',   label: 'Ajuste',   icon: '⚖️', color: 'bg-orange-100 text-orange-700 border-orange-300' },
];

export function StockMovementModal({ businessUnitId, onRefetch, onToast }: StockMovementModalProps) {
  const productId      = useProductsStore((s) => s.stockModalProductId);
  const closeModal     = useProductsStore((s) => s.closeStockModal);
  const allProductsRef = useProductsStore((s) => s.activeProduct);

  const [product, setProduct] = useState<ProductMini | null>(null);
  const [movType, setMovType] = useState<StockMovementType>('entrada');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [reason, setReason]     = useState('');
  const [saving, setSaving]     = useState(false);

  const isOpen = productId !== null;

  useEffect(() => {
    if (!productId) return;
    setMovType('entrada');
    setQuantity('');
    setUnitCost('');
    setReason('');
    fetch(`/api/products/${productId}?businessUnitId=${businessUnitId}`)
      .then((r) => r.json())
      .then((p: ProductMini) => setProduct(p))
      .catch(() => {});
  }, [productId, businessUnitId]);

  if (!isOpen) return null;

  const qty = parseInt(quantity, 10);
  const currentStock = product?.currentStock ?? 0;

  const resultingStock = (() => {
    if (isNaN(qty) || qty <= 0) return currentStock;
    if (movType === 'entrada') return currentStock + qty;
    if (movType === 'salida')  return currentStock - qty;
    return qty; // ajuste = set absolute value
  })();

  const stockColor = resultingStock < 0 ? 'text-red-600' : resultingStock === 0 ? 'text-orange-500' : 'text-green-700';

  const handleSubmit = async () => {
    if (!productId || saving || isNaN(qty) || qty <= 0) return;
    setSaving(true);
    try {
      const res = await productsApi.createStockMovement(productId, {
        type: movType,
        quantity: qty,
        unitCost: unitCost ? Number(unitCost) : undefined,
        reason: reason || undefined,
        businessUnitId,
      });
      onToast(`✅ Stock actualizado → ${res.newQuantity} u.`);
      onRefetch();
      closeModal();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error al registrar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="font-bold text-gray-900">Movimiento de stock</div>
            {product && <div className="text-xs text-gray-400 mt-0.5">{product.name}</div>}
          </div>
          <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">Tipo de movimiento</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMovType(t.id)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    movType === t.id ? t.color + ' border-current' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="block text-base mb-0.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              {movType === 'ajuste' ? 'Stock real contado' : 'Cantidad'}
            </label>
            <input
              type="number"
              min={1}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={movType === 'ajuste' ? 'Conteo físico' : 'Cantidad de unidades'}
            />
          </div>

          {/* Unit cost (only for entrada) */}
          {movType === 'entrada' && (
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Costo unitario <span className="text-gray-400 font-normal">(opcional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="px-3 py-2 pl-7 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">Si se carga, actualiza el costo del producto</div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Motivo <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: compra a proveedor, ajuste de inventario..."
            />
          </div>

          {/* Live preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <span className="block">Stock actual: <strong className="text-gray-800">{currentStock} u.</strong></span>
            </div>
            <div className="text-xs text-gray-400">→</div>
            <div className="text-sm font-bold">
              Stock resultante: <span className={stockColor}>{resultingStock} u.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={closeModal} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || isNaN(qty) || qty <= 0}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Registrando…' : '✅ Registrar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
