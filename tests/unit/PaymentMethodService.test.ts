import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentMethodService } from '../../server/core/services/PaymentMethodService';
import type { PaymentMethodRepository } from '../../server/core/repositories/PaymentMethodRepository';
import type { PaymentMethodConfig } from '../../shared/types';

function makeMethod(overrides: Partial<PaymentMethodConfig> = {}): PaymentMethodConfig {
  return {
    id: 1,
    code: 'cash',
    label: 'Efectivo',
    isActive: true,
    sortOrder: 1,
    createdAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

describe('PaymentMethodService', () => {
  let repo: PaymentMethodRepository;
  let service: PaymentMethodService;

  beforeEach(() => {
    repo = {
      findAll: vi.fn(),
      findAllActive: vi.fn(),
      findById: vi.fn(),
      findByCode: vi.fn(),
      upsertByCode: vi.fn(),
      setActive: vi.fn(),
    } as unknown as PaymentMethodRepository;
    service = new PaymentMethodService(repo);
  });

  describe('list', () => {
    it('should return all methods including inactive ones', () => {
      vi.mocked(repo.findAll).mockReturnValue([makeMethod(), makeMethod({ id: 2, isActive: false })]);
      const result = service.list();
      expect(result).toHaveLength(2);
    });
  });

  describe('listActive', () => {
    it('should return only active methods', () => {
      vi.mocked(repo.findAllActive).mockReturnValue([makeMethod()]);
      const result = service.listActive();
      expect(result).toEqual([makeMethod()]);
    });
  });

  describe('setActive', () => {
    it('should throw NotFoundError when the method does not exist', () => {
      vi.mocked(repo.findById).mockReturnValue(null);
      expect(() => service.setActive(999, false)).toThrow('Medio de pago 999 no encontrado');
      expect(repo.setActive).not.toHaveBeenCalled();
    });

    it('should toggle isActive when the method exists', () => {
      vi.mocked(repo.findById).mockReturnValue(makeMethod());
      vi.mocked(repo.setActive).mockReturnValue(makeMethod({ isActive: false }));

      const result = service.setActive(1, false);

      expect(repo.setActive).toHaveBeenCalledWith(1, false);
      expect(result.isActive).toBe(false);
    });
  });
});
