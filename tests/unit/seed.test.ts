import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock better-sqlite3 connection before importing seed
vi.mock('../../server/db/connection', () => {
  const mockPrepare = vi.fn();
  const mockTransaction = vi.fn((fn: () => void) => fn);
  return {
    sqlite: {
      prepare: mockPrepare,
      transaction: mockTransaction,
    },
    db: {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      run: vi.fn(),
    },
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    hashSync: vi.fn().mockReturnValue('$2b$12$hashedpassword'),
  },
}));

import { sqlite, db } from '../../server/db/connection';
import { runSeedIfEmpty } from '../../server/db/seed';

function mockEmpty() {
  vi.mocked(sqlite.prepare).mockReturnValue({
    get: vi.fn().mockReturnValue({ count: 0 }),
  } as unknown as ReturnType<typeof sqlite.prepare>);
}

function mockNotEmpty() {
  vi.mocked(sqlite.prepare).mockReturnValue({
    get: vi.fn().mockReturnValue({ count: 1 }),
  } as unknown as ReturnType<typeof sqlite.prepare>);
}

describe('runSeedIfEmpty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: transaction executes the function immediately
    vi.mocked(sqlite.transaction).mockImplementation((fn) => fn as () => void);
    vi.mocked(db.insert).mockReturnThis();
    vi.mocked((db as unknown as { values: ReturnType<typeof vi.fn> }).values).mockReturnThis();
    vi.mocked((db as unknown as { run: ReturnType<typeof vi.fn> }).run).mockReturnValue(undefined);
  });

  it('should run seed when installation_config is empty', () => {
    mockEmpty();

    runSeedIfEmpty();

    expect(sqlite.transaction).toHaveBeenCalledOnce();
  });

  it('should not run seed when installation_config has rows', () => {
    mockNotEmpty();

    runSeedIfEmpty();

    expect(sqlite.transaction).not.toHaveBeenCalled();
  });

  it('should create both BUs with correct moduleId', () => {
    mockEmpty();

    const insertedValues: unknown[] = [];
    vi.mocked(db.insert).mockReturnThis();
    vi.mocked(sqlite.transaction).mockImplementation((fn) => {
      // Capture what gets inserted by running the transaction fn
      const originalInsert = db.insert.bind(db);
      vi.mocked(db.insert).mockImplementation((...args) => {
        const chain = {
          values: (vals: unknown) => {
            insertedValues.push(vals);
            return { run: vi.fn() };
          },
          run: vi.fn(),
        };
        void originalInsert;
        void args;
        return chain as unknown as ReturnType<typeof db.insert>;
      });
      fn();
      return fn;
    });

    runSeedIfEmpty();

    const buInsert = insertedValues.find(
      (v) => Array.isArray(v) && (v as { moduleId: string }[])[0]?.moduleId !== undefined,
    ) as { moduleId: string; name: string }[] | undefined;

    expect(buInsert).toBeDefined();
    if (buInsert) {
      expect(buInsert[0]!.moduleId).toBe('retail-textil');
      expect(buInsert[1]!.moduleId).toBe('taller-medida');
    }
  });

  it('should create admin user with correct role', () => {
    mockEmpty();

    const insertedValues: unknown[] = [];
    vi.mocked(sqlite.transaction).mockImplementation((fn) => {
      vi.mocked(db.insert).mockImplementation(() => ({
        values: (vals: unknown) => {
          insertedValues.push(vals);
          return { run: vi.fn() };
        },
        run: vi.fn(),
      }) as unknown as ReturnType<typeof db.insert>);
      fn();
      return fn;
    });

    runSeedIfEmpty();

    const userInsert = insertedValues.find(
      (v) => !Array.isArray(v) && (v as { role?: string }).role !== undefined,
    ) as { role: string; email: string } | undefined;

    expect(userInsert).toBeDefined();
    if (userInsert) {
      expect(userInsert.role).toBe('admin');
      expect(userInsert.email).toBe('admin@espaciobip.com');
    }
  });
});
