import { useState } from 'react';
import { useSales } from './hooks/useSales';
import { SalesList } from './components/SalesList';
import { SaleDetail } from './components/SaleDetail';
import type { Sale } from '@shared/types';

interface Props {
  businessUnitId: number;
}

export function SalesPage({ businessUnitId }: Props) {
  const { sales, loading, filters, setFilters, refetch } = useSales(businessUnitId);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  function handleSaleUpdated(updated: Sale) {
    // Actualiza la fila en la lista sin recargar todo
    setSelectedSale(updated);
    refetch();
  }

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: '600px' }}>
      {/* COLUMNA IZQUIERDA — Lista */}
      <div
        className={`flex flex-col ${
          selectedSale ? 'w-96 flex-shrink-0' : 'flex-1'
        } transition-all`}
      >
        <div className="mb-3">
          <h1 className="text-base font-bold text-gray-900">Ventas</h1>
          <p className="text-xs text-gray-400 mt-0.5">Historial y gestión de ventas de la unidad activa</p>
        </div>
        <div className="flex-1 min-h-0">
          <SalesList
            sales={sales}
            loading={loading}
            filters={filters}
            onFiltersChange={setFilters}
            selectedId={selectedSale?.id ?? null}
            onSelect={setSelectedSale}
          />
        </div>
      </div>

      {/* COLUMNA DERECHA — Detalle */}
      {selectedSale && (
        <div className="flex-1 min-w-0 border-l border-gray-100 pl-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Detalle</h2>
            <button
              onClick={() => setSelectedSale(null)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              ✕ Cerrar
            </button>
          </div>
          <SaleDetail
            sale={selectedSale}
            businessUnitId={businessUnitId}
            onSaleUpdated={handleSaleUpdated}
          />
        </div>
      )}

      {/* Empty state cuando no hay selección */}
      {!selectedSale && !loading && sales.length > 0 && (
        <div className="hidden" />
      )}
    </div>
  );
}
