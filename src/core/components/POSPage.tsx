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
      <div className="flex-1 flex flex-col gap-3 min-w-0 pr-4 overflow-hidden">
        <POSProductSearch businessUnitId={businessUnitId} stockData={stockData} />
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <POSCart stockData={stockData} />
        </div>
      </div>

      {/* ── Columna derecha: panel fijo 380px con scroll interno ── */}
      <div className="w-96 flex-shrink-0 overflow-y-auto border-l border-gray-200 pl-4">
        <div className="bg-white pb-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 pt-1">
            Resumen de la venta
          </h2>
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
