import { useState, useEffect, useRef } from 'react';
import { useSales } from './hooks/useSales';
import { SalesList } from './components/SalesList';
import { SaleDetail } from './components/SaleDetail';
import type { Sale, SaleListEntry } from '@shared/types';

interface Props {
  businessUnitId: number;
  initialOpenSaleId?: number | null;
  onInitialSaleOpened?: () => void;
}

export function SalesPage({ businessUnitId, initialOpenSaleId, onInitialSaleOpened }: Props) {
  const { sales, loading, filters, setFilters, refetch } = useSales(businessUnitId);
  const [selectedSale, setSelectedSale] = useState<SaleListEntry | null>(null);
  const handledInitialRef = useRef(false);

  useEffect(() => {
    if (!initialOpenSaleId || loading || handledInitialRef.current) return;
    const found = sales.find((s) => s.id === initialOpenSaleId);
    if (found) {
      handledInitialRef.current = true;
      setSelectedSale(found);
      onInitialSaleOpened?.();
    }
  }, [initialOpenSaleId, sales, loading, onInitialSaleOpened]);

  function handleSaleUpdated(updated: Sale) {
    if (selectedSale) setSelectedSale({ ...selectedSale, ...updated });
    refetch();
  }

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* PANEL IZQUIERDO — Lista (flex-1: ocupa el espacio restante) */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100 min-w-0">
        <div className="shrink-0 pb-3">
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
            businessUnitId={businessUnitId}
          />
        </div>
      </div>

      {/* PANEL DERECHO — Detalle (ancho fijo, solo visible cuando hay selección) */}
      {selectedSale && (
        <div className="flex flex-col overflow-hidden min-h-0" style={{ width: '380px', flexShrink: 0 }}>
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Detalle</h2>
            <button
              onClick={() => setSelectedSale(null)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden px-4">
            <SaleDetail
              sale={selectedSale}
              businessUnitId={businessUnitId}
              onSaleUpdated={handleSaleUpdated}
            />
          </div>
        </div>
      )}
    </div>
  );
}
