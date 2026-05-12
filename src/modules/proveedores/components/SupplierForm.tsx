import { useState, useEffect } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { apiClient } from '@/lib/api/client';
import type { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '@shared/types';

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  contado: 'Contado',
  '15dias': '15 días',
  '30dias': '30 días',
  '60dias': '60 días',
  otro: 'Otro',
};

interface SupplierFormProps {
  supplier?: Supplier;     // si se pasa → modo edición
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  paymentTerms: '' as Supplier['paymentTerms'] | '',
  deliveryDays: '',
  notes: '',
};

export function SupplierForm({ supplier, onClose, onSuccess }: SupplierFormProps) {
  const activeBU = useAppStore((s) => s.activeBU);
  const isEdit   = Boolean(supplier);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError]         = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name:         supplier.name,
        contactName:  supplier.contactName ?? '',
        phone:        supplier.phone ?? '',
        email:        supplier.email ?? '',
        paymentTerms: supplier.paymentTerms ?? '',
        deliveryDays: supplier.deliveryDays != null ? String(supplier.deliveryDays) : '',
        notes:        supplier.notes ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [supplier]);

  async function handleSubmit() {
    if (!activeBU) return;
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const deliveryDays = form.deliveryDays !== '' ? parseInt(form.deliveryDays, 10) : null;
      if (isEdit && supplier) {
        const body: UpdateSupplierDTO = {
          businessUnitId: activeBU.id,
          name:           form.name.trim(),
          contactName:    form.contactName.trim() || null,
          phone:          form.phone.trim() || null,
          email:          form.email.trim() || null,
          paymentTerms:   (form.paymentTerms as Supplier['paymentTerms']) || null,
          deliveryDays:   isNaN(deliveryDays as number) ? null : deliveryDays,
          notes:          form.notes.trim() || null,
        };
        await apiClient.put(`/api/modules/proveedores/suppliers/${supplier.id}`, body);
      } else {
        const body: CreateSupplierDTO = {
          businessUnitId: activeBU.id,
          name:           form.name.trim(),
          contactName:    form.contactName.trim() || null,
          phone:          form.phone.trim() || null,
          email:          form.email.trim() || null,
          paymentTerms:   (form.paymentTerms as Supplier['paymentTerms']) || null,
          deliveryDays:   isNaN(deliveryDays as number) ? null : deliveryDays,
          notes:          form.notes.trim() || null,
        };
        await apiClient.post('/api/modules/proveedores/suppliers', body);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar proveedor');
    } finally {
      setSubmitting(false);
    }
  }

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>

          <div className="space-y-3">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Nombre del proveedor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Contacto */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de contacto</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Teléfono + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="11-1234-5678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="proveedor@ejemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Condición de pago + Días entrega */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Condición de pago</label>
                <select
                  value={form.paymentTerms ?? ''}
                  onChange={(e) => set('paymentTerms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Sin definir —</option>
                  {Object.entries(PAYMENT_TERMS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Días de entrega</label>
                <input
                  type="number"
                  min={0}
                  value={form.deliveryDays}
                  onChange={(e) => set('deliveryDays', e.target.value)}
                  placeholder="Ej: 5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Observaciones, condiciones especiales…"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          <div className="flex gap-2 mt-5">
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
              {submitting ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear proveedor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
