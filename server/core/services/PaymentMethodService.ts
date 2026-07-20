import { NotFoundError } from '../../lib/errors';
import type { PaymentMethodRepository } from '../repositories/PaymentMethodRepository';
import type { PaymentMethodConfig } from '../../../shared/types';

export class PaymentMethodService {
  constructor(private readonly repo: PaymentMethodRepository) {}

  list(): PaymentMethodConfig[] {
    return this.repo.findAll();
  }

  listActive(): PaymentMethodConfig[] {
    return this.repo.findAllActive();
  }

  setActive(id: number, isActive: boolean): PaymentMethodConfig {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Medio de pago ${id} no encontrado`);
    return this.repo.setActive(id, isActive);
  }
}
