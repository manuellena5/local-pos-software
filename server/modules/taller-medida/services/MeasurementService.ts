import { measurementRepository } from '../repositories/MeasurementRepository';
import type { TallerClientMeasurements } from '../../../db/schemas/modules/taller-medida';
import type { UpsertMeasurementsInput } from '../schemas';

export interface MeasurementResult extends Omit<TallerClientMeasurements, 'fields'> {
  fields: Record<string, string>;
}

export class MeasurementService {
  get(customerId: number, buId: number): MeasurementResult | null {
    const row = measurementRepository.getByCustomerAndBu(customerId, buId);
    if (!row) return null;
    return { ...row, fields: JSON.parse(row.fields) as Record<string, string> };
  }

  upsert(customerId: number, buId: number, input: UpsertMeasurementsInput): MeasurementResult {
    const row = measurementRepository.upsert(customerId, buId, input.fields);
    return { ...row, fields: JSON.parse(row.fields) as Record<string, string> };
  }
}

export const measurementService = new MeasurementService();
