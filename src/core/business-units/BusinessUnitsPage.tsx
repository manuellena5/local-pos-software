import { useState } from 'react';
import { useBusinessUnits } from './hooks/useBusinessUnits';
import { BusinessUnitForm } from './components/BusinessUnitForm';
import { MODULE_REGISTRY } from '@shared/module-registry';
import type { BusinessUnit } from '@shared/types';
import type { CreateBusinessUnitInput, UpdateBusinessUnitInput } from '@/lib/api/businessUnits';

function moduleName(moduleId: string): string {
  return MODULE_REGISTRY.find((m) => m.id === moduleId)?.name ?? moduleId;
}

function moduleColor(moduleId: string): string {
  const colors: Record<string, string> = {
    'retail-general': 'bg-green-100 text-green-700',
    'retail-textil': 'bg-purple-100 text-purple-700',
    'taller-medida': 'bg-orange-100 text-orange-700',
  };
  return colors[moduleId] ?? 'bg-gray-100 text-gray-600';
}

type PanelMode = 'create' | 'edit' | null;

export function BusinessUnitsPage() {
  const { units, loading, error, creating, saving, createUnit, updateUnit, toggleActive } =
    useBusinessUnits();

  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingUnit, setEditingUnit] = useState<BusinessUnit | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  function openCreate() {
    setEditingUnit(null);
    setPanelMode('create');
    setActionError(null);
    setSuccessMsg(null);
  }

  function openEdit(unit: BusinessUnit) {
    setEditingUnit(unit);
    setPanelMode('edit');
    setActionError(null);
    setSuccessMsg(null);
  }

  function closePanel() {
    setPanelMode(null);
    setEditingUnit(null);
    setActionError(null);
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleSubmit(data: CreateBusinessUnitInput | UpdateBusinessUnitInput) {
    setActionError(null);
    try {
      if (panelMode === 'create') {
        await createUnit(data as CreateBusinessUnitInput);
        showSuccess('Unidad de negocio creada correctamente.');
        closePanel();
      } else if (panelMode === 'edit' && editingUnit) {
        await updateUnit(editingUnit.id, data as UpdateBusinessUnitInput);
        showSuccess('Cambios guardados.');
        closePanel();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  async function handleToggle(unit: BusinessUnit) {
    setTogglingId(unit.id);
    setActionError(null);
    try {
      await toggleActive(unit.id);
      showSuccess(
        unit.isActive
          ? `"${unit.name}" desactivada.`
          : `"${unit.name}" activada.`,
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setTogglingId(null);
    }
  }

  const hasPanel = panelMode !== null;

  return (
    <div className="flex gap-4" style={{ minHeight: '600px' }}>
      {/* ── COLUMNA IZQUIERDA — Lista ─────────────────────────────────── */}
      <div className={`flex flex-col ${hasPanel ? 'w-96 flex-shrink-0' : 'flex-1'} transition-all`}>
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-gray-900">Unidades de negocio</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Gestioná las unidades de negocio de la instalación
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nueva unidad
          </button>
        </div>

        {/* Feedback global */}
        {successMsg && (
          <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            {successMsg}
          </div>
        )}
        {actionError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {actionError}
          </div>
        )}

        {/* Lista */}
        {loading && (
          <p className="text-sm text-gray-400 text-center py-8">Cargando…</p>
        )}
        {error && (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        )}
        {!loading && !error && units.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No hay unidades de negocio configuradas.</p>
            <p className="text-xs mt-1">Creá la primera con el botón de arriba.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {units.map((unit) => (
            <div
              key={unit.id}
              className={`border rounded-xl p-4 transition-all ${
                editingUnit?.id === unit.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${!unit.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* Info izquierda */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {unit.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${moduleColor(unit.moduleId)}`}
                    >
                      {moduleName(unit.moduleId)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        unit.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {unit.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  {unit.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{unit.description}</p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    Prefijo: <span className="font-mono font-semibold">{unit.invoicePrefix}</span>
                    {' · '}
                    Última factura: #{unit.lastInvoiceNumber}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(unit)}
                    className="px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(unit)}
                    disabled={togglingId === unit.id}
                    className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                      unit.isActive
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    } disabled:opacity-50`}
                  >
                    {togglingId === unit.id
                      ? '…'
                      : unit.isActive
                        ? 'Desactivar'
                        : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── COLUMNA DERECHA — Form ────────────────────────────────────── */}
      {hasPanel && (
        <div className="flex-1 min-w-0 border-l border-gray-100 pl-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              {panelMode === 'create' ? 'Nueva unidad de negocio' : `Editar "${editingUnit?.name}"`}
            </h2>
            <button
              onClick={closePanel}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              ✕ Cerrar
            </button>
          </div>

          {actionError && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {actionError}
            </div>
          )}

          <BusinessUnitForm
            editingUnit={editingUnit}
            saving={creating || saving}
            onSubmit={handleSubmit}
            onCancel={closePanel}
          />
        </div>
      )}
    </div>
  );
}
