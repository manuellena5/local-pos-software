import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { eq } from 'drizzle-orm';
import { db } from './connection';
import { businessUnits } from './schema';
import { ProductRepository } from '../core/repositories/ProductRepository';
import { ProductImportService } from '../core/services/ProductImportService';
import { AROMAS_BU_NAME } from './seed';
import type { ProductImportRow } from '../../shared/types';

function getCsvPath(): string {
  return (
    process.env.LOCALPOS_SEED_CSV_PATH ?? path.join(process.cwd(), 'resources', 'seed', 'productos.csv')
  );
}

/**
 * Capa 2 del seed — importa el catálogo de prueba desde un CSV editable.
 * Delega el parseo/upsert a ProductImportService (mismo motor que usa el
 * importador manual de la pantalla de Productos). Ver
 * resources/seed/README.md para el detalle de columnas.
 */
export function seedDemoProducts(): void {
  const csvPath = getCsvPath();
  if (!fs.existsSync(csvPath)) {
    console.warn(`[DB] Seed demo: no se encontró ${csvPath} — se omite`);
    return;
  }

  const bu = db
    .select()
    .from(businessUnits)
    .where(eq(businessUnits.name, AROMAS_BU_NAME))
    .get();
  if (!bu) {
    console.warn('[DB] Seed demo: no existe la BU "Aromas/Home&Deco" — corré runSystemSeed() primero');
    return;
  }

  // XLSX.readFile() no detecta UTF-8 de forma confiable para .csv sin BOM
  // (termina leyendo tildes/ñ como Latin1 → mojibake). Se lee el archivo
  // como texto UTF-8 explícito y se lo pasa ya decodificado.
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<ProductImportRow>(sheet, { defval: '' });

  if (rows.length === 0) {
    console.log('[DB] Seed demo: CSV vacío — nada para importar');
    return;
  }

  const service = new ProductImportService(new ProductRepository());
  const result = service.importRows(bu.id, rows);

  console.log(
    `[DB] Seed demo aplicado: ${result.productsCreated} productos nuevos, ${result.productsExisting} ya existían, ${result.variantsWritten} variantes procesadas (${result.totalRows} filas del CSV)`,
  );
}
