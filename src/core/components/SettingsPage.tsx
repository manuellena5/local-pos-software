import { useState, useEffect } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { apiClient } from '@/lib/api/client';
import { useCategories } from '@/core/categories/hooks/useCategories';
import { categoriesApi } from '@/lib/api/categories';
import type { InstallationConfig, BusinessUnit, Category } from '@shared/types';

export function SettingsPage() {
  const config = useAppStore((s) => s.config);
  const businessUnits = useAppStore((s) => s.businessUnits);
  const activeBU = useAppStore((s) => s.activeBU);
  const setConfig = useAppStore((s) => s.setConfig);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Categorías ───────────────────────────────────────────────────────────
  const { categories, refetch: refetchCategories } = useCategories();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryWorking, setCategoryWorking] = useState(false);

  // General settings
  const [businessName, setBusinessName] = useState('');
  const [cuit, setCuit] = useState('');
  const [address, setAddress] = useState('');

  // Catalog settings
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [catalogBuId, setCatalogBuId] = useState<string>('');

  useEffect(() => {
    if (!config) return;
    setBusinessName(config.businessName ?? '');
    setCuit(config.cuit ?? '');
    setAddress(config.address ?? '');
    setWhatsappNumber(config.whatsappNumber ?? '');
    setCatalogBuId(config.catalogBusinessUnitId != null ? String(config.catalogBusinessUnitId) : '');
  }, [config]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        businessName: businessName || undefined,
        cuit: cuit || undefined,
        address: address || undefined,
        whatsappNumber: whatsappNumber || null,
        catalogBusinessUnitId: catalogBuId ? Number(catalogBuId) : null,
      };
      const updated = await apiClient.patch<InstallationConfig>('/api/config', body);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  // ── Handlers de categorías ───────────────────────────────────────────────
  async function handleCreateCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryWorking(true);
    setCategoryError(null);
    try {
      if (!activeBU) return;
      await categoriesApi.create({ name: trimmed, businessUnitId: activeBU.id });
      setNewCategoryName('');
      await refetchCategories();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : 'Error al crear categoría');
    } finally {
      setCategoryWorking(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingCategory) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setCategoryWorking(true);
    setCategoryError(null);
    try {
      await categoriesApi.update(editingCategory.id, trimmed);
      setEditingCategory(null);
      await refetchCategories();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : 'Error al editar categoría');
    } finally {
      setCategoryWorking(false);
    }
  }

  async function handleDelete(cat: Category) {
    setCategoryWorking(true);
    setCategoryError(null);
    try {
      await categoriesApi.delete(cat.id);
      await refetchCategories();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : 'Error al eliminar categoría');
    } finally {
      setCategoryWorking(false);
    }
  }

  const catalogUrl = `http://localhost:3001/catalog`;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Configuración del negocio</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del negocio</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CUIT</label>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Catálogo web</h2>
        <p className="text-xs text-gray-500 mb-4">
          Configurá el catálogo público que tus clientes pueden ver desde el navegador.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Unidad de negocio para el catálogo
            </label>
            <select
              value={catalogBuId}
              onChange={(e) => setCatalogBuId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">— Sin catálogo activo —</option>
              {businessUnits
                .filter((bu: BusinessUnit) => bu.isActive)
                .map((bu: BusinessUnit) => (
                  <option key={bu.id} value={String(bu.id)}>
                    {bu.name} ({bu.moduleId})
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Solo los productos con &quot;Mostrar en catálogo web&quot; activado serán visibles.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Número de WhatsApp (con código de país, sin +)
            </label>
            <input
              type="text"
              placeholder="Ej: 5491112345678"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Aparece como botón en el catálogo para que los clientes te consulten por cada producto.
            </p>
          </div>

          {catalogBuId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium mb-1">URL del catálogo:</p>
              <a
                href={catalogUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline break-all"
              >
                {catalogUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar configuración'}
      </button>

      {/* ── CATEGORÍAS DE PRODUCTOS ──────────────────────────────────────── */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Categorías de productos</h2>
        <p className="text-xs text-gray-500 mb-4">
          Administrá las categorías disponibles para esta unidad de negocio.
        </p>

        {/* Lista de categorías */}
        <div className="space-y-1 mb-4">
          {categories.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No hay categorías todavía.</p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            >
              {editingCategory?.id === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSaveEdit();
                      if (e.key === 'Escape') setEditingCategory(null);
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    onClick={() => void handleSaveEdit()}
                    disabled={categoryWorking}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800">{cat.name}</span>
                  <button
                    onClick={() => { setEditingCategory(cat); setEditingName(cat.name); setCategoryError(null); }}
                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => void handleDelete(cat)}
                    disabled={categoryWorking}
                    className="text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Nueva categoría */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateCategory(); }}
            placeholder="Nueva categoría…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => void handleCreateCategory()}
            disabled={categoryWorking || !newCategoryName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            + Agregar
          </button>
        </div>

        {categoryError && (
          <p className="text-red-500 text-xs mt-2">{categoryError}</p>
        )}
      </div>
    </div>
  );
}
