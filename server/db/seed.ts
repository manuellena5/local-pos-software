import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db, sqlite } from './connection';
import { installationConfig, businessUnits, users, paymentMethods, categories } from './schema';
import { seedDemoProducts } from './seedDemoProducts';

export const AROMAS_BU_NAME = 'Aromas/Home&Deco';
const ADMIN_EMAIL = 'admin@espaciobip.com';

const PAYMENT_METHODS_SEED = [
  { code: 'cash', label: 'Efectivo', sortOrder: 1 },
  { code: 'mercadopago', label: 'Mercado Pago', sortOrder: 2 },
  { code: 'transfer', label: 'Transferencia', sortOrder: 3 },
  { code: 'card', label: 'Débito', sortOrder: 4 },
];

const CATEGORIES_SEED = ['Aromas', 'Decoración', 'Velas', 'Difusores', 'Blanquería'];

/**
 * Capa 1 — Seed de sistema. Corre en CADA arranque (llamado desde
 * server.ts). Upsert por clave natural en cada entidad — nunca duplica ni
 * pisa datos que el usuario ya haya editado (ej. no reescribe el nombre del
 * negocio si ya existe la fila).
 */
export function runSystemSeed(): void {
  const runSeed = sqlite.transaction(() => {
    // installation_config: crear solo si no existe (id=1, singleton)
    const existingInstallation = db
      .select()
      .from(installationConfig)
      .where(eq(installationConfig.id, 1))
      .get();
    if (!existingInstallation) {
      db.insert(installationConfig)
        .values({
          id: 1,
          businessName: 'Espacio BIP',
          cuit: '00-00000000-0',
          address: 'Landeta, Santa Fe, Argentina',
        })
        .run();
    }

    // business_units: upsert por nombre — una sola BU en esta versión
    let aromasBU = db
      .select()
      .from(businessUnits)
      .where(eq(businessUnits.name, AROMAS_BU_NAME))
      .get();
    if (!aromasBU) {
      aromasBU = db
        .insert(businessUnits)
        .values({
          installationId: 1,
          name: AROMAS_BU_NAME,
          description: 'Aromas, decoración y hogar',
          moduleId: 'retail-textil',
          invoicePrefix: 'A',
          isActive: true,
        })
        .returning()
        .get();
    }

    // users: admin idempotente por email
    const existingAdmin = db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).get();
    if (!existingAdmin) {
      const passwordHash = bcrypt.hashSync('admin1234', 12);
      db.insert(users)
        .values({
          installationId: 1,
          email: ADMIN_EMAIL,
          passwordHash,
          role: 'admin',
          isActive: true,
        })
        .run();
    }

    // payment_methods: upsert por code
    for (const m of PAYMENT_METHODS_SEED) {
      const existing = db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.code, m.code))
        .get();
      if (existing) {
        db.update(paymentMethods)
          .set({ label: m.label, sortOrder: m.sortOrder })
          .where(eq(paymentMethods.code, m.code))
          .run();
      } else {
        db.insert(paymentMethods).values(m).run();
      }
    }

    // categories: upsert por (name, businessUnitId)
    if (aromasBU) {
      for (const name of CATEGORIES_SEED) {
        const existing = db
          .select()
          .from(categories)
          .where(and(eq(categories.name, name), eq(categories.businessUnitId, aromasBU.id)))
          .get();
        if (!existing) {
          db.insert(categories).values({ name, businessUnitId: aromasBU.id }).run();
        }
      }
    }
  });

  try {
    runSeed();
    console.log('[DB] Seed de sistema aplicado (Capa 1 — Aromas/Home&Deco)');
  } catch (err) {
    console.error('[DB] Error en seed de sistema — rollback aplicado:', err);
    throw err;
  }
}

/**
 * Capa 2 — Datos de prueba (catálogo desde CSV). Solo corre si
 * SEED_DEMO=true. Requiere que runSystemSeed() ya haya corrido (necesita
 * la BU "Aromas/Home&Deco").
 */
export function runDemoSeedIfEnabled(): void {
  if (process.env.SEED_DEMO !== 'true') {
    console.log('[DB] Seed demo: SEED_DEMO no está en "true" — se omite');
    return;
  }
  seedDemoProducts();
}
