import type { BusinessUnit, InstallationConfig } from '@shared/types';

// Stubs backed by Zustand stores in Phase 1.
// Phase 0: return null until stores are wired up.

export function useActiveBusinessUnit(): { activeBU: BusinessUnit | null } {
  return { activeBU: null };
}

export function useInstallationConfig(): { config: InstallationConfig | null } {
  return { config: null };
}
