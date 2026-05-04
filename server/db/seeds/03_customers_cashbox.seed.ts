import { sql } from 'drizzle-orm';
import { db } from '../connection';
import { customers, cashMovements, cashAudits } from '../schema';

const BU_FRONT = 1;
const BU_BACK = 2;

export function seedCustomersAndCashbox(): void {
  // Idempotente: saltar si ya hay clientes
  const existing = db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .all();
  if ((existing[0]?.count ?? 0) > 0) {
    console.log('[Seed] Customers & Cashbox: already seeded, skipping');
    return;
  }

  // ── Clientes ──────────────────────────────────────────────────────────────
  const customerData = [
    {
      name: 'María García',
      documentType: 'DNI' as const,
      document: '28456789',
      email: 'maria.garcia@gmail.com',
      phone: '11-4523-6789',
      address: 'Av. Corrientes 1234, CABA',
      creditLimit: 5000,
      creditUsed: 0,
    },
    {
      name: 'Carlos Rodríguez',
      documentType: 'DNI' as const,
      document: '31234567',
      email: 'carlos.rodriguez@hotmail.com',
      phone: '11-3456-7890',
      address: 'San Martín 456, Rosario',
      creditLimit: 3000,
      creditUsed: 1200,
    },
    {
      name: 'Ana Laura Fernández',
      documentType: 'DNI' as const,
      document: '25678901',
      email: 'ana.fernandez@yahoo.com',
      phone: '351-456-7890',
      address: 'Belgrano 789, Córdoba',
      creditLimit: 8000,
      creditUsed: 0,
    },
    {
      name: 'Textiles Del Sur S.R.L.',
      documentType: 'CUIT' as const,
      document: '30-71234567-9',
      email: 'compras@textilesdelsur.com',
      phone: '11-5678-9012',
      address: 'Av. Industria 2345, Avellaneda',
      creditLimit: 20000,
      creditUsed: 4500,
    },
    {
      name: 'Roberto Pérez',
      documentType: 'DNI' as const,
      document: '19345678',
      email: null,
      phone: '11-2345-6789',
      address: null,
      creditLimit: 0,
      creditUsed: 0,
    },
    {
      name: 'Susana Martínez',
      documentType: 'DNI' as const,
      document: '33456789',
      email: 'susy.martinez@gmail.com',
      phone: '221-567-8901',
      address: 'Calle 50 Nº 1234, La Plata',
      creditLimit: 2000,
      creditUsed: 500,
    },
    {
      name: 'Diego Álvarez',
      documentType: 'DNI' as const,
      document: '27890123',
      email: 'dalvarez@outlook.com',
      phone: '341-678-9012',
      address: 'San Lorenzo 890, Rosario',
      creditLimit: 0,
      creditUsed: 0,
    },
    {
      name: 'Modas Elena',
      documentType: 'CUIT' as const,
      document: '27-34567890-3',
      email: 'elena@modaselena.com.ar',
      phone: '11-6789-0123',
      address: 'Lavalle 567, CABA',
      creditLimit: 15000,
      creditUsed: 2000,
    },
  ];

  const insertedCustomers = db.insert(customers).values(customerData).returning().all();
  console.log(`[Seed] Clientes: ${insertedCustomers.length} creados`);

  // ── Movimientos de caja (BU Front) ────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

  const movementsData = [
    // Hace 2 días
    { businessUnitId: BU_FRONT, type: 'deposit' as const, amount: 5000, description: 'Apertura de caja', createdAt: `${twoDaysAgo} 09:00:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 2400, description: 'Venta #1', createdAt: `${twoDaysAgo} 10:30:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 1800, description: 'Venta #2', createdAt: `${twoDaysAgo} 11:45:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 950, description: 'Venta #3', createdAt: `${twoDaysAgo} 14:20:00` },
    { businessUnitId: BU_FRONT, type: 'withdrawal' as const, amount: 500, description: 'Pago a proveedor - mercadería', createdAt: `${twoDaysAgo} 16:00:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 3200, description: 'Venta #4', createdAt: `${twoDaysAgo} 17:30:00` },
    // Ayer
    { businessUnitId: BU_FRONT, type: 'deposit' as const, amount: 2000, description: 'Apertura de caja', createdAt: `${yesterday} 09:00:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 1500, description: 'Venta #5', createdAt: `${yesterday} 10:00:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 4200, description: 'Venta #6 - cliente mayorista', createdAt: `${yesterday} 11:30:00` },
    { businessUnitId: BU_FRONT, type: 'refund' as const, amount: 950, description: 'Devolución Venta #3', createdAt: `${yesterday} 12:30:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 2100, description: 'Venta #7', createdAt: `${yesterday} 15:00:00` },
    { businessUnitId: BU_FRONT, type: 'withdrawal' as const, amount: 1000, description: 'Retiro para gastos operativos', createdAt: `${yesterday} 17:00:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 800, description: 'Venta #8', createdAt: `${yesterday} 17:45:00` },
    // Hoy
    { businessUnitId: BU_FRONT, type: 'deposit' as const, amount: 3000, description: 'Apertura de caja', createdAt: `${today} 09:00:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 1200, description: 'Venta #9', createdAt: `${today} 09:45:00` },
    { businessUnitId: BU_FRONT, type: 'sale' as const, amount: 3600, description: 'Venta #10', createdAt: `${today} 10:30:00` },
    { businessUnitId: BU_FRONT, type: 'other' as const, amount: 200, description: 'Ingreso por recargo tarjeta', createdAt: `${today} 11:00:00` },
    // BU Back
    { businessUnitId: BU_BACK, type: 'deposit' as const, amount: 1000, description: 'Apertura de caja', createdAt: `${today} 09:00:00` },
    { businessUnitId: BU_BACK, type: 'sale' as const, amount: 4500, description: 'Servicio confección medida', createdAt: `${today} 10:00:00` },
    { businessUnitId: BU_BACK, type: 'sale' as const, amount: 800, description: 'Arreglo pantalón', createdAt: `${today} 11:30:00` },
  ];

  db.insert(cashMovements).values(movementsData).run();
  console.log(`[Seed] Movimientos de caja: ${movementsData.length} creados`);

  // ── Arqueos históricos ────────────────────────────────────────────────────
  const auditsData = [
    {
      businessUnitId: BU_FRONT,
      auditDate: twoDaysAgo,
      theoreticalBalance: 12850, // 5000 + 2400 + 1800 + 950 - 500 + 3200
      realBalance: 12850,
      difference: 0,
      notes: 'Cierre de caja sin novedades',
      status: 'balanced' as const,
    },
    {
      businessUnitId: BU_FRONT,
      auditDate: yesterday,
      theoreticalBalance: 8650, // 2000 + 1500 + 4200 - 950 + 2100 - 1000 + 800
      realBalance: 8500,
      difference: -150,
      notes: 'Diferencia de $150, posible error en cambio',
      status: 'discrepancy' as const,
    },
  ];

  db.insert(cashAudits).values(auditsData).run();
  console.log(`[Seed] Arqueos: ${auditsData.length} creados`);
}
