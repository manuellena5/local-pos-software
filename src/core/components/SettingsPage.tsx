import { useState, useEffect } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { apiClient } from '@/lib/api/client';
import { useCategories } from '@/core/categories/hooks/useCategories';
import { categoriesApi } from '@/lib/api/categories';
import { usePaymentMethods } from '@/core/hooks/usePaymentMethods';
import { paymentMethodsApi } from '@/lib/api/paymentMethods';
import { systemApi } from '@/lib/api/system';
import { BusinessUnitsPage } from '@/core/business-units/BusinessUnitsPage';
import { PrinterSettingsTab } from '@/core/printer/components/PrinterSettingsTab';
import type { InstallationConfig, BusinessUnit, Category } from '@shared/types';
import { getErrorLog, clearErrorLog, type ErrorLogEntry } from '@/lib/errorLog';

const SETTINGS_TABS = [
  { id: 'negocio',   label: 'Negocio' },
  { id: 'unidades',  label: 'Unidades de negocio' },
  { id: 'catalogo',  label: 'Catálogo web' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'medios',    label: 'Medios de pago' },
  { id: 'impresora', label: 'Impresora' },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

interface SettingsPageProps {
  initialTab?: string;
}

export function SettingsPage({ initialTab }: SettingsPageProps) {
  const validInitialTab = SETTINGS_TABS.find((t) => t.id === initialTab)?.id ?? 'negocio';
  const [activeTab, setActiveTab] = useState<SettingsTabId>(validInitialTab);

  const config = useAppStore((s) => s.config);
  const businessUnits = useAppStore((s) => s.businessUnits);
  const activeBU = useAppStore((s) => s.activeBU);
  const setConfig = useAppStore((s) => s.setConfig);

  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);
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

  // ── Medios de pago ───────────────────────────────────────────────────────
  const { methods: paymentMethodsList, refetch: refetchPaymentMethods } = usePaymentMethods();
  const [paymentMethodWorking, setPaymentMethodWorking] = useState<number | null>(null);

  // ── Reset de datos de prueba (testing) ──────────────────────────────────
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetWorking, setResetWorking] = useState(false);
  const [resetResult, setResetResult] = useState<{ ok: boolean; message: string } | null>(null);

  // General settings
  const [businessName, setBusinessName] = useState('');
  const [cuit, setCuit] = useState('');
  const [address, setAddress] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [ingBrutos, setIngBrutos] = useState('');
  const [fiscalCondition, setFiscalCondition] = useState<'monotributo' | 'responsable_inscripto'>('monotributo');

  // Catalog settings
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [catalogBuId, setCatalogBuId] = useState<string>('');

  useEffect(() => { setErrorLog(getErrorLog()); }, []);

  useEffect(() => {
    if (!config) return;
    setBusinessName(config.businessName ?? '');
    setCuit(config.cuit ?? '');
    setAddress(config.address ?? '');
    setAddressStreet(config.addressStreet ?? '');
    setAddressCity(config.addressCity ?? '');
    setIngBrutos(config.ingBrutos ?? '');
    setFiscalCondition(config.fiscalCondition ?? 'monotributo');
    setWhatsappNumber(config.whatsappNumber ?? '');
    setCatalogBuId(config.catalogBusinessUnitId != null ? String(config.catalogBusinessUnitId) : '');
  }, [config]);

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        businessName: businessName || undefined,
        cuit: cuit || undefined,
        address: address || undefined,
        addressStreet: addressStreet || null,
        addressCity: addressCity || null,
        ingBrutos: ingBrutos || undefined,
        fiscalCondition: fiscalCondition,
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
  async function handleCreateCategory(): Promise<void> {
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

  async function handleSaveEdit(): Promise<void> {
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

  async function handleDelete(cat: Category): Promise<void> {
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

  // ── Handlers de medios de pago ───────────────────────────────────────────
  async function handleTogglePaymentMethod(id: number, isActive: boolean): Promise<void> {
    setPaymentMethodWorking(id);
    try {
      await paymentMethodsApi.setActive(id, isActive);
      await refetchPaymentMethods();
    } finally {
      setPaymentMethodWorking(null);
    }
  }

  // ── Handler de reset de datos de prueba ──────────────────────────────────
  async function handleResetDemoData(): Promise<void> {
    setResetWorking(true);
    setResetResult(null);
    try {
      await systemApi.resetDemoData(resetConfirmText);
      setResetResult({ ok: true, message: 'Datos de prueba reiniciados. Recargá la página.' });
      setResetConfirmText('');
    } catch (e) {
      setResetResult({ ok: false, message: e instanceof Error ? e.message : 'Error al reiniciar' });
    } finally {
      setResetWorking(false);
    }
  }

  const catalogUrl = `http://localhost:3001/catalog`;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 mb-6 overflow-x-auto">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Negocio */}
      {activeTab === 'negocio' && (
        <div className="space-y-6 max-w-lg">

          {/* Identificación */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Identificación</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CUIT</label>
                  <input
                    type="text"
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    placeholder="20-12345678-9"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Condición fiscal</label>
                  <select
                    value={fiscalCondition}
                    onChange={(e) => setFiscalCondition(e.target.value as 'monotributo' | 'responsable_inscripto')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="monotributo">Monotributista</option>
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Ingresos Brutos <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={ingBrutos}
                  onChange={(e) => setIngBrutos(e.target.value)}
                  placeholder="Ej: 061-013654-6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Se muestra en el ticket de venta. Lo obtenés al inscribirte en ARCA/provincia.
                </p>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Dirección</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Calle y número</label>
                <input
                  type="text"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="Ej: San Martín 450"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Localidad</label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="Ej: Landeta, Santa Fe, Argentina"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
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

          {/* Historial de errores */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-gray-900">🪲 Historial de errores</h2>
              {errorLog.length > 0 && (
                <button
                  onClick={() => { clearErrorLog(); setErrorLog([]); }}
                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                >
                  Limpiar todo
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Últimos {errorLog.length} errores de la aplicación (máx. 100). Útil para diagnóstico.
            </p>
            {errorLog.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">No hay errores registrados ✅</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {errorLog.map((e) => (
                  <div key={e.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {e.code}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(e.timestamp).toLocaleString('es-AR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-800">{e.message}</p>
                    {e.context && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Contexto: {e.context}</p>
                    )}
                    {e.details && e.details.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {e.details.map((d, i) => (
                          <li key={i} className="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded">
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset de datos de prueba — solo para testing */}
          <div className="border-t pt-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-1">
              Zona de testing
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Borra productos, stock, ventas, caja y clientes, y vuelve a cargar los datos de
              prueba desde cero. No afecta la configuración del negocio ni el usuario admin.
              <strong className="text-red-500"> Esta acción no se puede deshacer.</strong>
            </p>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder='Escribí "BORRAR" para confirmar'
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={() => void handleResetDemoData()}
                disabled={resetWorking || resetConfirmText !== 'BORRAR'}
                className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {resetWorking ? 'Reiniciando...' : 'Reiniciar datos de prueba'}
              </button>
            </div>
            {resetResult && (
              <p className={`text-xs mt-2 ${resetResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                {resetResult.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Unidades de negocio */}
      {activeTab === 'unidades' && <BusinessUnitsPage />}

      {/* Tab: Catálogo web */}
      {activeTab === 'catalogo' && (
        <div className="space-y-6 max-w-lg">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Catálogo web</h2>
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
        </div>
      )}

      {/* Tab: Categorías */}
      {activeTab === 'categorias' && (
        <div className="max-w-lg">
          <h2 className="text-base font-bold text-gray-900 mb-1">Categorías de productos</h2>
          <p className="text-xs text-gray-500 mb-4">
            Administrá las categorías disponibles para esta unidad de negocio.
          </p>

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
      )}

      {/* Tab: Medios de pago */}
      {activeTab === 'medios' && (
        <div className="max-w-lg">
          <h2 className="text-base font-bold text-gray-900 mb-1">Medios de pago</h2>
          <p className="text-xs text-gray-500 mb-4">
            Los medios activos son los que aparecen para elegir en el punto de venta y en los
            movimientos manuales de caja.
          </p>
          <div className="space-y-1">
            {paymentMethodsList.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No hay medios de pago configurados.</p>
            )}
            {paymentMethodsList.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={m.isActive}
                  disabled={paymentMethodWorking === m.id}
                  onChange={(e) => void handleTogglePaymentMethod(m.id, e.target.checked)}
                  className="accent-blue-600"
                />
                <span className={`flex-1 text-sm ${m.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                  {m.label}
                </span>
                <span className="text-[10px] font-mono text-gray-400">{m.code}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Impresora */}
      {activeTab === 'impresora' && <PrinterSettingsTab />}
    </div>
  );
}
