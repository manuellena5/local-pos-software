export const LOCALPOS_VERSION = '0.1.0';

export const DEFAULT_SERVER_PORT = 3001;

export const MODULE_IDS = {
  RETAIL_GENERAL: 'retail-general',
  RETAIL_TEXTIL: 'retail-textil',
  TALLER_MEDIDA: 'taller-medida',
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];
