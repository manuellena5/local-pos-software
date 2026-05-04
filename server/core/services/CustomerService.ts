import { createCustomerSchema, updateCustomerSchema } from '../schemas/customers.schema';
import { NotFoundError, ValidationError } from '../../lib/errors';
import type { CustomerRepository } from '../repositories/CustomerRepository';
import type { Customer, Sale, SaleItem } from '../../../shared/types';
import type { CreateCustomerRequest, UpdateCustomerRequest } from '../types';

export class CustomerService {
  constructor(private readonly repo: CustomerRepository) {}

  listAll(): Customer[] {
    return this.repo.getAll();
  }

  getById(id: number): Customer {
    const customer = this.repo.getById(id);
    if (!customer) throw new NotFoundError(`Cliente ${id} no encontrado`);
    return customer;
  }

  create(data: CreateCustomerRequest): Customer {
    const parsed = createCustomerSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
    }
    const valid = parsed.data;

    // Validar unicidad de documento
    if (valid.document) {
      const existing = this.repo.getByDocument(valid.document);
      if (existing) {
        throw new ValidationError(`Ya existe un cliente con el documento "${valid.document}"`);
      }
    }

    // Validar unicidad de email
    if (valid.email && valid.email !== '') {
      const existing = this.repo.getByEmail(valid.email);
      if (existing) {
        throw new ValidationError(`Ya existe un cliente con el email "${valid.email}"`);
      }
    }

    return this.repo.create(valid as CreateCustomerRequest);
  }

  update(id: number, data: UpdateCustomerRequest): Customer {
    const existing = this.repo.getById(id);
    if (!existing) throw new NotFoundError(`Cliente ${id} no encontrado`);

    const parsed = updateCustomerSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
    }
    const valid = parsed.data;

    // Validar unicidad de documento si cambió
    if (valid.document && valid.document !== existing.document) {
      const dup = this.repo.getByDocument(valid.document);
      if (dup && dup.id !== id) {
        throw new ValidationError(`Ya existe un cliente con el documento "${valid.document}"`);
      }
    }

    // Validar unicidad de email si cambió
    if (valid.email && valid.email !== '' && valid.email !== existing.email) {
      const dup = this.repo.getByEmail(valid.email);
      if (dup && dup.id !== id) {
        throw new ValidationError(`Ya existe un cliente con el email "${valid.email}"`);
      }
    }

    const updated = this.repo.update(id, valid as UpdateCustomerRequest);
    if (!updated) throw new NotFoundError(`Cliente ${id} no encontrado`);
    return updated;
  }

  softDelete(id: number): void {
    const existing = this.repo.getById(id);
    if (!existing) throw new NotFoundError(`Cliente ${id} no encontrado`);
    this.repo.softDelete(id);
  }

  search(query: string): Customer[] {
    if (!query.trim()) return this.repo.getAll();
    return this.repo.search(query.trim());
  }

  getWithHistory(id: number): {
    customer: Customer;
    purchases: Array<{ sale: Sale; items: SaleItem[] }>;
    totalSpent: number;
  } {
    const result = this.repo.getWithPurchaseHistory(id);
    if (!result) throw new NotFoundError(`Cliente ${id} no encontrado`);
    return result;
  }

  getCreditStatus(id: number): { used: number; limit: number; available: number } {
    const customer = this.getById(id);
    return {
      used: customer.creditUsed,
      limit: customer.creditLimit,
      available: Math.max(0, customer.creditLimit - customer.creditUsed),
    };
  }
}
