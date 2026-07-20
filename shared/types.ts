export interface PrinterConfig {
  type: 'usb' | 'network';
  usbVendorId?: number;
  usbProductId?: number;
  portPath?: string;
  host?: string;
  port?: number;
  characterSet?: string;
  width?: number;
}

export type PrinterStatus = 'connected' | 'disconnected' | 'error';

export interface InstallationConfig {
  id: number;
  businessName: string;
  cuit: string;
  /** Dirección completa legacy (campo original) */
  address: string;
  /** Calle y número — nuevo campo separado */
  addressStreet: string;
  /** Localidad / ciudad — nuevo campo separado */
  addressCity: string;
  ingBrutos: string;
  /** Condición fiscal del negocio */
  fiscalCondition: 'monotributo' | 'responsable_inscripto';
  logoPath: string | null;
  whatsappNumber: string | null;
  catalogBusinessUnitId: number | null;
  printerConfig: PrinterConfig | null;
  printerEnabled: boolean;
  /** Múltiplo de redondeo comercial para pagos 100% en efectivo — 0 = desactivado */
  roundingMultiple: number;
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
  brand: string | null;
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
  primaryImage?: string | null;
  hasVariants?: boolean;
  variantBreakdown?: string | null;
}

/** Fila del CSV de importación masiva de productos (formato largo: una fila
 *  = producto simple, o una variante de un producto agrupado por `nombre`
 *  repetido). Ver resources/seed/README.md para el detalle de columnas. */
export interface ProductImportRow {
  nombre?: string;
  categoria?: string;
  precio?: string | number;
  costo?: string | number;
  stock?: string | number;
  sku?: string;
  tipo_variante?: string;
  valor_variante?: string;
}

export interface ProductImportResult {
  productsCreated: number;
  productsExisting: number;
  variantsWritten: number;
  totalRows: number;
}

export type StockMovementType = 'entrada' | 'salida' | 'ajuste';

export interface CreateStockMovementRequest {
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  reason?: string;
  businessUnitId: number;
  /** Variante afectada (módulo retail-textil) — omitir si el producto no usa variantes */
  variantId?: number;
  /** Proveedor asociado al movimiento */
  supplierId?: number;
}

/** Detalle de stock de un producto para el modal de movimientos */
export interface ProductStockDetail {
  productId: number;
  name: string;
  sku: string;
  currentStock: number;
  minimumThreshold: number;
  /** Variantes activas — vacío si el producto no usa variantes */
  variants: Array<{
    id: number;
    attributeType: string;
    attributeValue: string;
    stock: number;
    costPrice: number;
  }>;
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
  reason?: string | null;
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
  reasonLabel?: string | null;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  notes?: string | null;
  variantId?: number | null;
  supplierId?: number | null;
  /** Enriquecidos por el endpoint de historial / reporte de stock */
  variantLabel?: string | null;
  supplierName?: string | null;
  productName?: string | null;
  productSku?: string | null;
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
  /** Ajuste de redondeo aplicado (siempre <= 0). totalAmount ya lo incluye. */
  roundingAdjustment: number;
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
  cashSessionId?: number;
}

export interface SalePreviewItem {
  productName: string;
  quantity: number;
}

/** Sale enriquecida con preview de ítems y datos de cliente — usada en el listado */
export interface SaleListEntry extends Sale {
  items: SalePreviewItem[];
  totalItems: number;
  totalUnits: number;
  customerName: string | null;
  customerDocument: string | null;
  customerDocumentType: string | null;
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
  /** Variante vendida (módulo retail-textil) — null si no aplica */
  variantId?: number | null;
  /** Snapshot del nombre al momento de la venta */
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  createdAt: string;
}

export interface InsufficientStockItem {
  productName: string;
  requested: number;
  available: number;
}

// Estado local del carrito — NO se persiste en DB
export interface CartItem {
  productId: number;
  variantId?: number;
  variantLabel?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  /** Stock disponible de la variante específica (o del producto si no tiene variantes). Usado para la advertencia en el carrito. */
  availableStock?: number;
}

export interface SaleWithItems {
  sale: Sale;
  items: SaleItem[];
}

export interface SaleTicketData {
  saleNumber: string;
  date: string;
  time: string;
  businessName: string;
  businessAddress: string;
  cuit: string;
  ingBrutos?: string;
  /** Condición fiscal del NEGOCIO (Monotributista / Responsable Inscripto) — va en el header */
  businessFiscalCondition?: string;
  businessUnitName: string;
  /** Condición fiscal del CLIENTE (Consumidor Final / Nombre) — va en el cuerpo */
  fiscalCondition: string;
  /** Tipo de documento del receptor para el QR AFIP (80=CUIT, 96=DNI, 99=CF) */
  customerDocType?: number;
  /** Número de documento sin guiones (0 para CF) */
  customerDoc?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    /** Porcentaje de descuento por ítem (0 si no hay) */
    itemDiscount?: number;
  }>;
  /** Subtotal antes de aplicar el descuento global */
  subtotalBeforeDiscount?: number;
  /** Porcentaje de descuento global (0 si no hay) */
  globalDiscount?: number;
  /** Monto descontado en $ */
  globalDiscountAmount?: number;
  /** Ajuste de redondeo aplicado (negativo o 0) — se imprime antes del TOTAL */
  roundingAdjustment?: number;
  total: number;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  change?: number;
  cae?: string;
  /** Vencimiento CAE en formato "AAAAMMDD" (se formatea al imprimir) */
  caeVto?: string;
  /** Número de comprobante completo: "C-0001-00000014" */
  invoiceNumber?: string;
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

