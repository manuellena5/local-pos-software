import { useState, useEffect, useCallback } from 'react';
import { salesApi } from '@/lib/api/sales';
import type { Sale, SaleFilters } from '@shared/types';

// Default: últimos 7 días
function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface UseSalesFilters extends SaleFilters {
  dateFrom: string;
  dateTo: string;
}

export function useSales(businessUnitId: number | undefined) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseSalesFilters>({
    dateFrom: defaultDateFrom(),
    dateTo: defaultDateTo(),
    status: 'all',
    paymentMethod: undefined,
    search: undefined,
  });

  const fetchSales = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.listFiltered(businessUnitId, filters);
      setSales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, filters]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return { sales, loading, error, filters, setFilters, refetch: fetchSales };
}
