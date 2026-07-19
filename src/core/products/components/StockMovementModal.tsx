import { useEffect, useState } from 'react';
import type { ProductStockDetail, StockMovementType } from '@shared/types';
import { useProductsStore } from '../store/productsStore';
import { productsApi } from '@/lib/api/products';
import { stockApi } from '@/lib/api/stock';
import { apiClient } from '@/lib/api/client';

interface StockMovementModalProps {
  businessUnitId: number;
  onRefetch: () => void;
  onToast: (msg: string, type?: 'ok' | 'error') => void;
}

interface SupplierMini {
  id: number;
  name: string;
}

/** Valores por variante: cantidad y precio unitario ingresados */
interface VariantRowInput {
  quantity: string;
  unitCost: string;
}

const TYPE_OPTIONS: { id: StockMovementType; label: string; icon: string; color: string }[] = [
  { id: 'entrada',  label: 'Entrada',  icon: '⬆️', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'salida',   label: 'Salida',   icon: '⬇️', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'ajuste',   label: 'Ajuste',   icon: '⚖️', color: 'bg-orange-100 text-orange-700 border-orange-300' },
];

const inputCls =
  'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full';

function resultingStockFor(type: StockMovementType, current: number, qty: number): number {
  if (isNaN(qty)) return current;
  if (type === 'entrada') return current + qty;
  if (type === 'salida') return current - qty;
  return qty; // ajuste = conteo físico
}

