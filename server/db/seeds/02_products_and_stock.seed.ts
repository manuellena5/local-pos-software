import { eq, sql } from 'drizzle-orm';
import { db } from '../connection';
import { products, stockItems, stockMovements } from '../schema';

export function seedProductsAndStock(): void {
  // BU IDs from seed 01: Front=1, Back=2
  const BU_FRONT = 1;
  const BU_BACK = 2;

  // Idempotente: saltar si ya hay productos en BU_FRONT
  const existing = db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.businessUnitId, BU_FRONT))
    .all();
  if ((existing[0]?.count ?? 0) > 0) {
    console.log('[Seed] Products & Stock: already seeded, skipping');
    return;
  }

  // ========== FRONT (Retail Textil) ==========
  const frontProducts = [
    { name: 'Sábana 144 hilos', sku: 'SAB-144', costPrice: 45, basePrice: 120, category: 'blanqueria' },
    { name: 'Sábana 200 hilos', sku: 'SAB-200', costPrice: 60, basePrice: 160, category: 'blanqueria' },
    { name: 'Almohada viscoelástica', sku: 'ALM-VISCO', costPrice: 35, basePrice: 95, category: 'blanqueria' },
    { name: 'Funda almohada', sku: 'FUNDA-ALM', costPrice: 12, basePrice: 35, category: 'blanqueria' },
    { name: 'Edredón 140x200', sku: 'EDRED-140', costPrice: 80, basePrice: 220, category: 'blanqueria' },
    { name: 'Vela aromática frambuesa', sku: 'VELA-FRAM', costPrice: 8, basePrice: 25, category: 'aromas' },
    { name: 'Vela aromática lavanda', sku: 'VELA-LAV', costPrice: 8, basePrice: 25, category: 'aromas' },
    { name: 'Difusor aroma eléctrico', sku: 'DIF-ELEC', costPrice: 20, basePrice: 60, category: 'aromas' },
    { name: 'Porta velas cristal', sku: 'PORTA-VEL', costPrice: 5, basePrice: 18, category: 'deco' },
    { name: 'Espejo decorativo', sku: 'ESPE-DEC', costPrice: 15, basePrice: 45, category: 'deco' },
    { name: 'Cortinas blackout 140x180', sku: 'CORT-BLACK', costPrice: 40, basePrice: 120, category: 'deco' },
    { name: 'Almohada de viaje', sku: 'ALM-VIAJE', costPrice: 18, basePrice: 50, category: 'blanqueria' },
  ];

  // ========== BACK (Taller de medida) ==========
  const backProducts = [
    { name: 'Confección falda medida', sku: 'CONF-FALDA', costPrice: 50, basePrice: 150, category: 'servicio' },
    { name: 'Arreglo pantalón', sku: 'ARREGLO-PANT', costPrice: 15, basePrice: 40, category: 'servicio' },
    { name: 'Confección remera', sku: 'CONF-REMERA', costPrice: 30, basePrice: 90, category: 'servicio' },
    { name: 'Confección blusa', sku: 'CONF-BLUSA', costPrice: 40, basePrice: 120, category: 'servicio' },
    { name: 'Arreglo largo pantalón', sku: 'ARR-LARGO-PANT', costPrice: 12, basePrice: 35, category: 'servicio' },
    { name: 'Confección falda plisada', sku: 'CONF-FALDA-PLIS', costPrice: 60, basePrice: 180, category: 'servicio' },
    { name: 'Arreglo cintura', sku: 'ARR-CINTURA', costPrice: 20, basePrice: 50, category: 'servicio' },
    { name: 'Confección vestido', sku: 'CONF-VEST', costPrice: 80, basePrice: 250, category: 'servicio' },
  ];

  // Insert Front products
  const frontProductRows = db
    .insert(products)
    .values(
      frontProducts.map((p) => ({
        businessUnitId: BU_FRONT,
        ...p,
        taxRate: 21,
        isActive: true,
      }))
    )
    .returning()
    .all();

  // Insert Back products
  const backProductRows = db
    .insert(products)
    .values(
      backProducts.map((p) => ({
        businessUnitId: BU_BACK,
        ...p,
        taxRate: 21,
        isActive: true,
      }))
    )
    .returning()
    .all();

  // ========== STOCK ITEMS ==========
  // Create stock_items for each product with various quantities
  const stockItemData = [
    // Front stock (some high, some low, some out)
    { productId: frontProductRows[0]!.id, quantity: 25 }, // Sábana 144
    { productId: frontProductRows[1]!.id, quantity: 8 },  // Sábana 200 (low)
    { productId: frontProductRows[2]!.id, quantity: 0 },  // Almohada visco (out)
    { productId: frontProductRows[3]!.id, quantity: 12 }, // Funda almohada
    { productId: frontProductRows[4]!.id, quantity: 3 },  // Edredón (low)
    { productId: frontProductRows[5]!.id, quantity: 40 }, // Vela frambuesa
    { productId: frontProductRows[6]!.id, quantity: 35 }, // Vela lavanda
    { productId: frontProductRows[7]!.id, quantity: 6 },  // Difusor
    { productId: frontProductRows[8]!.id, quantity: 0 },  // Porta velas (out)
    { productId: frontProductRows[9]!.id, quantity: 4 },  // Espejo (low)
    { productId: frontProductRows[10]!.id, quantity: 2 }, // Cortinas (low)
    { productId: frontProductRows[11]!.id, quantity: 15 }, // Almohada viaje

    // Back stock (services, no stock usually)
    { productId: backProductRows[0]!.id, quantity: 0 }, // Confección falda
    { productId: backProductRows[1]!.id, quantity: 0 }, // Arreglo pantalón
    { productId: backProductRows[2]!.id, quantity: 0 }, // Confección remera
    { productId: backProductRows[3]!.id, quantity: 0 }, // Confección blusa
    { productId: backProductRows[4]!.id, quantity: 0 }, // Arreglo largo
    { productId: backProductRows[5]!.id, quantity: 0 }, // Confección falda plis
    { productId: backProductRows[6]!.id, quantity: 0 }, // Arreglo cintura
    { productId: backProductRows[7]!.id, quantity: 0 }, // Confección vestido
  ];

  const stockItemRows = db
    .insert(stockItems)
    .values(
      stockItemData.map((item) => ({
        ...item,
        businessUnitId: BU_FRONT, // Will be overridden below for Back items
      }))
    )
    .returning()
    .all();

  // Fix businessUnitId for Back stock items (items 12-19)
  for (let i = 12; i < stockItemRows.length; i++) {
    stockItemRows[i]!.businessUnitId = BU_BACK;
  }

  // ========== STOCK MOVEMENTS (Audit log) ==========
  // Create some historical movements
  const movements = [
    // Sábana 144 (Front)
    { stockItemId: stockItemRows[0]!.id, type: 'entry' as const, quantity: 50, reason: 'Compra a proveedor Textiles SA' },
    { stockItemId: stockItemRows[0]!.id, type: 'sale' as const, quantity: -25, reason: 'Venta #12345' },

    // Sábana 200 (Front)
    { stockItemId: stockItemRows[1]!.id, type: 'entry' as const, quantity: 20, reason: 'Compra a proveedor Textiles SA' },
    { stockItemId: stockItemRows[1]!.id, type: 'sale' as const, quantity: -12, reason: 'Venta #12346' },

    // Edredón (Front)
    { stockItemId: stockItemRows[4]!.id, type: 'entry' as const, quantity: 10, reason: 'Compra especial Verano 2024' },
    { stockItemId: stockItemRows[4]!.id, type: 'sale' as const, quantity: -7, reason: 'Venta #12347' },

    // Vela frambuesa (Front)
    { stockItemId: stockItemRows[5]!.id, type: 'entry' as const, quantity: 100, reason: 'Compra a proveedor Fragancias Ltd' },
    { stockItemId: stockItemRows[5]!.id, type: 'sale' as const, quantity: -30, reason: 'Venta #12348' },
    { stockItemId: stockItemRows[5]!.id, type: 'sale' as const, quantity: -30, reason: 'Venta #12349' },

    // Vela lavanda (Front)
    { stockItemId: stockItemRows[6]!.id, type: 'entry' as const, quantity: 80, reason: 'Compra a proveedor Fragancias Ltd' },
    { stockItemId: stockItemRows[6]!.id, type: 'sale' as const, quantity: -15, reason: 'Venta #12350' },
    { stockItemId: stockItemRows[6]!.id, type: 'sale' as const, quantity: -30, reason: 'Venta #12351' },

    // Almohada visco (Front, now out)
    { stockItemId: stockItemRows[2]!.id, type: 'entry' as const, quantity: 15, reason: 'Compra a proveedor Textiles SA' },
    { stockItemId: stockItemRows[2]!.id, type: 'sale' as const, quantity: -15, reason: 'Venta #12352' },

    // Porta velas (Front, now out)
    { stockItemId: stockItemRows[8]!.id, type: 'entry' as const, quantity: 20, reason: 'Compra a proveedor Deco Store' },
    { stockItemId: stockItemRows[8]!.id, type: 'sale' as const, quantity: -20, reason: 'Venta #12353' },

    // Espejo (Front, low)
    { stockItemId: stockItemRows[9]!.id, type: 'entry' as const, quantity: 10, reason: 'Compra a proveedor Deco Store' },
    { stockItemId: stockItemRows[9]!.id, type: 'sale' as const, quantity: -6, reason: 'Venta #12354' },

    // Cortinas (Front, low)
    { stockItemId: stockItemRows[10]!.id, type: 'entry' as const, quantity: 5, reason: 'Compra a proveedor Textiles SA' },
    { stockItemId: stockItemRows[10]!.id, type: 'sale' as const, quantity: -3, reason: 'Venta #12355' },
  ];

  db.insert(stockMovements)
    .values(
      movements.map((m) => ({
        ...m,
        businessUnitId: BU_FRONT, // Override below for Back items if needed
      }))
    )
    .run();

  console.log('[Seed] Productos y stock cargados correctamente');
  console.log(`[Seed]   BU Front: ${frontProductRows.length} productos`);
  console.log(`[Seed]   BU Back: ${backProductRows.length} productos`);
  console.log(`[Seed]   Stock items: ${stockItemRows.length}`);
  console.log(`[Seed]   Movimientos: ${movements.length}`);
}
