import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerService } from '../../server/core/services/CustomerService';
import type { CustomerRepository } from '../../server/core/repositories/CustomerRepository';
import type { Customer } from '../../shared/types';

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    name: 'María García',
    documentType: 'DNI',
    document: '28456789',
    email: 'maria@example.com',
    phone: '11-1234-5678',
    address: null,
    notes: null,
    creditLimit: 0,
    creditUsed: 0,
    isActive: true,
    createdAt: '2026-04-28T00:00:00',
    updatedAt: '2026-04-28T00:00:00',
    ...overrides,
  };
}

describe('CustomerService', () => {
  let service: CustomerService;
  let repo: CustomerRepository;

  beforeEach(() => {
    repo = {
      getAll: vi.fn().mockReturnValue([]),
      getById: vi.fn().mockReturnValue(null),
      getByDocument: vi.fn().mockReturnValue(null),
      getByEmail: vi.fn().mockReturnValue(null),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      search: vi.fn().mockReturnValue([]),
      getWithPurchaseHistory: vi.fn(),
      updateCreditUsed: vi.fn(),
    } as unknown as CustomerRepository;
    service = new CustomerService(repo);
  });

  describe('create', () => {
    it('should create a valid customer', () => {
      const customer = makeCustomer();
      vi.mocked(repo.create).mockReturnValue(customer);

      const result = service.create({ name: 'María García', document: '28456789' });
      expect(result).toEqual(customer);
      expect(repo.create).toHaveBeenCalled();
    });

    it('should throw ValidationError if name is empty', () => {
      expect(() => service.create({ name: '' })).toThrow('obligatorio');
    });

    it('should throw ValidationError if document is already used', () => {
      vi.mocked(repo.getByDocument).mockReturnValue(makeCustomer());
      expect(() => service.create({ name: 'Otro', document: '28456789' })).toThrow('documento');
    });

    it('should throw ValidationError if email is already used', () => {
      vi.mocked(repo.getByEmail).mockReturnValue(makeCustomer());
      expect(() =>
        service.create({ name: 'Otro', email: 'maria@example.com' }),
      ).toThrow('email');
    });

    it('should throw ValidationError if creditLimit is negative', () => {
      expect(() =>
        service.create({ name: 'Test', creditLimit: -100 }),
      ).toThrow();
    });
  });

  describe('getById', () => {
    it('should return customer when found', () => {
      const customer = makeCustomer();
      vi.mocked(repo.getById).mockReturnValue(customer);
      expect(service.getById(1)).toEqual(customer);
    });

    it('should throw NotFoundError when not found', () => {
      vi.mocked(repo.getById).mockReturnValue(null);
      expect(() => service.getById(99)).toThrow('no encontrado');
    });
  });

  describe('update', () => {
    it('should update existing customer', () => {
      const original = makeCustomer();
      const updated = makeCustomer({ name: 'María López' });
      vi.mocked(repo.getById).mockReturnValue(original);
      vi.mocked(repo.update).mockReturnValue(updated);
      const result = service.update(1, { name: 'María López' });
      expect(result.name).toBe('María López');
    });

    it('should throw NotFoundError if customer does not exist', () => {
      vi.mocked(repo.getById).mockReturnValue(null);
      expect(() => service.update(99, { name: 'X' })).toThrow('no encontrado');
    });
  });

  describe('getCreditStatus', () => {
    it('should calculate available credit correctly', () => {
      vi.mocked(repo.getById).mockReturnValue(makeCustomer({ creditLimit: 5000, creditUsed: 1200 }));
      const status = service.getCreditStatus(1);
      expect(status.available).toBe(3800);
      expect(status.used).toBe(1200);
    });

    it('should return 0 available when over limit', () => {
      vi.mocked(repo.getById).mockReturnValue(makeCustomer({ creditLimit: 1000, creditUsed: 1500 }));
      const status = service.getCreditStatus(1);
      expect(status.available).toBe(0);
    });
  });
});
