import { useRef, useState } from 'react';
import type { ProductWithStock } from '@shared/types';
import { useCategories } from '@/core/categories/hooks/useCategories';
import { formatDate } from '@/lib/utils/dateFormat';

interface DatosBaseTabProps {
  product?: ProductWithStock;
  formData: Partial<ProductWithStock>;
  onChange: (data: Partial<ProductWithStock>) => void;
  onOpenHistoryDrawer?: () => void;
  onArchive?: () => void;
  transactionCount: number;
  suppliers: { id: number; name: string }[];
  purchaseHistory: { date: string; supplierName: string; quantity: number; unitCost: number }[];
}

const fi =
  'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full';

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <label className="text-xs font-semibold text-gray-600">
      {text}
      {hint && <span className="text-gray-400 font-normal ml-1">{hint}</span>}
    </label>
  );
}

export function DatosBaseTab({
  product: _product,
  formData,
  onChange,
  onOpenHistoryDrawer,
  onArchive,
  transactionCount,
  suppliers,
  purchaseHistory,
}: DatosBaseTabProps) {
  const { categories } = useCategories();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [scanReady, setScanReady] = useState(false);

  function handleScanClick() {
    barcodeInputRef.current?.focus();
    barcodeInputRef.current?.select();
    setScanReady(true);
    setTimeout(() => setScanReady(false), 4000);
  }

  return (
    <div className="space-y-2">
      {/* Fila 1: Nombre (70%) | Categoría (30%) */}
      <div className="grid grid-cols-[2fr_1fr] gap-2">
        <div className="flex flex-col gap-1">
          <Label text="Nombre" />
          <input
            className={fi}
            value={formData.name ?? ''}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label text="Categoría" />
          <select
            className={fi}
            value={formData.category ?? ''}
            onChange={(e) => onChange({ ...formData, category: e.target.value })}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 2: Marca (50%) | Proveedor (50%) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label text="Marca" hint="(opcional)" />
          <input
            className={fi}
            placeholder="Ej: Phillips, Genérico…"
            value={formData.brand ?? ''}
            onChange={(e) => onChange({ ...formData, brand: e.target.value || null })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label text="Proveedor habitual" />
          <select
            className={fi}
            value={formData.supplierId ?? ''}
            onChange={(e) =>
              onChange({ ...formData, supplierId: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 3: Descripción interna */}
      <div className="flex flex-col gap-1">
        <Label text="Descripción interna" hint="(no se muestra al público)" />
        <textarea
          className={`${fi} resize-none`}
          rows={2}
          placeholder="Notas internas sobre el producto…"
          value={formData.description ?? ''}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
        />
      </div>

      {/* Fila 4: Barcode (40%) | Cód. proveedor (40%) | SKU readonly (20%) */}
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-2">
        <div className="flex flex-col gap-1">
          <Label text="Código de barras" hint="(EAN/UPC)" />
          <div className="flex gap-1">
            <input
              ref={barcodeInputRef}
              className={`${fi} flex-1 ${scanReady ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}
              value={formData.barcode ?? ''}
              onChange={(e) => {
                onChange({ ...formData, barcode: e.target.value });
                setScanReady(false);
              }}
              onBlur={() => setScanReady(false)}
              placeholder={scanReady ? 'Esperando scan…' : 'Escanear o escribir'}
            />
            <button
              type="button"
              onClick={handleScanClick}
              title="Enfocar y escanear"
              className={`px-2 py-1 border rounded-lg text-xs shrink-0 transition-colors ${
                scanReady
                  ? 'border-blue-400 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}
            >
              📷
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label text="Código proveedor" />
          <input
            className={fi}
            value={formData.supplierCode ?? ''}
            onChange={(e) => onChange({ ...formData, supplierCode: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label text="SKU" />
          {formData.sku ? (
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 flex-1 truncate select-all">
                {formData.sku}
              </span>
              <button
                type="button"
                title="Copiar"
                onClick={() => navigator.clipboard.writeText(formData.sku ?? '')}
                className="px-1.5 py-1.5 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 text-xs"
              >
                📋
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic px-2 py-1.5 block">
              Se genera al guardar
            </span>
          )}
        </div>
      </div>

      {/* Últimas compras (solo en edición si hay historial) */}
      {purchaseHistory.length > 0 && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Últimas compras
            </span>
            <button onClick={onOpenHistoryDrawer} className="text-xs text-blue-500 hover:underline">
              Ver historial →
            </button>
          </div>
          <div className="space-y-0.5">
            {purchaseHistory.slice(0, 3).map((h, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${i % 2 === 0 ? 'bg-gray-50' : ''}`}
              >
                <span className="font-medium text-gray-700 flex-1 truncate">{h.supplierName}</span>
                <span className="text-gray-400">{formatDate(h.date)}</span>
                <span className="text-gray-500">{h.quantity} u.</span>
                <span className="font-semibold text-blue-600">
                  ${h.unitCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zona de archivar — solo en edición */}
      {onArchive && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
          <div className="text-xs font-bold text-red-600 mb-1">Archivar producto</div>
          <div className="text-xs text-red-800 leading-relaxed mb-2">
            Oculta del catálogo y del POS, conserva todo el historial.{' '}
            {transactionCount > 0 && (
              <>
                <strong>{transactionCount} transacciones</strong> asociadas.{' '}
              </>
            )}
            Restaurable en cualquier momento.
          </div>
          <button
            onClick={onArchive}
            className="px-3 py-1 border border-red-300 rounded-lg text-xs font-semibold text-red-600 bg-white hover:bg-red-50"
          >
            Archivar este producto
          </button>
        </div>
      )}
    </div>
  );
}
