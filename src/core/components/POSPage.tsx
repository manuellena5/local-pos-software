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
    <div className="flex gap-4 h-full min-h-[600px]">
      {/* ── Columna izquierda: búsqueda + tabla de carrito (60%) ── */}
      <div className="flex-[3] flex flex-col gap-3 min-w-0">
        <POSProductSearch businessUnitId={businessUnitId} stockData={stockData} />
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <POSCart stockData={stockData} />
        </div>
      </div>

      {/* ── Columna derecha: resumen + acciones (40%) ── */}
      <div className="flex-[2] min-w-0 overflow-y-auto">
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
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
