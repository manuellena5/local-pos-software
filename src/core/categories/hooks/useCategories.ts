import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { categoriesApi } from '@/lib/api/categories';
import type { Category } from '@shared/types';

export function useCategories() {
  const activeBU = useAppStore((s) => s.activeBU);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!activeBU) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await categoriesApi.list(activeBU.id);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  }, [activeBU]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, error, refetch: fetchCategories };
}
