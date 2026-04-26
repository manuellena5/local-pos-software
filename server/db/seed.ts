import bcrypt from 'bcryptjs';
import { db } from './connection';
import { initDatabase } from './init';
import { installationConfig, businessUnits, users } from './schema';
import { seedProductsAndStock } from './seeds/02_products_and_stock.seed';

initDatabase();

// Instalación: Espacio BIP
db.insert(installationConfig)
  .values({
    id: 1,
    businessName: 'Espacio BIP',
    cuit: '20000000000',
    address: 'Landeta, Santa Fe, Argentina',
  })
  .onConflictDoNothing()
  .run();

// Unidades de negocio
db.insert(businessUnits)
  .values([
    {
      installationId: 1,
      name: 'Front',
      moduleId: 'retail-textil',
      invoicePrefix: 'A',
      isActive: true,
    },
    {
      installationId: 1,
      name: 'Back',
      moduleId: 'taller-medida',
      invoicePrefix: 'B',
      isActive: true,
    },
  ])
  .onConflictDoNothing()
  .run();

// Usuario admin
const passwordHash = bcrypt.hashSync('admin123', 12);
db.insert(users)
  .values({
    installationId: 1,
    email: 'admin@espaciobip.com',
    passwordHash,
    role: 'admin',
    isActive: true,
  })
  .onConflictDoNothing()
  .run();

console.log('[Seed] Datos de Espacio BIP cargados correctamente');
console.log('[Seed]   Installation: Espacio BIP');
console.log('[Seed]   BU 1: Front (retail-textil)');
console.log('[Seed]   BU 2: Back (taller-medida)');
console.log('[Seed]   Usuario: admin@espaciobip.com / admin123');

// Seed products and stock
seedProductsAndStock();
