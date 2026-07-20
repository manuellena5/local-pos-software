import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockDb, mockSqlite } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    get: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
    run: vi.fn(),
  };
  const chain = mockDb as Record<string, ReturnType<typeof vi.fn>>;
  for (const key of ['select', 'from', 'where', 'insert', 'values', 'update', 'set', 'returning']) {
    chain[key].mockReturnValue(mockDb);
  }
  const mockSqlite = { transaction: vi.fn((fn: () => void) => fn) };
  return { mockDb, mockSqlite };
});

vi.mock('../../server/db/connection', () => ({ db: mockDb, sqlite: mockSqlite }));

vi.mock('../../server/db/schema', () => ({
  installationConfig: { id: 'installationConfig.id' },
  businessUnits: { name: 'businessUnits.name' },
  users: { email: 'users.email' },
  paymentMethods: { code: 'paymentMethods.code' },
  categories: { name: 'categories.name', businessUnitId: 'categories.businessUnitId' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => `eq:${String(col)}:${String(val)}`),
  and: vi.fn((...conds: unknown[]) => `and:${conds.join(',')}`),
}));

vi.mock('bcryptjs', () => ({
  default: { hashSync: vi.fn().mockReturnValue('$2b$12$hashedpassword') },
}));

const seedDemoProductsMock = vi.hoisted(() => vi.fn());
vi.mock('../../server/db/seedDemoProducts', () => ({ seedDemoProducts: seedDemoProductsMock }));

import { runSystemSeed, runDemoSeedIfEnabled } from '../../server/db/seed';

// 11 llamadas secuenciales a .get() dentro de runSystemSeed(): installationConfig,
// businessUnits, users, 4x paymentMethods, 5x categories.
function mockAllGetsReturn(value: unknown) {
  mockDb.get.mockReturnValue(value);
}

describe('runSystemSeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ['select', 'from', 'where', 'insert', 'values', 'update', 'set', 'returning']) {
      (mockDb as unknown as Record<string, ReturnType<typeof vi.fn>>)[key].mockReturnValue(mockDb);
    }
    mockDb.run.mockReturnValue(undefined);
  });

  it('should insert everything when the database is empty', () => {
    mockAllGetsReturn(undefined);
    // businessUnits insert().returning().get() debe devolver una BU con id
    mockDb.get
      .mockReturnValueOnce(undefined) // installationConfig existente?
      .mockReturnValueOnce(undefined) // businessUnits existente?
      .mockReturnValueOnce({ id: 7, name: 'Aromas/Home&Deco' }); // returning().get() tras insert

    runSystemSeed();

    expect(mockSqlite.transaction).toHaveBeenCalledOnce();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should not duplicate installation_config when it already exists', () => {
    // 1er get() (installationConfig) devuelve una fila existente
    mockDb.get.mockReturnValueOnce({ id: 1, businessName: 'Espacio BIP' });
    // El resto de los get() (businessUnits, users, payment methods, categories) también "existen"
    mockDb.get.mockReturnValue({ id: 1 });

    runSystemSeed();

    // Ningún insert de installation_config (values con businessName) debería ocurrir
    const insertedInstallation = mockDb.values.mock.calls.some(
      ([v]) => v && typeof v === 'object' && 'businessName' in v,
    );
    expect(insertedInstallation).toBe(false);
  });

  it('should seed exactly one business unit "Aromas/Home&Deco" with moduleId retail-textil', () => {
    mockDb.get
      .mockReturnValueOnce(undefined) // installationConfig no existe
      .mockReturnValueOnce(undefined) // businessUnits no existe
      .mockReturnValueOnce({ id: 7, name: 'Aromas/Home&Deco' }); // returning().get()
    mockDb.get.mockReturnValue({ id: 1 }); // el resto (users, payment methods, categories) "existen"

    runSystemSeed();

    const buInsert = mockDb.values.mock.calls
      .map(([v]) => v)
      .find((v) => v && typeof v === 'object' && (v as { moduleId?: string }).moduleId !== undefined) as
      | { name: string; moduleId: string }
      | undefined;

    expect(buInsert).toBeDefined();
    expect(buInsert?.name).toBe('Aromas/Home&Deco');
    expect(buInsert?.moduleId).toBe('retail-textil');
  });

  it('should upsert (update) an existing payment method instead of duplicating', () => {
    mockAllGetsReturn({ id: 1, code: 'cash', label: 'Efectivo' });

    runSystemSeed();

    expect(mockDb.update).toHaveBeenCalled();
    const paymentMethodInsert = mockDb.values.mock.calls.some(
      ([v]) => v && typeof v === 'object' && (v as { code?: string }).code === 'cash',
    );
    expect(paymentMethodInsert).toBe(false);
  });

  it('should create admin user with correct role when it does not exist', () => {
    mockDb.get
      .mockReturnValueOnce({ id: 1 }) // installationConfig existe
      .mockReturnValueOnce({ id: 1, name: 'Aromas/Home&Deco' }) // businessUnits existe
      .mockReturnValueOnce(undefined); // users no existe
    mockDb.get.mockReturnValue({ id: 1 }); // payment methods / categories "existen"

    runSystemSeed();

    const userInsert = mockDb.values.mock.calls
      .map(([v]) => v)
      .find((v) => v && typeof v === 'object' && (v as { role?: string }).role !== undefined) as
      | { role: string; email: string }
      | undefined;

    expect(userInsert).toBeDefined();
    expect(userInsert?.role).toBe('admin');
    expect(userInsert?.email).toBe('admin@espaciobip.com');
  });
});

describe('runDemoSeedIfEnabled', () => {
  const originalEnv = process.env['SEED_DEMO'];

  beforeEach(() => {
    seedDemoProductsMock.mockClear();
  });

  afterEach(() => {
    process.env['SEED_DEMO'] = originalEnv;
  });

  it('should call seedDemoProducts when SEED_DEMO=true', () => {
    process.env['SEED_DEMO'] = 'true';
    runDemoSeedIfEnabled();
    expect(seedDemoProductsMock).toHaveBeenCalledOnce();
  });

  it('should not call seedDemoProducts when SEED_DEMO is unset', () => {
    delete process.env['SEED_DEMO'];
    runDemoSeedIfEnabled();
    expect(seedDemoProductsMock).not.toHaveBeenCalled();
  });

  it('should not call seedDemoProducts when SEED_DEMO=false', () => {
    process.env['SEED_DEMO'] = 'false';
    runDemoSeedIfEnabled();
    expect(seedDemoProductsMock).not.toHaveBeenCalled();
  });
});