export function StockMovementModal({ businessUnitId, onRefetch, onToast }: StockMovementModalProps) {
  const productId  = useProductsStore((s) => s.stockModalProductId);
  const closeModal = useProductsStore((s) => s.closeStockModal);

  const [detail, setDetail]       = useState<ProductStockDetail | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierMini[]>([]);
  const [movType, setMovType]     = useState<StockMovementType>('entrada');
  const [quantity, setQuantity]   = useState('');
  const [unitCost, setUnitCost]   = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [reason, setReason]       = useState('');
  const [variantInputs, setVariantInputs] = useState<Record<number, VariantRowInput>>({});
  const [saving, setSaving]       = useState(false);

  const isOpen = productId !== null;

  useEffect(() => {
    if (!productId) return;
    setMovType('entrada');
    setQuantity('');
    setUnitCost('');
    setSupplierId('');
    setReason('');
    setVariantInputs({});
    setDetail(null);

    stockApi
      .getDetail(productId, businessUnitId)
      .then(setDetail)
      .catch(() => onToast('No se pudo cargar el stock del producto', 'error'));

    apiClient
      .get<SupplierMini[]>(`/api/modules/proveedores/suppliers?buId=${businessUnitId}`)
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, businessUnitId]);

  if (!isOpen) return null;

  const hasVariants = (detail?.variants.length ?? 0) > 0;
  const currentStock = detail?.currentStock ?? 0;

  const setVariantInput = (variantId: number, patch: Partial<VariantRowInput>) => {
    setVariantInputs((prev) => {
      const current = prev[variantId] ?? { quantity: '', unitCost: '' };
      return { ...prev, [variantId]: { ...current, ...patch } };
    });
  };

  // ── Validación ────────────────────────────────────────────────────────────
  const qty = parseInt(quantity, 10);
  const simpleValid = !isNaN(qty) && (movType === 'ajuste' ? qty >= 0 : qty > 0);

  const variantMovements = (detail?.variants ?? [])
    .map((v) => {
      const input = variantInputs[v.id];
      if (!input || input.quantity.trim() === '') return null;
      const q = parseInt(input.quantity, 10);
      if (isNaN(q) || q < 0) return null;
      if (movType !== 'ajuste' && q === 0) return null;
      if (movType === 'ajuste' && q === v.stock) return null; // sin cambio
      return {
        variant: v,
        quantity: q,
        unitCost: input.unitCost ? Number(input.unitCost) : undefined,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const canSubmit = hasVariants ? variantMovements.length > 0 : simpleValid;

  const simpleResulting = resultingStockFor(movType, currentStock, qty);
  const stockColorCls = (n: number) =>
    n < 0 ? 'text-red-600' : n === 0 ? 'text-orange-500' : 'text-green-700';

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!productId || saving || !canSubmit) return;
    setSaving(true);

    const common = {
      type: movType,
      businessUnitId,
      reason: reason || undefined,
      supplierId: supplierId ? Number(supplierId) : undefined,
    };

    try {
      if (!hasVariants) {
        const res = await productsApi.createStockMovement(productId, {
          ...common,
          quantity: qty,
          unitCost: unitCost ? Number(unitCost) : undefined,
        });
        onToast(`✅ Stock actualizado → ${res.newQuantity} u.`);
      } else {
        const errors: string[] = [];
        let done = 0;
        for (const m of variantMovements) {
          try {
            await productsApi.createStockMovement(productId, {
              ...common,
              quantity: m.quantity,
              unitCost: m.unitCost,
              variantId: m.variant.id,
            });
            done++;
          } catch (err) {
            errors.push(
              `${m.variant.attributeValue}: ${err instanceof Error ? err.message : 'error'}`,
            );
          }
        }
        if (errors.length > 0) {
          onToast(`${done} movimiento(s) OK · Falló: ${errors.join(' · ')}`, 'error');
        } else {
          onToast(`✅ ${done} movimiento(s) de stock registrados`);
        }
        if (done === 0) {
          setSaving(false);
          return; // nada cambió: no cerrar para que corrija
        }
      }
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
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full z-10 max-h-[90vh] flex flex-col ${hasVariants ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="font-bold text-gray-900">Movimiento de stock</div>
            {detail && (
              <div className="text-xs text-gray-400 mt-0.5">
                {detail.name} <span className="font-mono">{detail.sku}</span>
                {hasVariants && (
                  <span className="ml-1 text-purple-600">· {detail.variants.length} variantes</span>
                )}
              </div>
            )}
          </div>
          <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
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

          {/* Proveedor + Descripción (comunes a todas las variantes) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Proveedor <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                className={inputCls}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Descripción <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                className={inputCls}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: compra, rotura, inventario…"
              />
            </div>
          </div>

          {hasVariants && detail ? (
            /* ── Tabla por variante ─────────────────────────────────────── */
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">
                      {detail.variants[0]?.attributeType ?? 'Variante'}
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">Stock</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      {movType === 'ajuste' ? 'Conteo real' : 'Cantidad'}
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      Precio u. <span className="font-normal text-gray-400">(opc.)</span>
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">Resultante</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.variants.map((v) => {
                    const input = variantInputs[v.id];
                    const q = input?.quantity.trim() ? parseInt(input.quantity, 10) : NaN;
                    const resulting = resultingStockFor(movType, v.stock, q);
                    const touched = (input?.quantity ?? '').trim() !== '';
                    return (
                      <tr key={v.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-3 py-1.5 font-medium text-gray-800">{v.attributeValue}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{v.stock}</td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            className={`${inputCls} text-right py-1.5`}
                            value={input?.quantity ?? ''}
                            onChange={(e) => setVariantInput(v.id, { quantity: e.target.value })}
                            placeholder={movType === 'ajuste' ? String(v.stock) : '0'}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className={`${inputCls} text-right py-1.5 pl-5`}
                              value={input?.unitCost ?? ''}
                              onChange={(e) => setVariantInput(v.id, { unitCost: e.target.value })}
                              placeholder={v.costPrice ? String(v.costPrice) : '0.00'}
                            />
                          </div>
                        </td>
                        <td className={`px-2 py-1.5 text-right font-bold ${touched && !isNaN(q) ? stockColorCls(resulting) : 'text-gray-300'}`}>
                          {touched && !isNaN(q) ? resulting : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-between text-xs">
                <span className="text-gray-500">
                  Stock total actual: <strong className="text-gray-800">{currentStock} u.</strong>
                </span>
                <span className="text-gray-400">
                  Dejá en blanco las variantes que no cambian
                </span>
              </div>
            </div>
          ) : (
            /* ── Producto sin variantes ─────────────────────────────────── */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    {movType === 'ajuste' ? 'Stock real contado' : 'Cantidad'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={movType === 'ajuste' ? 'Conteo físico' : 'Unidades'}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Precio unitario <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={`${inputCls} pl-7`}
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {movType === 'entrada' && (
                <div className="text-xs text-gray-400 -mt-2">Si se carga precio, actualiza el costo del producto</div>
              )}

              {/* Live preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <span className="block">Stock actual: <strong className="text-gray-800">{currentStock} u.</strong></span>
                </div>
                <div className="text-xs text-gray-400">→</div>
                <div className="text-sm font-bold">
                  Stock resultante:{' '}
                  <span className={stockColorCls(simpleValid ? simpleResulting : currentStock)}>
                    {simpleValid ? simpleResulting : currentStock} u.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
          <button onClick={closeModal} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? 'Registrando…'
              : hasVariants
                ? `✅ Registrar ${variantMovements.length || ''} movimiento${variantMovements.length === 1 ? '' : 's'}`
                : '✅ Registrar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
