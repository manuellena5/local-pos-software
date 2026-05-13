import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { SupplierProduct, ImportResult } from '@shared/types';

export function useSupplierProducts(supplierId: number) {
  const [products, setProducts]   = useState<SupplierProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<SupplierProduct[]>(
        `/api/modules/proveedores/suppliers/${supplierId}/products`,
      );
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refetch: fetchProducts };
}

export function useImportCatalog() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult]           = useState<ImportResult | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const importCatalog = useCallback(
    async (supplierId: number, businessUnitId: number, file: File) => {
      setIsImporting(true);
      setResult(null);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(
          `/api/modules/proveedores/suppliers/${supplierId}/import?buId=${businessUnitId}`,
          { method: 'POST', body: formData },
        );

        const json = await res.json() as { data: ImportResult | null; error: { message: string } | null };

        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? `Error ${res.status}`);
        }
        setResult(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al importar');
      } finally {
        setIsImporting(false);
      }
    },
    [],
  );

  return { importCatalog, isImporting, result, error, reset: () => { setResult(null); setError(null); } };
}
