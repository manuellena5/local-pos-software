import { useState, useEffect } from 'react';
import { MODULE_REGISTRY } from '@shared/module-registry';
import type { BusinessUnit } from '@shared/types';
import type { CreateBusinessUnitInput, UpdateBusinessUnitInput } from '@/lib/api/businessUnits';

// Módulos asignables a una BU (excluye módulos transversales como proveedores)
const BU_MODULES = MODULE_REGISTRY.filter((m) => !m.availableForAllBUs);

interface FormValues {
  name: string;
  description: string;
  moduleId: string;
  invoicePrefix: string;
}

interface FormErrors {
  name?: string;
  moduleId?: string;
  invoicePrefix?: string;
}

interface Props {
  /** Si se pasa, es modo edición; si no, es modo creación */
  editingUnit?: BusinessUnit | null;
  saving: boolean;
  onSubmit: (data: CreateBusinessUnitInput | UpdateBusinessUnitInput) => void;
  onCancel: () => void;
}

function validate(values: FormValues, isEditing: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = 'El nombre es obligatorio';
  else if (values.name.length > 100) errors.name = 'Máximo 100 caracteres';

  if (!isEditing && !values.moduleId) errors.moduleId = 'Seleccioná un módulo';

  if (!values.invoicePrefix) errors.invoicePrefix = 'Requerido';
  else if (!/^[A-Z]$/.test(values.invoicePrefix)) errors.invoicePrefix = 'Debe ser una letra mayúscula (A–Z)';

  return errors;
}

export function BusinessUnitForm({ editingUnit, saving, onSubmit, onCancel }: Props) {
  const isEditing = Boolean(editingUnit);

  const [values, setValues] = useState<FormValues>({
    name: editingUnit?.name ?? '',
    description: editingUnit?.description ?? '',
    moduleId: editingUnit?.moduleId ?? '',
    invoicePrefix: editingUnit?.invoicePrefix ?? 'A',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);

  // Sincronizar cuando cambia la unidad a editar
  useEffect(() => {
    setValues({
      name: editingUnit?.name ?? '',
      description: editingUnit?.description ?? '',
      moduleId: editingUnit?.moduleId ?? '',
      invoicePrefix: editingUnit?.invoicePrefix ?? 'A',
    });
    setErrors({});
    setTouched(false);
  }, [editingUnit]);

  function handleChange(field: keyof FormValues, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched) setErrors(validate(next, isEditing));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const errs = validate(values, isEditing);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    if (isEditing) {
      const data: UpdateBusinessUnitInput = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        invoicePrefix: values.invoicePrefix,
      };
      onSubmit(data);
    } else {
      const data: CreateBusinessUnitInput = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        moduleId: values.moduleId,
        invoicePrefix: values.invoicePrefix,
      };
      onSubmit(data);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Nombre */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ej: Front, Back, Taller…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          value={values.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Descripción opcional de la unidad de negocio"
          rows={2}
          maxLength={300}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Módulo — selector solo en creación */}
      {!isEditing && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Módulo vertical <span className="text-red-500">*</span>
          </label>
          <select
            value={values.moduleId}
            onChange={(e) => handleChange('moduleId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Seleccioná un módulo…</option>
            {BU_MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {errors.moduleId && <p className="text-xs text-red-500 mt-1">{errors.moduleId}</p>}
          <p className="text-xs text-gray-400 mt-1">
            El módulo no se puede cambiar una vez creada la unidad.
          </p>
        </div>
      )}

      {/* Módulo — solo lectura en edición */}
      {isEditing && editingUnit && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Módulo vertical</label>
          <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
            {BU_MODULES.find((m) => m.id === editingUnit.moduleId)?.name ?? editingUnit.moduleId}
          </div>
          <p className="text-xs text-gray-400 mt-1">El módulo no puede modificarse.</p>
        </div>
      )}

      {/* Prefijo de factura */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Prefijo de factura <span className="text-red-500">*</span>
        </label>
        <input
          value={values.invoicePrefix}
          onChange={(e) => handleChange('invoicePrefix', e.target.value.toUpperCase().slice(0, 1))}
          maxLength={1}
          placeholder="A"
          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.invoicePrefix && (
          <p className="text-xs text-red-500 mt-1">{errors.invoicePrefix}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Letra que identifica el punto de venta AFIP (ej: A para el local principal).
        </p>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear unidad'}
        </button>
      </div>
    </form>
  );
}
