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
