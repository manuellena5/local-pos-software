import { POSProductSearch } from './POSProductSearch';
import { POSCart } from './POSCart';
import { POSCheckout } from './POSCheckout';
import { useStockData } from '@/core/hooks/useStockData';
import { useCashbox } from '@/core/hooks/useCashbox';

interface POSPageProps {
  businessUnitId: number;
}

export function POSPage({ businessUnitId }: POSPageProps) {
  const { stockData, refetch: refetchStock } = useStockData(businessUnitId);
  const { sessionStatus, loading: cashLoading } = useCashbox(businessUnitId);

  const isCajaOpen = sessionStatus === 'open';

  if (!cashLoading && !isCajaOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
        <div className="text-5xl">🔒</div>
        <p className="text-lg font-semibold text-gray-700">No hay caja abierta</p>
        <p className="text-sm text-gray-400">
          Abrí una nueva sesión desde la sección{' '}
          <span className="font-medium text-gray-600">Caja</span> para empezar a vender.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex gap-0 overflow-hidden min-h-[480px]"
      style={{ height: 'calc(100vh - 130px)' }}
    >
      {/* ── Columna izquierda: búsqueda fija + carrito scrollable ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 pr-3 overflow-hidden">
        {/* Búsqueda: altura fija */}
        <div className="shrink-0 pb-2">
          <POSProductSearch businessUnitId={businessUnitId} stockData={stockData} />
        </div>
        {/* Carrito: ocupa el resto, scrollea internamente */}
        <div className="flex-1 min-h-0 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <POSCart stockData={stockData} />
        </div>
      </div>

      {/* ── Columna derecha: 340px fija, NO scroll externo ── */}
      <div className="w-[340px] shrink-0 min-h-0 flex flex-col border-l border-gray-200 overflow-hidden">
        <POSCheckout
          businessUnitId={businessUnitId}
          stockData={stockData}
          onSaleComplete={refetchStock}
        />
      </div>
    </div>
  );
}
