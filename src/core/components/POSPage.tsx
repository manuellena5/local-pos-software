import { useState, useCallback, useEffect, useRef } from 'react';
import { ScanBarcode } from 'lucide-react';
import { POSProductSearch } from './POSProductSearch';
import { POSCart } from './POSCart';
import { POSCheckout } from './POSCheckout';
import { useStockData } from '@/core/hooks/useStockData';
import { useCashbox } from '@/core/hooks/useCashbox';
import { useBarcodeScanner } from '@/core/pos/hooks/useBarcodeScanner';
import { usePOSStore } from '@/core/store/posStore';
import { getPOSOverlayComponents } from '@/core/api/extensions';
import { productsApi } from '@/lib/api/products';
import { getDisplayPrice } from '@/lib/utils/pricing';

interface POSPageProps {
  businessUnitId: number;
}

interface ScanToast {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export function POSPage({ businessUnitId }: POSPageProps) {
  const { stockData, refetch: refetchStock } = useStockData(businessUnitId);
  const { sessionStatus, loading: cashLoading } = useCashbox(businessUnitId);
  const addToCart = usePOSStore((s) => s.addToCart);
  const [toast, setToast] = useState<ScanToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss toast después de 2.5 segundos
  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toast]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const handleScan = useCallback(async (barcode: string) => {
    try {
      const result = await productsApi.findByBarcode(barcode, businessUnitId);
      if (!result.found) {
        showToast(`Código no encontrado: ${barcode}`, 'error');
        return;
      }
      const { item } = result;
      if (item.stock <= 0) {
        showToast(`Sin stock: ${item.name}`, 'error');
        return;
      }
      addToCart({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: 1,
        unitPrice: getDisplayPrice(item.basePrice, item.taxRate),
        taxRate: item.taxRate,
        discountPercent: 0,
      });
      showToast(`✓ ${item.name} agregado`, 'success');
    } catch {
      showToast('Error al buscar el producto', 'error');
    }
  }, [businessUnitId, addToCart, showToast]);

  useBarcodeScanner({ onScan: handleScan });

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
      className="flex gap-0 overflow-hidden min-h-[480px] relative"
      style={{ height: 'calc(100vh - 130px)' }}
    >
      {/* Toast de scanner — no bloqueante, top-center */}
      {toast && (
        <div
          key={toast.id}
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none animate-fade-in ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <ScanBarcode size={15} className="shrink-0" />
          {toast.message}
        </div>
      )}

      {/* ── Columna izquierda: búsqueda fija + carrito scrollable ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 pr-3 overflow-hidden">
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

      {/* Overlays de módulos (ej. VariantSelectorOverlay) */}
      {getPOSOverlayComponents().map((Overlay, i) => (
        <Overlay key={i} />
      ))}
    </div>
  );
}
