import { create } from 'zustand';
import type { InstallationConfig, BusinessUnit } from '@shared/types';
import { businessUnitsApi } from '@/lib/api/businessUnits';

interface AppState {
  config: InstallationConfig | null;
  businessUnits: BusinessUnit[];
  activeBU: BusinessUnit | null;
  setConfig: (config: InstallationConfig) => void;
  setBusinessUnits: (units: BusinessUnit[]) => void;
  setActiveBU: (unit: BusinessUnit) => void;
  /**
   * Recarga la lista de BUs desde el servidor y actualiza el store.
   * Si la BU activa fue modificada, sincroniza su estado.
   */
  refreshBusinessUnits: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: null,
  businessUnits: [],
  activeBU: null,
  setConfig: (config) => set({ config }),
  setBusinessUnits: (businessUnits) => set({ businessUnits }),
  setActiveBU: (activeBU) => set({ activeBU }),
  refreshBusinessUnits: async () => {
    const units = await businessUnitsApi.list();
    const { activeBU } = get();
    // Si la BU activa fue editada, reflejar los cambios en el store
    const updatedActiveBU = activeBU ? (units.find((u) => u.id === activeBU.id) ?? activeBU) : null;
    set({ businessUnits: units, activeBU: updatedActiveBU });
  },
}));
