import { useState } from 'react';
import { useCreateFromSupplier } from '../hooks/useComparator';
import type { SupplierProduct, UnlinkedSupplierProduct } from '@shared/types';

interface AddToCatalogModalProps {
  /** Puede recibir un SupplierProduct (desde catálogo) o un UnlinkedSupplierProduct (desde comparador) */
  supplierProduct: SupplierProduct | UnlinkedSupplierProduct;
  businessUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function getSpId(sp: SupplierProduct | UnlinkedSupplierProduct): number {
  return 'supplierProductId' in sp ? sp.supplierProductId : sp.id;
}

function getUnitCost(sp: SupplierProduct | UnlinkedSupplierProduct): number {
  return sp.unitCost;
}

export function AddToCatalogModal({ supplierProduct, businessUnitId, onClose, onSuccess }: AddToCatalogModalProps) {
  const { createProduct, isCreating, error } = useCreateFromSupplier();

  const defaultCost = getUnitCost(supplierProduct);
  const defaultDescription = 'description' in supplierProduct ? (supplierProduct.description ?? '') : '';
  const defaultCategory    = 'categoryHint' in supplierProduct ? (supplierProduct.categoryHint ?? undefined) : undefined;

  const [name,          setName]          = useState(supplierProduct.name);
  const [description,   setDescription]   = useState(defaultDescription);
  const [salePrice,     setSalePrice]     = useState('');
  const [costPrice,     setCostPrice]     = useState(String(defaultCost));
  const [initialStock,  setInitialStock]  = useState('');
  const [formError,     setFormError]     = useState<string | null>(null);

  // Margen calculado en tiempo real
  const salePriceNum = parseFloat(salePrice);
  const costPriceNum = parseFloat(costPrice);
  const margin = !isNaN(salePriceNum) && salePriceNum > 0 && !isNaN(costPriceNum)
    ? Math.round(((salePriceNum - costPriceNum) / salePriceNum) * 100 * 10) / 10
    : null;

  const marginColor = margin === null ? '' :
    margin >= 30 ? 'text-green-600' :
    margin >= 15 ? 'text-yellow-600' :
    'text-red-600';

  async function handleSubmit() {
    setFormError(null);

    if (!name.trim()) { setFormError('El nombre es obligatorio'); return; }
    if (isNaN(salePriceNum) || salePriceNum <= 0) { setFormError('El precio de venta debe ser mayor a 0'); return; }

    const result = await createProduct({
      supplierProductId: getSpId(supplierProduct),
      businessUnitId,
      name:         name.trim(),
      salePrice:    salePriceNum,
      costPrice:    isNaN(costPriceNum) ? null : costPriceNum,
      initialStock: initialStock !== '' ? parseInt(initialStock, 10) : null,
      categoryName: defaultCategory ?? null,
      description:  description.trim() || null,
    });

    if (result) onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 space-y-3">
          <h3 className="text-base font-bold text-gray-900">Agregar al catálogo</h3>
          <p className="text-xs text-gray-400">
            Origen: <span className="font-medium text-gray-600">{supplierProduct.name}</span>
            {' · '}costo proveedor: <span className="font-medium text-gray-600">
              $ {defaultCost.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre en tu catálogo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del producto"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Precio venta + costo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Precio de venta $ *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Costo $</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Hint de margen */}
          {margin !== null && (
            <p className={`text-xs font-medium ${marginColor}`}>
              Margen: {margin}%
              {margin < 15 && ' ⚠ Margen bajo'}
              {margin >= 30 && ' ✓ Buen margen'}
            </p>
          )}

          {/* Stock inicial */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stock inicial (opcional)</label>
            <input
              type="number"
              min={0}
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {(formError ?? error) && (
            <p className="text-sm text-red-500">{formError ?? error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Creando…' : 'Crear producto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
