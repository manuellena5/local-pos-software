import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db/connection', () => ({ db: {}, sqlite: { prepare: vi.fn(() => ({ get: vi.fn(), all: vi.fn(() => []), run: vi.fn() })) } }));
vi.mock('../../server/db/schemas/modules/retail-textil', () => ({ productAttributes: {}, productImages: {} }));

import { AttributeService } from '../../server/modules/retail-textil/services/AttributeService';
import { attributeRepository } from '../../server/modules/retail-textil/repositories/AttributeRepository';

vi.mock('../../server/modules/retail-textil/repositories/AttributeRepository', () => {
  const mock = { getByProductId: vi.fn(), replaceAll: vi.fn(), deleteAll: vi.fn() };
  return { AttributeRepository: vi.fn(() => mock), attributeRepository: mock };
});

describe('AttributeService', () => {
  let service: AttributeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AttributeService();
  });

  it('list delegates to repository', () => {
    (attributeRepository.getByProductId as ReturnType<typeof vi.fn>).mockReturnValue([{ id: 1, productId: 5, key: 'Tamaño', value: '1½ plaza', sortOrder: 0 }]);
    const result = service.list(5);
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('Tamaño');
  });

  it('replace trims whitespace from key and value', () => {
    (attributeRepository.replaceAll as ReturnType<typeof vi.fn>).mockReturnValue([]);
    service.replace(5, { attributes: [{ key: '  Material  ', value: '  Simil piel  ' }] });
    expect(attributeRepository.replaceAll).toHaveBeenCalledWith(5, [
      expect.objectContaining({ key: 'Material', value: 'Simil piel' }),
    ]);
  });

  it('replace assigns sortOrder from index if not provided', () => {
    (attributeRepository.replaceAll as ReturnType<typeof vi.fn>).mockReturnValue([]);
    service.replace(5, { attributes: [{ key: 'A', value: '1' }, { key: 'B', value: '2' }] });
    expect(attributeRepository.replaceAll).toHaveBeenCalledWith(5, [
      expect.objectContaining({ sortOrder: 0 }),
      expect.objectContaining({ sortOrder: 1 }),
    ]);
  });

  it('replace with empty array clears all attributes', () => {
    (attributeRepository.replaceAll as ReturnType<typeof vi.fn>).mockReturnValue([]);
    service.replace(5, { attributes: [] });
    expect(attributeRepository.replaceAll).toHaveBeenCalledWith(5, []);
  });
});
