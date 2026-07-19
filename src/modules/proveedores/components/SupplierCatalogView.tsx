import { useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { apiClient } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/dateFormat';
import { useSupplierProducts, useImportCatalog } from '../hooks/useSupplierProducts';
import { AddToCatalogModal } from './AddToCatalogModal';
import type { SupplierProduct, ImportResult } from '@shared/types';

const UNIT_OPTIONS = ['unidad', 'par', 'docena', 'metro', 'kg', 'litro', 'otro'];

// ── Formulario de producto manual ───────────────────────────────────────────

interface ProductFormData {
  name: string;
  supplierCode: string;
  unitCost: string;
  unit: string;
  categoryHint: string;
}

const EMPTY_FORM: ProductFormData = {
  name:         '',
  supplierCode: '',
  unitCost:     '',
  unit:         'unidad',
  categoryHint: '',
};

interface ProductFormModalProps {
  supplierId: number;
  businessUnitId: number;
  product?: SupplierProduct;
  onClose: () => void;
  onSuccess: () => void;
}

function ProductFormModal({ supplierId, businessUnitId, product, onClose, onSuccess }: ProductFormModalProps) {
  const isEdit = Boolean(product);
  const [form, setForm]       = useState<ProductFormData>(
    product
      ? {
          name:         product.name,
          supplierCode: product.supplierCode ?? '',
          unitCost:     String(product.unitCost),
          unit:         product.unit,
          categoryHint: product.categoryHint ?? '',
        }
      : EMPTY_FORM,
  );
  const [error, setError]         = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
    const unitCost = parseFloat(form.unitCost);
    if (isNaN(unitCost) || unitCost < 0) { setError('El precio debe ser un número positivo'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const body = {
        businessUnitId,
        name:         form.name.trim(),
        supplierCode: form.supplierCode.trim() || null,
        unitCost,
        unit:         form.unit,
        categoryHint: form.categoryHint.trim() || null,
      };
      if (isEdit && product) {
        await apiClient.put(`/api/modules/proveedores/supplier-products/${product.id}`, body);
      } else {
        await apiClient.post(`/api/modules/proveedores/suppliers/${supplierId}/products`, body);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 space-y-3">
          <h3 className="text-base font-bold text-gray-900">
            {isEdit ? 'Editar producto' : 'Agregar producto'}
          </h3>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Nombre del producto"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Código + Precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Código proveedor</label>
              <input
                type="text"
                value={form.supplierCode}
                onChange={(e) => set('supplierCode', e.target.value)}
                placeholder="Ej: TEX-0042"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Precio de costo *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.unitCost}
                onChange={(e) => set('unitCost', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Unidad + Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unidad</label>
              <select
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoría sugerida</label>
              <input
                type="text"
                value={form.categoryHint}
                onChange={(e) => set('categoryHint', e.target.value)}
                placeholder="Ej: Telas"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : isEdit ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal de importación ─────────────────────────────────────────────────────

interface ImportModalProps {
  supplierId: number;
  businessUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function ImportModal({ supplierId, businessUnitId, onClose, onSuccess }: ImportModalProps) {
  const { importCatalog, isImporting, result, error, reset } = useImportCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showErrors, setShowErrors]     = useState(false);

  async function handleImport() {
    if (!selectedFile) return;
    await importCatalog(supplierId, businessUnitId, selectedFile);
  }

  function handleClose() {
    if (result) onSuccess();
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Importar catálogo</h3>

          {!result && (
            <>
              <p className="text-sm text-gray-500">
                El archivo debe tener columnas de <strong>nombre</strong> y <strong>precio</strong>.
                Las columnas de código, unidad y categoría son opcionales.
              </p>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <p className="text-3xl mb-2">📄</p>
                {selectedFile ? (
                  <p className="text-sm font-medium text-blue-600">{selectedFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Arrastrá o hacé clic para seleccionar</p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv — máximo 10 MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Descargar plantilla */}
              <a
                href="/api/modules/proveedores/supplier-products/import-template"
                download="plantilla-catalogo.xlsx"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                ⬇️ Descargar plantilla Excel
              </a>

              {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  disabled={isImporting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleImport()}
                  disabled={!selectedFile || isImporting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isImporting ? 'Procesando archivo…' : 'Importar'}
                </button>
              </div>
            </>
          )}

          {result && <ImportResultView result={result} showErrors={showErrors} onToggleErrors={() => setShowErrors((v) => !v)} onClose={handleClose} />}
        </div>
      </div>
    </div>
  );
}

function ImportResultView({
  result,
  showErrors,
  onToggleErrors,
  onClose,
}: {
  result: ImportResult;
  showErrors: boolean;
  onToggleErrors: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">Resultado de la importación</p>
      <div className="space-y-1.5 text-sm">
        <p>✅ <span className="font-medium">{result.created}</span> productos nuevos</p>
        <p>🔄 <span className="font-medium">{result.updated}</span> productos actualizados (precio cambió)</p>
        <p>➖ <span className="font-medium">{result.unchanged}</span> sin cambios</p>
        {result.errors.length > 0 && (
          <div>
            <button
              onClick={onToggleErrors}
              className="text-amber-600 hover:underline flex items-center gap-1"
            >
              ⚠️ <span className="font-medium">{result.errors.length}</span> filas con errores
              <span className="text-xs">({showErrors ? 'ocultar' : 'ver detalle'})</span>
            </button>
            {showErrors && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Fila {e.row}: {e.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Cerrar y actualizar
      </button>
    </div>
  );
}

// ── Vista principal del catálogo ─────────────────────────────────────────────

interface SupplierCatalogViewProps {
  supplierId: number;
  supplierName: string;
  onBack: () => void;
}

export function SupplierCatalogView({ supplierId, supplierName, onBack }: SupplierCatalogViewProps) {
  const activeBU = useAppStore((s) => s.activeBU);
  const { products, isLoading, error, refetch } = useSupplierProducts(supplierId, activeBU?.id);

  const [search, setSearch]               = useState('');
  const [showImport, setShowImport]       = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [deleteError, setDeleteError]     = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<number | null>(null);
  const [addToCatalog, setAddToCatalog]   = useState<SupplierProduct | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.supplierCode ?? '').toLowerCase().includes(q),
    );
  }, [products, search]);

  if (!activeBU) return null;

  const lastImport = products.length > 0
    ? products.reduce((a, b) => (a.lastUpdated > b.lastUpdated ? a : b)).lastUpdated
    : null;

  async function handleDelete(product: SupplierProduct) {
    setDeleting(product.id);
    setDeleteError(null);
    try {
      await apiClient.delete(`/api/modules/proveedores/supplier-products/${product.id}`);
      await refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="text-blue-600 hover:underline">
          ← Proveedores
        </button>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-800">{supplierName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Catálogo de {supplierName}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            📥 Importar Excel/CSV
          </button>
          <button
            onClick={() => { setEditingProduct(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Agregar producto
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o código…"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {deleteError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
      )}

      {/* Contenido */}
      {isLoading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando catálogo…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : filtered.length === 0 && products.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-2xl mb-2">📦</p>
          <p className="text-sm font-medium text-gray-500">El catálogo está vacío</p>
          <p className="text-xs text-gray-400 mt-1">
            Importá un archivo Excel/CSV o agregá productos manualmente.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Sin resultados para &ldquo;{search}&rdquo;</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Código</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Precio costo</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Unidad</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Categoría</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Últ. act.</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-900">{product.name}</td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">
                    {product.supplierCode ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                    $ {product.unitCost.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{product.unit}</td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {product.categoryHint ? (
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {product.categoryHint}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-gray-400">
                    {formatDate(product.lastUpdated)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {product.isLinked === true ? (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200">
                          En mi catálogo
                        </span>
                      ) : (
                        <button
                          onClick={() => setAddToCatalog(product)}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          + Agregar
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingProduct(product); setShowForm(true); }}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => void handleDelete(product)}
                        disabled={deleting === product.id}
                        className="px-2.5 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                      >
                        {deleting === product.id ? '…' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer con conteo */}
      {products.length > 0 && (
        <p className="text-xs text-gray-400">
          {products.length} producto{products.length !== 1 ? 's' : ''}
          {lastImport && ` · última actualización: ${formatDate(lastImport)}`}
        </p>
      )}

      {/* Modales */}
      {showImport && (
        <ImportModal
          supplierId={supplierId}
          businessUnitId={activeBU.id}
          onClose={() => setShowImport(false)}
          onSuccess={() => void refetch()}
        />
      )}

      {showForm && (
        <ProductFormModal
          supplierId={supplierId}
          businessUnitId={activeBU.id}
          product={editingProduct ?? undefined}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
          onSuccess={() => void refetch()}
        />
      )}

      {addToCatalog && (
        <AddToCatalogModal
          supplierProduct={addToCatalog}
          businessUnitId={activeBU.id}
          onClose={() => setAddToCatalog(null)}
          onSuccess={() => { setAddToCatalog(null); void refetch(); }}
        />
      )}
    </div>
  );
}
