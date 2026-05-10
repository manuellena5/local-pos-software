import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

vi.mock('../../server/db/connection', () => ({ db: {}, sqlite: { prepare: vi.fn(() => ({ get: vi.fn(), all: vi.fn(() => []), run: vi.fn() })) } }));
vi.mock('../../server/db/schemas/modules/retail-textil', () => ({ productAttributes: {}, productImages: {} }));
vi.mock('fs');

vi.mock('../../server/modules/retail-textil/repositories/ImageRepository', () => {
  const mock = {
    getByProductId: vi.fn().mockReturnValue([]),
    getPrimary:     vi.fn(),
    create:         vi.fn(),
    findById:       vi.fn(),
    delete:         vi.fn(),
    setPrimary:     vi.fn(),
    reorder:        vi.fn(),
    countByProduct: vi.fn().mockReturnValue(0),
  };
  return { ImageRepository: vi.fn(() => mock), imageRepository: mock };
});

import { ImageService } from '../../server/modules/retail-textil/services/ImageService';
import { imageRepository } from '../../server/modules/retail-textil/repositories/ImageRepository';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImageService();
  });

  it('add marks first image as primary', () => {
    (imageRepository.countByProduct as ReturnType<typeof vi.fn>).mockReturnValue(0);
    (imageRepository.create as ReturnType<typeof vi.fn>).mockReturnValue({ id: 1, productId: 3, filePath: 'assets/products/3/img.jpg', isPrimary: true });
    const img = service.add(3, 'assets/products/3/img.jpg');
    expect(imageRepository.create).toHaveBeenCalledWith(expect.objectContaining({ isPrimary: true }));
    expect(img.isPrimary).toBe(true);
  });

  it('add does NOT mark subsequent images as primary', () => {
    (imageRepository.countByProduct as ReturnType<typeof vi.fn>).mockReturnValue(1);
    (imageRepository.create as ReturnType<typeof vi.fn>).mockReturnValue({ id: 2, productId: 3, filePath: 'assets/products/3/img2.jpg', isPrimary: false });
    service.add(3, 'assets/products/3/img2.jpg');
    expect(imageRepository.create).toHaveBeenCalledWith(expect.objectContaining({ isPrimary: false }));
  });

  it('add throws when limit is exceeded', () => {
    (imageRepository.countByProduct as ReturnType<typeof vi.fn>).mockReturnValue(20);
    expect(() => service.add(3, 'path.jpg')).toThrow('Máximo');
  });

  it('delete calls repository and removes file', () => {
    (imageRepository.findById as ReturnType<typeof vi.fn>).mockReturnValue({ id: 5, productId: 3, filePath: 'assets/products/3/img.jpg', isPrimary: false });
    (imageRepository.getByProductId as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    service.delete(3, 5);
    expect(imageRepository.delete).toHaveBeenCalledWith(5);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('list returns images from repository', () => {
    (imageRepository.getByProductId as ReturnType<typeof vi.fn>).mockReturnValue([{ id: 1 }, { id: 2 }]);
    expect(service.list(3)).toHaveLength(2);
  });
});
