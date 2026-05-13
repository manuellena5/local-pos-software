import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcel, parseCSV, ParseError } from '../../server/modules/proveedores/lib/catalogParser';

// Helper: crea un buffer Excel a partir de un array de objetos
function makeExcelBuffer(rows: Record<string, unknown>[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('catalogParser', () => {
  // ── parseExcel ────────────────────────────────────────────────────────────

  describe('parseExcel', () => {
    it('should detect columns case-insensitively', () => {
      const buffer = makeExcelBuffer([
        { NOMBRE: 'Tela lisa', PRECIO: 500, CODIGO: 'TEX-01', UNIDAD: 'metro', CATEGORIA: 'Telas' },
        { NOMBRE: 'Hilo rojo', PRECIO: 120 },
      ]);

      const result = parseExcel(buffer);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({
        name:         'Tela lisa',
        unitCost:     500,
        supplierCode: 'TEX-01',
        unit:         'metro',
        categoryHint: 'Telas',
      });
      expect(result.rows[1]).toMatchObject({ name: 'Hilo rojo', unitCost: 120 });
      expect(result.errors).toHaveLength(0);
    });

    it('should detect columns with partial match (e.g. "descripcion" matches "nombre" patterns)', () => {
      const buffer = makeExcelBuffer([
        { descripcion: 'Tela lisa', costo: 500 },
      ]);

      const result = parseExcel(buffer);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.name).toBe('Tela lisa');
      expect(result.rows[0]?.unitCost).toBe(500);
    });

    it('should throw ParseError when name column is missing', () => {
      const buffer = makeExcelBuffer([
        { precio: 500, codigo: 'X' },
      ]);

      expect(() => parseExcel(buffer)).toThrow(ParseError);
      expect(() => parseExcel(buffer)).toThrow('nombre');
    });

    it('should throw ParseError when price column is missing', () => {
      const buffer = makeExcelBuffer([
        { nombre: 'Tela', codigo: 'X' },
      ]);

      expect(() => parseExcel(buffer)).toThrow(ParseError);
      expect(() => parseExcel(buffer)).toThrow('precio');
    });

    it('should handle rows with non-numeric price gracefully', () => {
      const buffer = makeExcelBuffer([
        { nombre: 'Tela válida',  precio: 500 },
        { nombre: 'Precio texto', precio: 'sin precio' },
        { nombre: 'Precio vacío', precio: '' },
      ]);

      const result = parseExcel(buffer);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.name).toBe('Tela válida');
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]?.reason).toContain('Precio inválido');
    });
  });

  // ── parseCSV ──────────────────────────────────────────────────────────────

  describe('parseCSV', () => {
    it('should parse CSV with comma separator', () => {
      const csv = `nombre,precio,codigo\nTela lisa,500,TEX-01\nHilo rojo,120,HIL-02`;

      const result = parseCSV(csv);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({ name: 'Tela lisa', unitCost: 500, supplierCode: 'TEX-01' });
    });

    it('should parse CSV with semicolon separator', () => {
      const csv = `nombre;precio;codigo\nTela lisa;850,50;TEX-01\nHilo rojo;120;HIL-02`;

      const result = parseCSV(csv);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.name).toBe('Tela lisa');
      expect(result.rows[1]).toMatchObject({ name: 'Hilo rojo', unitCost: 120 });
    });

    it('should throw ParseError when required columns are missing in CSV', () => {
      const csv = `codigo,unidad\nTEX-01,metro`;

      expect(() => parseCSV(csv)).toThrow(ParseError);
    });

    it('should accumulate errors for rows with empty name in CSV', () => {
      const csv = `nombre,precio\nTela válida,500\n,300\nOtro válido,200`;

      const result = parseCSV(csv);

      expect(result.rows).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.reason).toContain('vacío');
    });
  });
});
