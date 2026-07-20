// Estilos de celda compartidos entre ProductsTable y ProductVariantRows para
// que las subfilas de variantes queden alineadas con las columnas del producto.

// overflow-hidden removed from th — would block pointer-events on the absolute ResizeHandle
export const thCls =
  'relative text-left px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide select-none';
// max-w-0 on td makes overflow:hidden + text-ellipsis work in table-layout:fixed
export const tdCls = 'px-2 py-1 text-xs overflow-hidden';
export const tdTruncate = `${tdCls} truncate`;

export function marginClass(margin: number): string {
  if (margin >= 80) return 'text-green-700 font-bold';
  if (margin >= 30) return 'text-amber-600 font-bold';
  return 'text-red-600 font-bold';
}