export type CashPaymentMethodType = 'cash' | 'transfer' | 'mercadopago' | 'card' | 'other';

export type CashSessionStatus = 'open' | 'closed' | 'never_opened';

export interface SessionBalance {
  total: number;
  cashBalance: number;
  byMethod: Record<CashPaymentMethodType, number>;
  /** Suma de todas las ventas (todos los métodos), positivo */
  totalSales: number;
  /** Suma de todas las anulaciones (todos los métodos), positivo */
  totalVoids: number;
  /** Suma de egresos manuales (withdrawal, todos los métodos), positivo */
  totalManualOut: number;
  /** Suma de ingresos manuales (deposit + other, todos los métodos), positivo */
  totalManualIn: number;
}

export interface CashMovement {
  id: number;
  businessUnitId: number;
  type: CashMovementType;
  amount: number;
  description: string;
  saleId: number | null;
  userId: number | null;
  code: string | null;
  paymentMethod: CashPaymentMethodType;
  createdAt: string;
}

export interface CashSessionSummary {
  id: number;
  code: string;
  openedAt: string;
  closedAt: string | null;
}

export interface CashAudit {
  id: number;
  businessUnitId: number;
  auditDate: string;
  /** Balance teórico del efectivo únicamente (excluye transferencias, MP, tarjeta) */
  theoreticalBalance: number;
  /** Efectivo contado físicamente por el operador */
  realBalance: number;
  /** realBalance - theoreticalBalance (negativo = faltante) */
  difference: number;
  /** Suma de métodos no-efectivo en la sesión (informativo) */
  otherMethodsTotal: number;
  notes: string | null;
  status: 'balanced' | 'discrepancy' | 'discrepancy_resolved';
  createdAt: string;
}

// ── DT-02: Reporte Z ─────────────────────────────────────────────────────

export interface ReporteZData {
  sessionId: number;
  businessUnitName: string;
  businessName: string;
  openedAt: string;
  closedAt: string;
  operatorEmail: string | null;

  sales: {
    total: number;
    count: number;
    cancelledCount: number;
    averageTicket: number;
    byPaymentMethod: Array<{ method: string; amount: number }>;
  };

  cash: {
    openingBalance: number;
    manualIncome: number;
    manualExpense: number;
    cashSalesTotal: number;
    theoreticalBalance: number;
    declaredBalance: number;
    difference: number;
    /** Suma de los ajustes de redondeo de efectivo de la sesión (siempre <= 0) */
    totalRoundingAdjustment: number;
  };

  afip: {
    emitted: number;
    pending: number;
  };

  generatedAt: string;
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

export interface DashboardDTO {
  kpis: {
    salesToday: number;
    salesTodayDelta: number | null;
    transactionsToday: number;
    avgTicketToday: number;
    salesWeek: number;
    transactionsWeek: number;
    salesMonth: number;
  };
  last7Days: Array<{
    date: string;
    label: string;
    total: number;
  }>;
  paymentMethods: Array<{
    method: string;
    label: string;
    total: number;
    percentage: number;
  }>;
  cajaActual: {
    isOpen: boolean;
    openedAt: string | null;
    openingAmount: number;
    salesToday: number;
    cashSalesToday: number;
    manualIncome: number;
    manualExpense: number;
    estimatedCash: number;
  } | null;
  lowStock: Array<{
    productId: number;
    variantId?: number;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    minStock: number;
    isCritical: boolean;
  }>;
  recentSales: Array<{
    id: number;
    createdAt: string;
    total: number;
    paymentMethod: string;
    customerName: string | null;
    itemsCount: number;
  }>;
  topProducts: Array<{
    productId: number;
    name: string;
    sku: string;
    totalUnits: number;
    totalRevenue: number;
  }>;
}

export interface Category {
  id: number;
  name: string;
  businessUnitId: number;
  isActive: boolean;
  createdAt: string;
}

/** Medio de pago configurable (Configuración → Medios de pago). `code` es
 *  uno de los valores fijos ya usados en ventas/caja (cash, transfer,
 *  mercadopago, card, other) — isActive solo controla si se ofrece en la UI. */
export interface PaymentMethodConfig {
  id: number;
  code: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
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
  description?: string | null;
  imageName?: string | null;
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
  description?: string;
  imageName?: string;
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
  categoryName?: string | null;
  description?: string | null;
}

// ── POS: resultado de búsqueda con info de variantes ─────────────────────

export interface ProductSearchResult extends Product {
  hasVariants: boolean;
  variantCount: number;
  availableVariantCount: number;
}

// ── retail-textil: Variantes de producto (RF-RT-01, RF-RT-02) ────────────

export interface ProductVariant {
  id: number;
  productId: number;
  businessUnitId: number;
  attributeType: string;
  attributeValue: string;
  price: number;
  costPrice: number;
  sku: string | null;
  barcode: string | null;
  stock: number;
  isActive: boolean;
  hasSales?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantInput {
  id?: number;
  attributeValue: string;
  price: number;
  costPrice: number;
  barcode?: string | null;
  stock?: number;
}

export interface UpsertProductVariantsRequest {
  attributeType: string;
  variants: ProductVariantInput[];
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

