import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { apiClient } from '@/lib/api/client';
import type { Supplier } from '@shared/types';

export function useSuppliers() {
  const activeBU = useAppStore((s) => s.activeBU);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    if (!activeBU) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Supplier[]>(
        `/api/modules/proveedores/suppliers?buId=${activeBU.id}`,
      );
      setSuppliers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proveedores');
    } finally {
      setIsLoading(false);
    }
  }, [activeBU]);

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  return { suppliers, isLoading, error, refetch: fetchSuppliers };
}
