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
  description: string | null;
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
  // campos extendidos (Fase 10 Paso 4)
  minimumSalePrice: number | null;
  supplierId: number | null;
  supplierLeadTime: number | null;
  showCatalogPrice: boolean;
  showCatalogStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithStock extends Product {
  currentStock: number;
  minimumThreshold: number;
  stockStatus: 'ok' | 'low' | 'out';
  supplierName: string | null;
}

export type StockMovementType = 'entrada' | 'salida' | 'ajuste';

export interface CreateStockMovementRequest {
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  reason?: string;
  businessUnitId: number;
}

export type BulkPriceAdjustmentType = 'increase_price_pct' | 'increase_cost_pct' | 'set_margin_pct';

export interface BulkPriceUpdateRequest {
  categoryId?: number | null;
  adjustmentType: BulkPriceAdjustmentType;
  value: number;
  businessUnitId: number;
}

export interface BulkPricePreviewItem {
  id: number;
  name: string;
  currentPrice: number;
  newPrice: number;
  currentCost: number;
  newCost: number;
}

export interface BulkPriceUpdateResult {
  updated: number;
  preview: BulkPricePreviewItem[];
}

export interface PurchaseHistoryEntry {
  date: string;
  supplierName: string;
  quantity: number;
  unitCost: number;
  invoiceRef: string | null;
}

export interface ProductStat {
  period: string;
  unitsSold: number;
  revenue: number;
  netProfit: number;
  unitsSoldPrev: number;
  revenuePrev: number;
  netProfitPrev: number;
}

export interface ProductStatSale {
  saleId: number;
  date: string;
  quantity: number;
  lineTotal: number;
}

export interface ProductStats {
  stats: ProductStat;
  salesByMonth: { month: string; units: number }[];
  costHistory: { date: string; unitCost: number }[];
  recentSales: ProductStatSale[];
  costGrowthPct: number | null;
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
  unitCost: number | null;
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
  // Cancelación (RF-POS-08)
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledBy: number | null;
}

export interface SaleFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: 'all' | 'completed' | 'cancelled';
  paymentMethod?: string;
  search?: string;
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

export type CashMovementType = 'opening' | 'sale' | 'refund' | 'deposit' | 'withdrawal' | 'other';

export type CashSessionStatus = 'open' | 'closed' | 'never_opened';

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

export interface Supplier {
  id: number;
  businessUnitId: number;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  paymentTerms?: 'contado' | '15dias' | '30dias' | '60dias' | 'otro' | null;
  deliveryDays?: number | null;
  minimumOrder?: number | null;
  shippingCost?: number | null;
  city?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateSupplierDTO = Omit<Supplier, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;
export type UpdateSupplierDTO = Partial<CreateSupplierDTO>;

export interface SupplierProduct {
  id: number;
  supplierId: number;
  businessUnitId: number;
  name: string;
  supplierCode?: string | null;
  unitCost: number;
  currency: string;
  unit: string;
  categoryHint?: string | null;
  isActive: boolean;
  lastUpdated: string;
  createdAt: string;
  /** Solo presente cuando se consulta con buId (catálogo del proveedor) */
  isLinked?: boolean;
  /** Nombre del producto en mi catálogo (solo cuando isLinked = true) */
  linkedProductName?: string | null;
  /** Precio de venta de mi producto vinculado (para calcular margen) */
  linkedProductBasePrice?: number | null;
}

export interface RawImportRow {
  name: string;
  supplierCode?: string;
  unitCost: number;
  unit?: string;
  categoryHint?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: Array<{
    row: number;
    reason: string;
    rawData: Record<string, unknown>;
  }>;
}

export type UpsertSupplierProductDTO = Omit<SupplierProduct, 'id' | 'isActive' | 'lastUpdated' | 'createdAt'>;

// ── Fase 10: productos del catálogo del proveedor sin vincular ────────────

export interface UnlinkedSupplierProduct {
  supplierProductId: number;
  supplierId: number;
  supplierName: string;
  supplierCode: string | null;
  name: string;
  unitCost: number;
  unit: string;
}

export interface CreateFromSupplierInput {
  supplierProductId: number;
  businessUnitId: number;
  name: string;
  salePrice: number;
  costPrice?: number | null;
  initialStock?: number | null;
}

// ── Fase 10 Pasos 4-5: Comparador de proveedores ──────────────────────────

export interface ProductSupplierLink {
  id: number;
  productId: number;
  supplierProductId: number;
  businessUnitId: number;
  isPreferred: boolean;
  createdAt: string;
}

export interface ComparatorLink {
  linkId: number;
  supplier: Supplier;
  supplierProduct: SupplierProduct;
  isPreferred: boolean;
  margin: number;
  marginAmount: number;
}

export interface ComparatorRow {
  product: Product & { currentStock: number };
  links: ComparatorLink[];
  bestPrice: number | null;
  bestSupplier: string | null;
  stockStatus: 'ok' | 'low' | 'out';
}

export interface SuggestedMatch {
  supplierProduct: SupplierProduct & { supplierName: string };
  suggestedProduct: Product;
  score: number;
}

export interface MinimumOrderWarning {
  supplierId: number;
  supplierName: string;
  minimumOrder: number;
  currentOrder: number;
  missing: number;
}

export interface PurchaseOrderItem {
  product: Product;
  supplierProduct: SupplierProduct;
  supplier: Supplier;
  quantity: number;
  unitCost: number;
  subtotal: number;
  gananciaProyectada: number;
}

export interface SupplierOrderGroup {
  supplier: Supplier;
  items: PurchaseOrderItem[];
  subtotalProductos: number;
  costoEnvio: number;
  total: number;
}

export interface PurchaseOrder {
  items: PurchaseOrderItem[];
  bySupplier: SupplierOrderGroup[];
  warnings: MinimumOrderWarning[];
  totals: {
    totalInversion: number;
    totalEnvios: number;
    totalGananciaProyectada: number;
    roi: number;
    diasRecuperoEstimado: number | null;
  };
}

