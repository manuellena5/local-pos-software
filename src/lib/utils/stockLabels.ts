export function getStockMovementLabel(reason: string, supplierName?: string | null): string {
  switch (reason) {
    case 'stock_inicial':     return 'Stock inicial';
    case 'importacion_excel': return 'Importación Excel';
    case 'entrada_manual':    return 'Entrada manual';
    case 'compra':            return supplierName ?? 'Compra sin proveedor';
    case 'ajuste_variante':   return 'Ajuste de stock';
    case 'ajuste_manual':     return 'Ajuste manual';
    case 'venta':             return 'Venta';
    case 'anulacion':         return 'Anulación de venta';
    default:                  return reason || 'Sin descripción';
  }
}
