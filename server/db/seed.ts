import bcrypt from 'bcryptjs';
import { db } from './connection';
import { sqlite } from './connection';
import { installationConfig, businessUnits, users } from './schema';

/**
 * Corre el seed de datos iniciales solo si la DB está vacía.
 * Se llama desde server.ts después de initDatabase().
 * Es idempotente: si ya hay datos, no hace nada.
 */
export function runSeedIfEmpty(): void {
  const existing = sqlite.prepare('SELECT COUNT(*) as count FROM installation_config').get() as {
    count: number;
  };

  if (existing.count > 0) {
    console.log('[DB] Seed: base de datos ya inicializada');
    return;
  }

  const passwordHash = bcrypt.hashSync('admin1234', 12);

  // Transacción única — si cualquier INSERT falla, rollback completo
  const runSeed = sqlite.transaction(() => {
    db.insert(installationConfig)
      .values({
        id: 1,
        businessName: 'Espacio BIP',
        cuit: '00-00000000-0',
        address: 'Landeta, Santa Fe, Argentina',
      })
      .run();

    db.insert(businessUnits)
      .values([
        {
          installationId: 1,
          name: 'Front',
          description: 'Blanquería, Decoración y Aromas',
          moduleId: 'retail-textil',
          invoicePrefix: 'A',
          isActive: true,
        },
        {
          installationId: 1,
          name: 'Back',
          description: 'Diseño de vestidos a medida',
          moduleId: 'taller-medida',
          invoicePrefix: 'B',
          isActive: true,
        },
      ])
      .run();

    db.insert(users)
      .values({
        installationId: 1,
        email: 'admin@espaciobip.com',
        passwordHash,
        role: 'admin',
        isActive: true,
      })
      .run();
  });

  try {
    runSeed();
    console.log('[DB] Seed aplicado:');
    console.log('[DB]   Instalación: Espacio BIP (CUIT placeholder — actualizar en Ajustes)');
    console.log('[DB]   BU 1: Front (retail-textil)');
    console.log('[DB]   BU 2: Back (taller-medida)');
    console.log('[DB]   Usuario: admin@espaciobip.com / admin1234');
  } catch (err) {
    console.error('[DB] Error en seed — rollback aplicado:', err);
    throw err;
  }
}
