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

// DTO completo que SaleRepository recibe (ya con cálculos hechos)
export interface CreateSaleRequest {
  businessUnitId: number;
  userId?: number;
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
