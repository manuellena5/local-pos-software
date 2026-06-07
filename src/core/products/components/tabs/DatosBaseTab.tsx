import { useState, useRef } from 'react';
import type { ProductWithStock } from '@shared/types';
import { useCategories } from '@/core/categories/hooks/useCategories';

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

interface CollapsibleSectionProps {
  icon: string;
  iconBg: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ icon, iconBg, title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${iconBg}`}>{icon}</span>
          <span className="text-sm font-bold text-gray-700">{title}</span>
        </div>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && <div className="px-3.5 py-3 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700">
        {label}
        {hint && <span className="text-gray-400 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const fi = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full';

export function DatosBaseTab({
  product,
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

  function handleScanButtonClick() {
    barcodeInputRef.current?.focus();
    barcodeInputRef.current?.select();
    setScanReady(true);
    // Quitar el indicador después de 4 segundos (tiempo suficiente para escanear)
    setTimeout(() => setScanReady(false), 4000);
  }

  return (
    <div>
      <CollapsibleSection icon="🏷️" iconBg="bg-blue-50" title="Identificación y descripción">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Nombre del producto">
            <input className={fi} value={formData.name ?? ''} onChange={(e) => onChange({ ...formData, name: e.target.value })} />
          </Field>
          <Field label="Categoría">
            <select className={fi} value={formData.category ?? ''} onChange={(e) => onChange({ ...formData, category: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Descripción interna" hint="(para uso interno, no se muestra al público)">
          <textarea
            className={`${fi} resize-none`}
            rows={2}
            placeholder="Ej: sábana de algodón 100%, viene en caja individual..."
            value={formData.description ?? ''}
            onChange={(e) => onChange({ ...formData, description: e.target.value })}
          />
        </Field>
      </CollapsibleSection>

      <CollapsibleSection icon="🔢" iconBg="bg-cyan-50" title="Códigos e identificadores">
        <div className="grid grid-cols-3 gap-3">
          {/* SKU — solo lectura (se genera automáticamente al crear) */}
          <Field label="SKU">
            {formData.sku ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 select-all">
                  {formData.sku}
                </span>
                <button
                  type="button"
                  title="Copiar SKU"
                  onClick={() => navigator.clipboard.writeText(formData.sku ?? '')}
                  className="px-2 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 text-sm"
                >
                  📋
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic px-3 py-2 block">
                Se genera al guardar
              </span>
            )}
          </Field>
          <Field label="Código de barras" hint="(EAN/UPC)">
            <div className="flex gap-1.5">
              <input
                ref={barcodeInputRef}
                className={`${fi} ${scanReady ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}
                value={formData.barcode ?? ''}
                onChange={(e) => { onChange({ ...formData, barcode: e.target.value }); setScanReady(false); }}
                onBlur={() => setScanReady(false)}
                placeholder={scanReady ? 'Esperando scan…' : 'Escanear o escribir'}
              />
              <button
                type="button"
                onClick={handleScanButtonClick}
                title="Enfocar campo y escanear"
                className={`px-2 py-1 border rounded-lg text-sm shrink-0 transition-colors ${
                  scanReady
                    ? 'border-blue-400 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                📷
              </button>
            </div>
            {scanReady && (
              <p className="text-xs text-blue-500 mt-0.5">Apretá el gatillo del lector ahora</p>
            )}
          </Field>
          <Field label="Código proveedor">
            <input className={fi} value={formData.supplierCode ?? ''} onChange={(e) => onChange({ ...formData, supplierCode: e.target.value })} />
            <span className="text-xs text-gray-400 mt-0.5">Para órdenes de compra</span>
          </Field>
        </div>
      </CollapsibleSection>

      <CollapsibleSection icon="🏭" iconBg="bg-purple-50" title="Proveedor habitual">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Proveedor habitual">
            <select
              className={fi}
              value={formData.supplierId ?? ''}
              onChange={(e) => onChange({ ...formData, supplierId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Plazo de reposición estimado">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 w-20"
                value={formData.supplierLeadTime ?? ''}
                onChange={(e) => onChange({ ...formData, supplierLeadTime: e.target.value ? Number(e.target.value) : null })}
              />
              <span className="text-sm text-gray-500">días hábiles</span>
            </div>
          </Field>
        </div>

        {purchaseHistory.length > 0 && (
          <>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Últimas compras
            </div>
            <div className="space-y-0.5 mb-3">
              {purchaseHistory.slice(0, 3).map((h, i) => (
                <div key={i} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                  <span className="font-semibold text-gray-700 flex-1 truncate">{h.supplierName}</span>
                  <span className="text-xs text-gray-400 mx-2">{h.date.slice(0, 10)}</span>
                  <span className="text-xs text-gray-500 mr-2">{h.quantity} u.</span>
                  <span className="font-bold text-blue-600 text-xs">${h.unitCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <button
          onClick={onOpenHistoryDrawer}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          📋 Ver historial completo →
        </button>
      </CollapsibleSection>

      {/* Zona de archivar */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mt-1">
        <div className="text-sm font-bold text-red-600 mb-1">🗄️ Archivar producto</div>
        <div className="text-xs text-red-800 leading-relaxed mb-2">
          Oculta del catálogo y del POS, <strong>conserva todo el historial</strong>.{' '}
          {transactionCount > 0 && (
            <>Este producto tiene <strong>{transactionCount} transacciones</strong>. </>
          )}
          Restaurable en cualquier momento.
        </div>
        <button
          onClick={onArchive}
          className="px-3 py-1.5 border border-red-300 rounded-lg text-xs font-semibold text-red-600 bg-white hover:bg-red-50"
        >
          Archivar este producto
        </button>
      </div>
    </div>
  );
}
