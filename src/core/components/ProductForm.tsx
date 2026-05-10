import { useProductForm } from '@/core/hooks/useProductForm';
import { useProductExtensions } from '@/core/api';
import type { Product } from '@shared/types';

interface ProductFormProps {
  businessUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
  /** Cuando se pasa, el formulario trabaja en modo edición. */
  existingProduct?: Product;
}

export function ProductForm({ businessUnitId, onClose, onSuccess, existingProduct }: ProductFormProps) {
  const { formData, setFormData, errors, isSubmitting, onSubmit, isEditMode } =
    useProductForm(businessUnitId, onSuccess, existingProduct);

  const extensions = useProductExtensions();
  // Las extensiones solo se muestran en modo edición (necesitan productId existente)
  const productId  = existingProduct?.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">
            {isEditMode ? 'Editar producto' : 'Crear producto'}
          </h2>

          <div className="space-y-3">
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

            <textarea
              placeholder="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Costo *"
                  value={formData.costPrice || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    if (!isNaN(val) || e.target.value === '') setFormData({ ...formData, costPrice: val });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {errors.costPrice && <p className="text-red-500 text-xs mt-0.5">{errors.costPrice}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Precio venta *"
                  value={formData.basePrice || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    if (!isNaN(val) || e.target.value === '') setFormData({ ...formData, basePrice: val });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {errors.basePrice && <p className="text-red-500 text-xs mt-0.5">{errors.basePrice}</p>}
              </div>
            </div>

            {errors._form && <p className="text-red-500 text-sm">{errors._form}</p>}
          </div>

          {/* Extensiones de módulos (solo en modo edición, cuando ya existe productId) */}
          {isEditMode && productId !== undefined && extensions.map((Ext) => (
            <Ext.component key={Ext.name} productId={productId} businessUnitId={businessUnitId} />
          ))}

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cerrar
            </button>
            <button
              onClick={() => void onSubmit()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
