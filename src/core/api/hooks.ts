import { useAppStore } from '@/core/store/appStore';
import type { BusinessUnit, InstallationConfig } from '@shared/types';

export function useActiveBusinessUnit(): { activeBU: BusinessUnit | null } {
  const activeBU = useAppStore((s) => s.activeBU);
  return { activeBU };
}

export function useInstallationConfig(): { config: InstallationConfig | null } {
  const config = useAppStore((s) => s.config);
  return { config };
}
