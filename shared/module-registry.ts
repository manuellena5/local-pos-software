import { MODULE_IDS } from './constants';
import type { ModuleId } from './constants';

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: MODULE_IDS.RETAIL_GENERAL,
    name: 'Retail General',
    description: 'Módulo mínimo para comercios simples',
  },
  {
    id: MODULE_IDS.RETAIL_TEXTIL,
    name: 'Retail Textil',
    description: 'Blanquería, decoración, aromas, ropa — con variantes por color/tamaño/material',
  },
  {
    id: MODULE_IDS.TALLER_MEDIDA,
    name: 'Taller a Medida',
    description: 'Confección a medida, sastrería — con pedidos, estados y seña',
  },
];

export function getModuleById(id: ModuleId): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id);
}
