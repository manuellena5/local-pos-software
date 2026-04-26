import { useState } from 'react';
import { useProductForm } from '@/core/hooks/useProductForm';

interface ProductFormProps {
  businessUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ businessUnitId, onClose, onSuccess }: ProductFormProps) {
  const { formData, setFormData, errors, isSubmitting, onSubmit } =
    useProductForm(businessUnitId, onSuccess);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Crear producto</h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}

          <input
            type="text"
            placeholder="SKU *"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.sku && <p className="text-red-500 text-xs">{errors.sku}</p>}

          <input
            type="text"
            placeholder="Categoría"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />

          <input
            type="text"
            placeholder="Costo *"
            value={formData.costPrice || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              if (!isNaN(val) || e.target.value === '') {
                setFormData({ ...formData, costPrice: val });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.costPrice && <p className="text-red-500 text-xs">{errors.costPrice}</p>}

          <input
            type="text"
            placeholder="Precio venta *"
            value={formData.basePrice || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              if (!isNaN(val) || e.target.value === '') {
                setFormData({ ...formData, basePrice: val });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.basePrice && <p className="text-red-500 text-xs">{errors.basePrice}</p>}

          {errors._form && <p className="text-red-500 text-sm">{errors._form}</p>}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
