import { useState, useEffect } from 'react';

interface Props {
  productId: number;
  businessUnitId: number;
}

/**
 * Checkbox para activar/desactivar visibilidad del producto en el catálogo web.
 * Actualiza las columnas show_in_catalog y catalog_description vía PATCH /api/products/:id.
 */
export function CatalogToggle({ productId, businessUnitId }: Props) {
  const SERVER = 'http://localhost:3001';
  const [showInCatalog, setShowInCatalog]           = useState(false);
  const [catalogDescription, setCatalogDescription] = useState('');
  const [code, setCode]                             = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`${SERVER}/api/products/${productId}?businessUnitId=${businessUnitId}`)
      .then((r) => r.json())
      .then((json: { data: Record<string, unknown> }) => {
        if (json.data) {
          setShowInCatalog(Boolean(json.data['showInCatalog']));
          setCatalogDescription(String(json.data['catalogDescription'] ?? ''));
          setCode(String(json.data['code'] ?? ''));
        }
      })
      .catch(() => {});
  }, [productId, businessUnitId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${SERVER}/api/products/${productId}?businessUnitId=${businessUnitId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            showInCatalog,
            catalogDescription: catalogDescription || null,
            code: code || null,
          }),
        },
      );
      const json = await res.json() as { error?: { message?: string } | null };
      if (!res.ok) throw new Error(json.error?.message ?? 'Error al guardar');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Catálogo web</h3>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showInCatalog}
          onChange={(e) => setShowInCatalog(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm text-gray-700">Mostrar en el catálogo web</span>
      </label>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Código de artículo (proveedor)</label>
        <input
          type="text"
          placeholder="Ej. JO907127"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
        />
      </div>

      {showInCatalog && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Descripción para el catálogo</label>
          <textarea
            placeholder="Descripción extendida que se muestra en el catálogo web..."
            value={catalogDescription}
            onChange={(e) => setCatalogDescription(e.target.value)}
            rows={3}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs resize-none"
          />
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="px-3 py-1.5 text-xs font-medium bg-gray-700 text-white rounded hover:bg-gray-900 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar configuración web'}
      </button>
    </div>
  );
}
