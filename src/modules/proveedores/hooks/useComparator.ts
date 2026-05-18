import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type {
  ComparatorRow,
  SuggestedMatch,
  PurchaseOrder,
  ProductSupplierLink,
  UnlinkedSupplierProduct,
  CreateFromSupplierInput,
  Product,
} from '@shared/types';

// ── useComparatorData ─────────────────────────────────────────────────────

export function useComparatorData(businessUnitId: number | null) {
  const [rows, setRows]         = useState<ComparatorRow[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ComparatorRow[]>(
        `/api/modules/proveedores/comparator?buId=${businessUnitId}`,
      );
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar comparador');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { rows, isLoading, error, refetch };
}

// ── useSuggestedMatches ───────────────────────────────────────────────────

export function useSuggestedMatches(businessUnitId: number | null) {
  const [suggestions, setSuggestions] = useState<SuggestedMatch[]>([]);
  const [isLoading, setLoading]       = useState(false);

  const refetch = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<SuggestedMatch[]>(
        `/api/modules/proveedores/comparator/suggestions?buId=${businessUnitId}`,
      );
      setSuggestions(data);
    } catch {
      // sugerencias son best-effort: fallar en silencio
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { suggestions, isLoading, refetch };
}

// ── useProductLinks ───────────────────────────────────────────────────────

export function useProductLinks() {
  const [isWorking, setWorking] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function createLink(
    productId: number,
    supplierProductId: number,
    businessUnitId: number,
  ): Promise<ProductSupplierLink | null> {
    setWorking(true);
    setError(null);
    try {
      return await apiClient.post<ProductSupplierLink>(
        '/api/modules/proveedores/links',
        { productId, supplierProductId, businessUnitId },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al vincular');
      return null;
    } finally {
      setWorking(false);
    }
  }

  async function setPreferred(linkId: number): Promise<boolean> {
    setWorking(true);
    setError(null);
    try {
      await apiClient.put(`/api/modules/proveedores/links/${linkId}/preferred`, {});
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar preferido');
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function deleteLink(linkId: number): Promise<boolean> {
    setWorking(true);
    setError(null);
    try {
      await apiClient.delete(`/api/modules/proveedores/links/${linkId}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar vínculo');
      return false;
    } finally {
      setWorking(false);
    }
  }

  return { createLink, setPreferred, deleteLink, isWorking, error };
}

// ── useUnlinkedProducts ───────────────────────────────────────────────────

export function useUnlinkedProducts(businessUnitId: number | null) {
  const [items, setItems]       = useState<UnlinkedSupplierProduct[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<UnlinkedSupplierProduct[]>(
        `/api/modules/proveedores/comparator/unlinked?buId=${businessUnitId}`,
      );
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos sin vincular');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { items, isLoading, error, refetch };
}

// ── useCreateFromSupplier ─────────────────────────────────────────────────

export function useCreateFromSupplier() {
  const [isCreating, setCreating] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function createProduct(input: CreateFromSupplierInput): Promise<Product | null> {
    setCreating(true);
    setError(null);
    try {
      return await apiClient.post<Product>(
        '/api/modules/proveedores/comparator/create-from-supplier',
        input,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear producto');
      return null;
    } finally {
      setCreating(false);
    }
  }

  return { createProduct, isCreating, error };
}

// ── usePurchaseOrder ──────────────────────────────────────────────────────

export function usePurchaseOrder() {
  const [order, setOrder]       = useState<PurchaseOrder | null>(null);
  const [isBuilding, setBuilding] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function buildOrder(
    businessUnitId: number,
    items: Array<{ productId: number; supplierProductId: number; quantity: number }>,
  ): Promise<PurchaseOrder | null> {
    setBuilding(true);
    setError(null);
    try {
      const result = await apiClient.post<PurchaseOrder>(
        '/api/modules/proveedores/purchase-order',
        { businessUnitId, items },
      );
      setOrder(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al armar pedido');
      return null;
    } finally {
      setBuilding(false);
    }
  }

  function clearOrder() {
    setOrder(null);
    setError(null);
  }

  return { buildOrder, clearOrder, isBuilding, order, error };
}
