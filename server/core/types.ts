export interface CreateProductRequest {
  name: string;
  description?: string;
  category?: string;
  sku: string;
  costPrice: number;
  basePrice: number;
  taxRate?: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  basePrice?: number;
  costPrice?: number;
  taxRate?: number;
  // retail-textil optional fields
  code?: string | null;
  showInCatalog?: boolean;
  catalogDescription?: string | null;
}

export interface AdjustStockRequest {
  quantity: number;
  reason: string;
}

// DTO interno para cada ítem dentro de una venta (usado por SaleRepository)
export interface SaleItemInput {
  productId: number;
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
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountPercent: number;
  }>;
  discountPercent?: number;
  discountAmount?: number;
  paymentMethods: Array<{ method: string; amount: number }>;
}

// ── Fase 4: AFIP ─────────────────────────────────────────────────────────────

export interface AFIPCredentials {
  cuit: string;
  certPath: string;
  keyPath: string;
  environment: 'testing' | 'production' | 'mock';
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
  customerId?: number;
  items: SaleItemInput[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
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
  type: 'sale' | 'refund' | 'deposit' | 'withdrawal' | 'other';
  amount: number;
  description: string;
  saleId?: number;
}

export interface CreateCashAuditRequest {
  realBalance: number;
  notes?: string;
}
