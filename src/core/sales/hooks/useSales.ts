import { useState, useEffect, useCallback } from 'react';
import { salesApi } from '@/lib/api/sales';
import type { SaleListEntry, SaleFilters } from '@shared/types';

// sales.createdAt se guarda en UTC — estos defaults deben calcularse en hora
// LOCAL, o "hoy" pediría el día siguiente apenas UTC cruza medianoche
// (~21:00 ART), dejando afuera ventas recientes.
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Default: últimos 7 días
function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return formatLocalDate(d);
}

function defaultDateTo(): string {
  return formatLocalDate(new Date());
}

export interface UseSalesFilters extends SaleFilters {
  dateFrom: string;
  dateTo: string;
  cashSessionId?: number;
}

export function useSales(businessUnitId: number | undefined) {
  const [sales, setSales] = useState<SaleListEntry[]>([]);
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
