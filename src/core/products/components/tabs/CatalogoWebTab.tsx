import type { ProductWithStock } from '@shared/types';

interface CatalogoWebTabProps {
  formData: Partial<ProductWithStock>;
  onChange: (data: Partial<ProductWithStock>) => void;
}

const fi =
  'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full';

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
      <div>
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}

export function CatalogoWebTab({ formData, onChange }: CatalogoWebTabProps) {
  return (
    <div className="space-y-3">
      {/* Imagen */}
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1.5">Imagen del producto</div>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer">
          <div className="text-2xl mb-1">📷</div>
          <div className="text-sm font-semibold text-gray-600">Subir imagen</div>
          <div className="text-xs text-gray-400">PNG, JPG hasta 5 MB</div>
        </div>
      </div>

      {/* Visibilidad */}
      <div className="border border-gray-100 rounded-xl px-3 divide-y divide-gray-100">
        <Toggle
          label="Mostrar precio al público"
          hint="Si está desactivado, el cliente ve el producto pero no el precio"
          checked={formData.showCatalogPrice !== false}
          onChange={(v) => onChange({ ...formData, showCatalogPrice: v })}
        />
        <Toggle
          label="Mostrar stock disponible"
          hint="Muestra cuántas unidades quedan"
          checked={!!formData.showCatalogStock}
          onChange={(v) => onChange({ ...formData, showCatalogStock: v })}
        />
      </div>

      {/* Descripción pública */}
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1.5">
          Descripción para el catálogo
        </div>
        <textarea
          className={`${fi} resize-none`}
          rows={4}
          placeholder="Descripción que verán los clientes en el catálogo web…"
          value={formData.catalogDescription ?? ''}
          onChange={(e) => onChange({ ...formData, catalogDescription: e.target.value })}
        />
        <div className="text-xs text-gray-400 mt-1">Esta descripción es pública.</div>
      </div>
    </div>
  );
}
