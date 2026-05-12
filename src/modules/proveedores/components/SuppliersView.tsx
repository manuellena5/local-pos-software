import { useState } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { apiClient } from '@/lib/api/client';
import { useSuppliers } from '../hooks/useSuppliers';
import { SupplierForm } from './SupplierForm';
import type { Supplier } from '@shared/types';

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  contado: 'Contado',
  '15dias': '15 días',
  '30dias': '30 días',
  '60dias': '60 días',
  otro: 'Otro',
};

type ViewMode = 'list' | { catalog: number };

export function SuppliersView() {
  const activeBU = useAppStore((s) => s.activeBU);
  const { suppliers, isLoading, error, refetch } = useSuppliers();

  const [showForm, setShowForm]         = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewMode, setViewMode]         = useState<ViewMode>('list');
  const [deleteError, setDeleteError]   = useState<string | null>(null);
  const [deleting, setDeleting]         = useState<number | null>(null);

  if (!activeBU) return null;

  // ── Vista "catálogo" placeholder ─────────────────────────────────────────
  if (typeof viewMode === 'object' && 'catalog' in viewMode) {
    const supplier = suppliers.find((s) => s.id === viewMode.catalog);
    return (
      <div className="space-y-4">
        <button
          onClick={() => setViewMode('list')}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Volver a proveedores
        </button>
        <div className="border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-2xl mb-3">📦</p>
          <p className="text-base font-semibold text-gray-700">
            Catálogo de {supplier?.name ?? 'proveedor'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Próximamente — catálogo del proveedor (Paso 3)
          </p>
        </div>
      </div>
    );
  }

  // ── Eliminar proveedor ───────────────────────────────────────────────────
  async function handleDelete(supplier: Supplier) {
    if (!activeBU) return;
    setDeleting(supplier.id);
    setDeleteError(null);
    try {
      await apiClient.delete(
        `/api/modules/proveedores/suppliers/${supplier.id}?buId=${activeBU.id}`,
      );
      await refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  // ── Lista principal ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Proveedores</h2>
        <button
          onClick={() => { setEditingSupplier(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nuevo proveedor
        </button>
      </div>

      {deleteError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {deleteError}
        </p>
      )}

      {/* Tabla */}
      {isLoading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando proveedores…</p>
      ) : error ? (
        <p className="text-sm text-red-500 py-4">{error}</p>
      ) : suppliers.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-2xl mb-2">🏭</p>
          <p className="text-sm font-medium text-gray-500">No hay proveedores todavía</p>
          <p className="text-xs text-gray-400 mt-1">
            Hacé clic en &ldquo;+ Nuevo proveedor&rdquo; para agregar el primero.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Contacto</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Condición pago</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Entrega (días)</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Productos</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-900">{supplier.name}</p>
                    {supplier.email && (
                      <p className="text-xs text-gray-400">{supplier.email}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {supplier.contactName ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {supplier.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {supplier.paymentTerms ? (
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {PAYMENT_TERMS_LABELS[supplier.paymentTerms] ?? supplier.paymentTerms}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-600">
                    {supplier.deliveryDays != null ? supplier.deliveryDays : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {/* TODO (Paso 3): mostrar count real de productos */}
                    <span className="text-gray-400">0</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => { setEditingSupplier(supplier); setShowForm(true); }}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setViewMode({ catalog: supplier.id })}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                      >
                        Ver catálogo
                      </button>
                      <button
                        onClick={() => void handleDelete(supplier)}
                        disabled={deleting === supplier.id}
                        className="px-2.5 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                      >
                        {deleting === supplier.id ? '…' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <SupplierForm
          supplier={editingSupplier ?? undefined}
          onClose={() => { setShowForm(false); setEditingSupplier(null); }}
          onSuccess={() => void refetch()}
        />
      )}
    </div>
  );
}
