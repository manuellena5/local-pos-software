import { apiClient } from './client';
import type { BusinessUnit } from '@shared/types';

export interface CreateBusinessUnitInput {
  name: string;
  description?: string | null;
  moduleId: string;
  invoicePrefix: string;
}

export interface UpdateBusinessUnitInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  invoicePrefix?: string;
}

export const businessUnitsApi = {
  /**
   * Devuelve todas las BUs de la instalación.
   */
  list(): Promise<BusinessUnit[]> {
    return apiClient.get('/api/business-units');
  },

  /**
   * Crea una nueva BU.
   */
  create(data: CreateBusinessUnitInput): Promise<BusinessUnit> {
    return apiClient.post('/api/business-units', data);
  },

  /**
   * Actualiza nombre, descripción o prefijo de factura.
   * El módulo NO se puede cambiar.
   */
  update(id: number, data: UpdateBusinessUnitInput): Promise<BusinessUnit> {
    return apiClient.patch(`/api/business-units/${id}`, data);
  },

  /**
   * Alterna el estado activo/inactivo de una BU.
   */
  toggleActive(id: number): Promise<BusinessUnit> {
    return apiClient.post(`/api/business-units/${id}/toggle-active`, {});
  },
};
