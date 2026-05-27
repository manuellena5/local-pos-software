import { useState, useEffect, useCallback } from 'react';
import { businessUnitsApi } from '@/lib/api/businessUnits';
import type { CreateBusinessUnitInput, UpdateBusinessUnitInput } from '@/lib/api/businessUnits';
import { useAppStore } from '@/core/store/appStore';
import type { BusinessUnit } from '@shared/types';

interface UseBusinessUnitsResult {
  units: BusinessUnit[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  saving: boolean;
  createUnit: (data: CreateBusinessUnitInput) => Promise<BusinessUnit>;
  updateUnit: (id: number, data: UpdateBusinessUnitInput) => Promise<BusinessUnit>;
  toggleActive: (id: number) => Promise<BusinessUnit>;
  refetch: () => void;
}

export function useBusinessUnits(): UseBusinessUnitsResult {
  const { businessUnits, refreshBusinessUnits } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshBusinessUnits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar unidades de negocio');
    } finally {
      setLoading(false);
    }
  }, [refreshBusinessUnits]);

  useEffect(() => {
    void fetchUnits();
  }, [fetchUnits]);

  const createUnit = useCallback(
    async (data: CreateBusinessUnitInput): Promise<BusinessUnit> => {
      setCreating(true);
      try {
        const unit = await businessUnitsApi.create(data);
        await refreshBusinessUnits();
        return unit;
      } finally {
        setCreating(false);
      }
    },
    [refreshBusinessUnits],
  );

  const updateUnit = useCallback(
    async (id: number, data: UpdateBusinessUnitInput): Promise<BusinessUnit> => {
      setSaving(true);
      try {
        const unit = await businessUnitsApi.update(id, data);
        await refreshBusinessUnits();
        return unit;
      } finally {
        setSaving(false);
      }
    },
    [refreshBusinessUnits],
  );

  const toggleActive = useCallback(
    async (id: number): Promise<BusinessUnit> => {
      setSaving(true);
      try {
        const unit = await businessUnitsApi.toggleActive(id);
        await refreshBusinessUnits();
        return unit;
      } finally {
        setSaving(false);
      }
    },
    [refreshBusinessUnits],
  );

  return {
    units: businessUnits,
    loading,
    error,
    creating,
    saving,
    createUnit,
    updateUnit,
    toggleActive,
    refetch: fetchUnits,
  };
}
