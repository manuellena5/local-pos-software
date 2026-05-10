import { useState, useEffect } from 'react';
import { retailTextilApi } from '../api/retailTextilApi';
import type { ProductAttribute } from '../types';

interface Props {
  businessUnitId: number;
  productId: number;
}

interface AttrRow {
  key: string;
  value: string;
}

export function ProductAttributesPanel({ productId }: Props) {
  const [rows, setRows]       = useState<AttrRow[]>([]);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    retailTextilApi.getAttributes(productId)
      .then((attrs: ProductAttribute[]) =>
        setRows(attrs.map((a) => ({ key: a.key, value: a.value })))
      )
      .catch(() => setRows([]));
  }, [productId]);

  function addRow() {
    setRows((prev) => [...prev, { key: '', value: '' }]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: 'key' | 'value', val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await retailTextilApi.replaceAttributes(productId, {
        attributes: rows
          .filter((r) => r.key.trim() && r.value.trim())
          .map((r, i) => ({ key: r.key.trim(), value: r.value.trim(), sortOrder: i })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Atributos del producto</h3>
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          + Agregar atributo
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">Sin atributos. Agregá características como Tamaño, Material, Fragancia, etc.</p>
      )}

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Clave (ej. Tamaño)"
              value={row.key}
              onChange={(e) => updateRow(idx, 'key', e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs"
            />
            <input
              type="text"
              placeholder="Valor (ej. 1½ plaza)"
              value={row.value}
              onChange={(e) => updateRow(idx, 'value', e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs"
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="text-red-400 hover:text-red-600 text-base leading-none px-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="mt-3 px-3 py-1.5 text-xs font-medium bg-gray-700 text-white rounded hover:bg-gray-900 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar atributos'}
      </button>
    </div>
  );
}
