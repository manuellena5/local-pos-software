import { useEffect, useState } from 'react';
import { stockApi } from '@/lib/api/stock';
import type { StockSummary } from '@shared/types';

export function useStockData(businessUnitId: number) {
  const [stockData, setStockData] = useState<Record<number, StockSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        setLoading(true);
        setError(null);
        const summary = await stockApi.getSummary(businessUnitId);
        const stockMap = summary.reduce(
          (acc, item) => {
            acc[item.productId] = item;
            return acc;
          },
          {} as Record<number, StockSummary>
        );
        setStockData(stockMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar stock');
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [businessUnitId]);

  return { stockData, loading, error };
}
