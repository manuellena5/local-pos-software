import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useAppStore } from '@/core/store/appStore';
import type { InstallationConfig, BusinessUnit } from '@shared/types';

export function useBootstrap() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setConfig, setBusinessUnits, setActiveBU } = useAppStore();

  useEffect(() => {
    Promise.all([
      apiClient.get<InstallationConfig>('/api/config'),
      apiClient.get<BusinessUnit[]>('/api/business-units'),
    ])
      .then(([config, units]) => {
        setConfig(config);
        setBusinessUnits(units);
        const firstActive = units.find((u) => u.isActive) ?? null;
        if (firstActive) setActiveBU(firstActive);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar configuración');
      })
      .finally(() => setLoading(false));
  }, [setConfig, setBusinessUnits, setActiveBU]);

  return { loading, error };
}
