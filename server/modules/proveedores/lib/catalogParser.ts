import * as XLSX from 'xlsx';
import type { RawImportRow } from '../../../../shared/types';

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

// Normaliza un string: lower-case, sin tildes, sin espacios extra
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const COLUMN_PATTERNS: Record<keyof RawImportRow, string[]> = {
  name:         ['nombre', 'name', 'descripcion', 'producto', 'articulo'],
  supplierCode: ['codigo', 'code', 'cod', 'sku', 'ref', 'referencia'],
  unitCost:     ['precio', 'price', 'costo', 'cost', 'valor', 'importe'],
  unit:         ['unidad', 'unit', 'um', 'medida'],
  categoryHint: ['categoria', 'category', 'rubro', 'tipo'],
  // Más específicos que 'descripcion' para no colisionar con el patrón de name
  description:  ['descripcion_producto', 'detalle', 'descripcion_larga', 'detail', 'notes', 'notas'],
  imageName:    ['imagen', 'image', 'foto', 'photo', 'img', 'archivo_imagen'],
};

type ColMap = { [K in keyof RawImportRow]?: number };

function detectColumns(headers: string[]): ColMap {
  const map: ColMap = {};
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS) as [keyof RawImportRow, string[]][]) {
    for (let i = 0; i < headers.length; i++) {
      const h = norm(headers[i] ?? '');
      if (patterns.some((p) => h.includes(p))) {
        map[field] = i;
        break;
      }
    }
  }
  return map;
}

export interface ParsedCatalog {
  rows: RawImportRow[];
  errors: Array<{ row: number; reason: string; rawData: Record<string, unknown> }>;
}

function buildRows(
  data: Record<string, unknown>[],
  colMap: ColMap,
  headers: string[],
): ParsedCatalog {
  const rows: RawImportRow[] = [];
  const errors: ParsedCatalog['errors'] = [];

  data.forEach((dataRow, idx) => {
    const rowNum = idx + 2; // 1-indexed, +1 for header row
    const rawData: Record<string, unknown> = {};
    headers.forEach((h, i) => { rawData[h] = dataRow[h] ?? dataRow[i]; });

    const nameVal  = colMap.name  !== undefined ? String(dataRow[headers[colMap.name]  ?? ''] ?? '').trim() : '';
    const priceRaw = colMap.unitCost !== undefined ? dataRow[headers[colMap.unitCost] ?? ''] : undefined;
    const priceStr = String(priceRaw ?? '').replace(',', '.').trim();
    const unitCost = parseFloat(priceStr);

    if (!nameVal) {
      errors.push({ row: rowNum, reason: 'El nombre está vacío', rawData });
      return;
    }
    if (isNaN(unitCost) || unitCost < 0) {
      errors.push({ row: rowNum, reason: `Precio inválido: "${priceStr}"`, rawData });
      return;
    }

    const codeVal  = colMap.supplierCode !== undefined
      ? String(dataRow[headers[colMap.supplierCode] ?? ''] ?? '').trim() || undefined
      : undefined;
    const unitVal  = colMap.unit !== undefined
      ? String(dataRow[headers[colMap.unit] ?? ''] ?? '').trim() || undefined
      : undefined;
    const catVal   = colMap.categoryHint !== undefined
      ? String(dataRow[headers[colMap.categoryHint] ?? ''] ?? '').trim() || undefined
      : undefined;
    const descVal  = colMap.description !== undefined
      ? String(dataRow[headers[colMap.description] ?? ''] ?? '').trim() || undefined
      : undefined;
    const imgVal   = colMap.imageName !== undefined
      ? String(dataRow[headers[colMap.imageName] ?? ''] ?? '').trim() || undefined
      : undefined;

    rows.push({
      name:         nameVal,
      supplierCode: codeVal,
      unitCost,
      unit:         unitVal,
      categoryHint: catVal,
      description:  descVal,
      imageName:    imgVal,
    });
  });

  return { rows, errors };
}

function assertRequiredColumns(colMap: ColMap, headerList: string[]): void {
  const missing: string[] = [];
  if (colMap.name === undefined)     missing.push('nombre (nombre/name/descripcion/producto/articulo)');
  if (colMap.unitCost === undefined)  missing.push('precio (precio/price/costo/cost/valor/importe)');
  if (missing.length > 0) {
    throw new ParseError(
      `No se pudieron detectar las columnas requeridas: ${missing.join(' y ')}. ` +
      `Columnas encontradas: ${headerList.join(', ')}`,
    );
  }
}

export function parseExcel(buffer: Buffer): ParsedCatalog {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ParseError('El archivo Excel está vacío o no tiene hojas.');

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new ParseError('No se pudo leer la hoja del archivo Excel.');

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (jsonData.length === 0) throw new ParseError('El archivo Excel no contiene datos.');

  const headers = Object.keys(jsonData[0] ?? {});
  const colMap  = detectColumns(headers);
  assertRequiredColumns(colMap, headers);

  return buildRows(jsonData, colMap, headers);
}

export function parseCSV(text: string): ParsedCatalog {
  // Detectar separador: punto y coma o coma
  const firstLine = text.split('\n')[0] ?? '';
  const separator = firstLine.includes(';') ? ';' : ',';

  const workbook  = XLSX.read(text, { type: 'string', FS: separator });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ParseError('El archivo CSV está vacío.');

  const sheet    = workbook.Sheets[sheetName];
  if (!sheet) throw new ParseError('No se pudo leer el archivo CSV.');

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (jsonData.length === 0) throw new ParseError('El archivo CSV no contiene datos.');

  const headers = Object.keys(jsonData[0] ?? {});
  const colMap  = detectColumns(headers);
  assertRequiredColumns(colMap, headers);

  return buildRows(jsonData, colMap, headers);
}
