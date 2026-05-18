import { useEffect, useState } from 'react';
import type { BulkPriceAdjustmentType, BulkPricePreviewItem } from '@shared/types';
import { useProductsStore } from '../store/productsStore';
import { productsApi } from '@/lib/api/products';
import { formatCurrency } from '@/lib/utils/pricing';
import { useCategories } from '@/core/categories/hooks/useCategories';

interface BulkPriceUpdateModalProps {
  businessUnitId: number;
  onRefetch: () => void;
  onToast: (msg: string, type?: 'ok' | 'error') => void;
}

const ADJUSTMENT_TYPES: { id: BulkPriceAdjustmentType; label: string; hint: string }[] = [
  { id: 'increase_price_pct', label: '% sobre precio', hint: 'Sube el precio de venta en X%' },
  { id: 'increase_cost_pct',  label: '% sobre costo',  hint: 'Sube el costo en X% y recalcula precio' },
  { id: 'set_margin_pct',     label: 'Fijar margen',   hint: 'Establece el margen exacto en X%' },
];

export function BulkPriceUpdateModal({ businessUnitId, onRefetch, onToast }: BulkPriceUpdateModalProps) {
  const isOpen     = useProductsStore((s) => s.bulkModalOpen);
  const closeModal = useProductsStore((s) => s.closeBulkModal);
  const { categories } = useCategories();

  const [category, setCategory]     = useState('');
  const [adjType, setAdjType]       = useState<BulkPriceAdjustmentType>('increase_price_pct');
  const [value, setValue]           = useState('');
  const [preview, setPreview]       = useState<BulkPricePreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCategory('');
    setAdjType('increase_price_pct');
    setValue('');
    setPreview([]);
  }, [isOpen]);

  const fetchPreview = async () => {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    setPreviewLoading(true);
    try {
      const res = await productsApi.bulkUpdatePrices(
        { categoryId: null, adjustmentType: adjType, value: val, businessUnitId },
        true,
      ) as { preview: BulkPricePreviewItem[] };
      setPreview(res.preview ?? []);
    } catch {
      setPreview([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0 || saving) return;
    setSaving(true);
    try {
      const res = await productsApi.bulkUpdatePrices(
        { categoryId: null, adjustmentType: adjType, value: val, businessUnitId },
        false,
      ) as { updated: number };
      onToast(`✅ ${res.updated} productos actualizados`);
      onRefetch();
      closeModal();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error al actualizar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="font-bold text-gray-900">Actualización masiva de precios</div>
            <div className="text-xs text-gray-400 mt-0.5">Afecta múltiples productos a la vez</div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Category filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Categoría <span className="text-gray-400 font-normal">(opcional)</span></label>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Adjustment type */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">Tipo de ajuste</label>
            <div className="space-y-2">
              {ADJUSTMENT_TYPES.map((t) => (
                <label key={t.id} className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border transition-colors hover:bg-gray-50 border-gray-200">
                  <input
                    type="radio"
                    name="adjType"
                    value={t.id}
                    checked={adjType === t.id}
                    onChange={() => setAdjType(t.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{t.label}</div>
                    <div className="text-xs text-gray-400">{t.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Valor %</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  className="px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 w-full"
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setPreview([]); }}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <button
                onClick={fetchPreview}
                disabled={previewLoading || !value}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
              >
                {previewLoading ? '…' : 'Vista previa'}
              </button>
            </div>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
                Vista previa (primeros {preview.length})
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Producto</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Precio actual</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Precio nuevo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-700 font-medium truncate max-w-[160px]">{item.name}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(item.currentPrice)}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">{formatCurrency(item.newPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
          <button onClick={closeModal} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={saving || !value || parseFloat(value) <= 0}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Aplicando…' : '⚡ Aplicar a todos'}
          </button>
        </div>
      </div>
    </div>
  );
}
