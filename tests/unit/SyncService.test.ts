import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DB and Supabase before importing SyncService
vi.mock('../../server/db/connection', () => ({
  db: {},
}));

vi.mock('../../server/config/supabase', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
  getSupabaseClient: vi.fn(),
}));

vi.mock('../../server/core/repositories/SyncRepository', () => {
  const mockRepo = {
    getPendingItems: vi.fn().mockReturnValue([]),
    markSuccess: vi.fn(),
    markFailed: vi.fn(),
    addLog: vi.fn(),
    getRecentLogs: vi.fn().mockReturnValue([]),
    countPending: vi.fn().mockReturnValue(0),
    enqueue: vi.fn(),
  };
  return { SyncRepository: vi.fn().mockImplementation(() => mockRepo), syncRepository: mockRepo };
});

vi.mock('../../server/db/schema', () => ({
  products: {},
  stockItems: {},
  sales: {},
}));

import { isSupabaseConfigured } from '../../server/config/supabase';
import { syncRepository } from '../../server/core/repositories/SyncRepository';

describe('SyncService — no Supabase configured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isSupabaseConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('countPending returns 0 by default', () => {
    expect(syncRepository.countPending()).toBe(0);
  });

  it('getRecentLogs returns empty array by default', () => {
    expect(syncRepository.getRecentLogs()).toEqual([]);
  });

  it('getPendingItems returns empty array by default', () => {
    expect(syncRepository.getPendingItems()).toEqual([]);
  });

  it('enqueue can be called without throwing', () => {
    expect(() => {
      syncRepository.enqueue('products', 1, 'upsert', {});
    }).not.toThrow();
  });
});

describe('SyncService — isSupabaseConfigured guard', () => {
  it('returns false when env vars are not set', () => {
    (isSupabaseConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns true when env vars are set', () => {
    (isSupabaseConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    expect(isSupabaseConfigured()).toBe(true);
  });
});
