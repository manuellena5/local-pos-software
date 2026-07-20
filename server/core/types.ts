export interface CreateProductRequest {
  name: string;
  description?: string | null;
  category?: string;
  brand?: string | null;
  // sku ya no viene del cliente — se genera en el backend automáticamente
  costPrice: number;
  basePrice: number;
  taxRate?: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string | null;
  category?: string;
  brand?: string | null;
  basePrice?: number;
  costPrice?: number;
  taxRate?: number;
  // retail-textil optional fields
  code?: string | null;
  showInCatalog?: boolean;
  catalogDescription?: string | null;
  // identificadores adicionales
  barcode?: string | null;
  supplierCode?: string | null;
  // campos extendidos Fase 10
  minimumSalePrice?: number | null;
  supplierId?: number | null;
  supplierLeadTime?: number | null;
  showCatalogPrice?: boolean;
  showCatalogStock?: boolean;
}

export interface AdjustStockRequest {
  quantity: number;
  reason: string;
}

// DTO interno para cada ítem dentro de una venta (usado por SaleRepository)
export interface SaleItemInput {
  productId: number;
  variantId?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
}

// DTO que recibe el controller desde el frontend
export interface ConfirmSaleRequest {
  businessUnitId: number;
  userId?: number;
  customerId?: number;
  items: Array<{
    productId: number;
    variantId?: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountPercent: number;
  }>;
  discountPercent?: number;
  discountAmount?: number;
  paymentMethods: Array<{ method: string; amount: number }>;
  /**
   * Ajuste de redondeo de efectivo sugerido/editado por el cajero (siempre
   * <= 0). Solo se aplica si el pago es 100% efectivo; se ignora en pago
   * mixto o con otros medios.
   */
  roundingAdjustment?: number;
}

// ── Fase 4: AFIP ─────────────────────────────────────────────────────────────

export interface AFIPCredentials {
  cuit: string;
  certPath: string;
  keyPath: string;
  /** 'disabled': no se intenta facturar nunca — la venta queda como ticket interno. */
  environment: 'testing' | 'production' | 'mock' | 'disabled';
}

export interface AFIPInvoiceRequest {
  saleId: number;
  businessUnitId: number;
  invoiceType: 'B' | 'C';
  pointOfSale: number;
  totalAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
  /** YYYYMMDD */
  date: string;
}

export interface AFIPInvoiceResponse {
  success: boolean;
  cae?: string;
  /** YYYYMMDD */
  caeExpiration?: string;
  invoiceNumber?: string;
  error?: string;
}

// DTO completo que SaleRepository recibe (ya con cálculos hechos)
export interface CreateSaleRequest {
  businessUnitId: number;
  userId?: number;
  customerId?: number | null;
  items: SaleItemInput[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  roundingAdjustment: number;
  paymentMethods: Array<{ method: string; amount: number }>;
}

// ── Fase 5: Clientes ─────────────────────────────────────────────────────────

export interface CreateCustomerRequest {
  name: string;
  documentType?: 'DNI' | 'CUIT' | 'PASAPORTE';
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  locality?: string;
  province?: string;
  notes?: string;
  creditLimit?: number;
}

export interface UpdateCustomerRequest {
  name?: string;
  documentType?: 'DNI' | 'CUIT' | 'PASAPORTE';
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  locality?: string;
  province?: string;
  notes?: string;
  creditLimit?: number;
}

// ── Fase 5: Caja ─────────────────────────────────────────────────────────────

export interface CreateCashMovementRequest {
  type: 'opening' | 'sale' | 'refund' | 'deposit' | 'withdrawal' | 'other';
  amount: number;
  description: string;
  saleId?: number;
  paymentMethod?: 'cash' | 'transfer' | 'mercadopago' | 'card' | 'other';
}

export interface CreateCashAuditRequest {
  realBalance: number;
  notes?: string;
}

// ── Ventas: gestión post-venta (RF-POS-08) ───────────────────────────────────

export interface CancelSaleRequest {
  reason: string;
  userId?: number;
}
