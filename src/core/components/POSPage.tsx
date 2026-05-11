import { POSProductSearch } from './POSProductSearch';
import { POSCart } from './POSCart';
import { POSCheckout } from './POSCheckout';
import { useStockData } from '@/core/hooks/useStockData';

interface POSPageProps {
  businessUnitId: number;
}

export function POSPage({ businessUnitId }: POSPageProps) {
  const { stockData, refetch: refetchStock } = useStockData(businessUnitId);

  return (
    <div className="flex gap-0 h-full overflow-hidden">
      {/* ── Columna izquierda: búsqueda fija + carrito scrollable ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 pr-4 overflow-hidden">
        {/* Búsqueda: altura fija, no crece */}
        <div className="shrink-0">
          <POSProductSearch businessUnitId={businessUnitId} stockData={stockData} />
        </div>
        {/* Carrito: ocupa el resto, scrollea internamente */}
        <div className="flex-1 min-h-0 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <POSCart stockData={stockData} />
        </div>
      </div>

      {/* ── Columna derecha: 380px fija, scroll interno ── */}
      <div className="w-96 shrink-0 min-h-0 flex flex-col border-l border-gray-200 pl-4 overflow-hidden">
        <h2 className="shrink-0 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 pt-1">
          Resumen de la venta
        </h2>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <POSCheckout
            businessUnitId={businessUnitId}
            stockData={stockData}
            onSaleComplete={refetchStock}
          />
        </div>
      </div>
    </div>
  );
}
