export interface InstallationConfig {
  id: number;
  businessName: string;
  cuit: string;
  address: string;
  logoPath: string | null;
  whatsappNumber: string | null;
  catalogBusinessUnitId: number | null;
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
  // retail-textil columns (optional — present when module is active)
  code: string | null;
  showInCatalog: boolean;
  catalogDescription: string | null;
  // identificadores adicionales
  barcode: string | null;
  supplierCode: string | null;
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

export interface PaymentMethod {
  method: string;
  amount: number;
}

export interface Sale {
  id: number;
  businessUnitId: number;
  userId: number | null;
  saleNumber: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethods: PaymentMethod[];
  customerId: number | null;
  status: 'completed' | 'cancelled';
  invoiceNumber: string | null;
  cae: string | null;
  caeExpiration: string | null;
  invoiceStatus: 'pending' | 'issued' | 'error' | 'failed';
  invoiceError: string | null;
  invoiceAttempts: number;
  lastInvoiceAttemptAt: string | null;
  createdAt: string;
}

export interface PendingInvoice {
  id: number;
  saleId: number;
  businessUnitId: number;
  invoiceType: 'B' | 'C';
  retryCount: number;
  lastRetryAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AFIPResult {
  success: boolean;
  cae?: string;
  caeExpiration?: string;
  invoiceNumber?: string;
  error?: string;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  /** Snapshot del nombre al momento de la venta */
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  createdAt: string;
}

// Estado local del carrito — NO se persiste en DB
export interface CartItem {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
}

export interface SaleWithItems {
  sale: Sale;
  items: SaleItem[];
}

// ── Fase 5: Clientes ──────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  documentType: 'DNI' | 'CUIT' | 'PASAPORTE' | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  locality: string | null;
  province: string | null;
  notes: string | null;
  creditLimit: number;
  creditUsed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Fase 5: Caja ──────────────────────────────────────────────────────────

export type CashMovementType = 'sale' | 'refund' | 'deposit' | 'withdrawal' | 'other';

export interface CashMovement {
  id: number;
  businessUnitId: number;
  type: CashMovementType;
  amount: number;
  description: string;
  saleId: number | null;
  userId: number | null;
  createdAt: string;
}

export interface CashAudit {
  id: number;
  businessUnitId: number;
  auditDate: string;
  theoreticalBalance: number;
  realBalance: number;
  difference: number;
  notes: string | null;
  status: 'balanced' | 'discrepancy' | 'discrepancy_resolved';
  createdAt: string;
}

// ── Fase 5: Reportes ──────────────────────────────────────────────────────

export interface SalesReport {
  date: string;
  totalSales: number;
  totalAmount: number;
  avgTicket: number;
  paymentBreakdown: { method: string; count: number; amount: number }[];
}

export interface TopProductsReport {
  productId: number;
  name: string;
  category: string | null;
  quantity: number;
  revenue: number;
}

export interface TopCustomersReport {
  customerId: number | null;
  name: string;
  purchaseCount: number;
  totalSpent: number;
}

// ── Fase 9: Dashboard ─────────────────────────────────────────────────────

export interface DashboardData {
  salesToday: { count: number; total: number };
  cashbox: { balance: number; lastAuditDate: string | null; lastAuditStatus: string | null };
  criticalStock: { productId: number; name: string; current: number; threshold: number; status: 'low' | 'out' }[];
  upcomingOrders?: { id: number; customerName: string; description: string; estimatedDelivery: string; daysLeft: number; status: string }[];
  topProductsWeek?: { productId: number; name: string; quantity: number; revenue: number }[];
}

export interface Category {
  id: number;
  name: string;
  businessUnitId: number;
  isActive: boolean;
  createdAt: string;
}
