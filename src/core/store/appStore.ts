import { create } from 'zustand';
import type { InstallationConfig, BusinessUnit } from '@shared/types';

interface AppState {
  config: InstallationConfig | null;
  businessUnits: BusinessUnit[];
  activeBU: BusinessUnit | null;
  setConfig: (config: InstallationConfig) => void;
  setBusinessUnits: (units: BusinessUnit[]) => void;
  setActiveBU: (unit: BusinessUnit) => void;
}

export const useAppStore = create<AppState>((set) => ({
  config: null,
  businessUnits: [],
  activeBU: null,
  setConfig: (config) => set({ config }),
  setBusinessUnits: (businessUnits) => set({ businessUnits }),
  setActiveBU: (activeBU) => set({ activeBU }),
}));
