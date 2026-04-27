import { POSProductSearch } from './POSProductSearch';
import { POSCart } from './POSCart';
import { POSDiscountSection } from './POSDiscountSection';
import { POSPaymentMethods } from './POSPaymentMethods';
import { POSCheckout } from './POSCheckout';
import { useStockData } from '@/core/hooks/useStockData';

interface POSPageProps {
  businessUnitId: number;
}

export function POSPage({ businessUnitId }: POSPageProps) {
  const { stockData, refetch: refetchStock } = useStockData(businessUnitId);

  return (
    <div className="flex gap-4 h-full min-h-[600px]">
      {/* Columna izquierda: búsqueda + carrito (60%) */}
      <div className="flex-[3] flex flex-col gap-3 min-w-0">
        <POSProductSearch businessUnitId={businessUnitId} stockData={stockData} />
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          <POSCart stockData={stockData} />
        </div>
      </div>

      {/* Columna derecha: descuento + pago + checkout (40%) */}
      <div className="flex-[2] flex flex-col gap-3 min-w-0">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Descuento</h3>
          <POSDiscountSection />
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Medios de pago</h3>
          <POSPaymentMethods />
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
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
