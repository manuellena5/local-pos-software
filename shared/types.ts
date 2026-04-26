export interface InstallationConfig {
  id: number;
  businessName: string;
  cuit: string;
  address: string;
  logoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessUnit {
  id: number;
  installationId: number;
  name: string;
  moduleId: string;
  isActive: boolean;
  invoicePrefix: string;
  lastInvoiceNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  installationId: number;
  email: string;
  role: 'admin' | 'cashier';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiErrorResponse {
  data: null;
  error: {
    code: string;
    message: string;
  };
}

export interface Product {
  id: number;
  businessUnitId: number;
  name: string;
  description: string | null;
  category: string | null;
  sku: string;
  costPrice: number;
  basePrice: number;
  taxRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: number;
  productId: number;
  businessUnitId: number;
  quantity: number;
  minimumThreshold: number;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  stockItemId: number;
  businessUnitId: number;
  type: 'entry' | 'sale' | 'adjustment';
  quantity: number;
  reason: string;
  userId: number | null;
  createdAt: string;
}

export interface StockSummary {
  productId: number;
  name: string;
  sku: string;
  currentQuantity: number;
  minimumThreshold: number;
  status: 'ok' | 'low' | 'out';
  lastUpdated: string;
}
