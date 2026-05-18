import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '@/core/store/appStore';
import { apiClient } from '@/lib/api/client';
import {
  useComparatorData,
  useSuggestedMatches,
  useProductLinks,
  usePurchaseOrder,
  useUnlinkedProducts,
} from '../hooks/useComparator';
import { useSuppliers } from '../hooks/useSuppliers';
import { useSupplierProducts } from '../hooks/useSupplierProducts';
import { AddToCatalogModal } from './AddToCatalogModal';
import type {
  ComparatorRow,
  ComparatorLink,
  SuggestedMatch,
  PurchaseOrder,
  Supplier,
  SupplierProduct,
  UnlinkedSupplierProduct,
} from '@shared/types';

// ── helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function calcMargin(salePrice: number, cost: number): number {
  if (salePrice <= 0) return 0;
  return Math.round(((salePrice - cost) / salePrice) * 100 * 10) / 10;
}

function MarginBadge({ margin }: { margin: number }) {
  const color =
    margin >= 30 ? 'text-green-700 bg-green-50 border-green-200' :
    margin >= 15 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                   'text-red-700 bg-red-50 border-red-200';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium border ${color}`}>
      {margin.toFixed(1)}%
    </span>
  );
}

function StockBadge({ status, qty }: { status: 'ok' | 'low' | 'out'; qty: number }) {
  if (status === 'out') return <span className="text-xs text-red-600 font-medium">Sin stock</span>;
  if (status === 'low') return <span className="text-xs text-yellow-600 font-medium">Stock bajo ({qty})</span>;
  return <span className="text-xs text-green-600">Stock: {qty}</span>;
}

function bestLinkForRow(row: ComparatorRow): ComparatorLink | null {
  if (row.links.length === 0) return null;
  const preferred = row.links.find((l) => l.isPreferred);
  if (preferred) return preferred;
  return row.links.reduce((best, cur) =>
    cur.supplierProduct.unitCost < best.supplierProduct.unitCost ? cur : best,
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────

interface ToastProps { message: string; onDone: () => void }

function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
      <span className="text-green-400">✓</span>
      {message}
    </div>
  );
}

// ── LinkModal (sin cambios respecto al original) ──────────────────────────

interface LinkModalProps {
  row: ComparatorRow;
  businessUnitId: number;
  suppliers: Supplier[];
  onClose: () => void;
  onChanged: () => void;
}

function LinkModal({ row, businessUnitId, suppliers, onClose, onChanged }: LinkModalProps) {
  const { createLink, setPreferred, deleteLink, isWorking, error } = useProductLinks();
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [supplierProductsList, setSupplierProductsList] = useState<SupplierProduct[]>([]);
  const [selectedSpId, setSelectedSpId] = useState<number | ''>('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  async function loadSupplierProducts(supplierId: number) {
    setLoadingProducts(true);
    setSelectedSpId('');
    try {
      const data = await apiClient.get<SupplierProduct[]>(
        `/api/modules/proveedores/suppliers/${supplierId}/products`,
      );
      setSupplierProductsList(data);
    } catch {
      setSupplierProductsList([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleAddLink() {
    if (!selectedSpId || !selectedSupplierId) return;
    const link = await createLink(row.product.id, selectedSpId as number, businessUnitId);
    if (link) {
      onChanged();
      setSelectedSupplierId('');
      setSelectedSpId('');
      setSupplierProductsList([]);
    }
  }

  async function handleSetPreferred(linkId: number) {
    await setPreferred(linkId);
    onChanged();
  }

  async function handleDeleteLink(linkId: number) {
    await deleteLink(linkId);
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">
            Proveedores para <span className="text-blue-700">{row.product.name}</span>
          </h2>
          <p className="text-xs text-gray-400 mb-4">Precio de venta: {fmt(row.product.basePrice)}</p>

          {row.links.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Sin proveedores vinculados aún.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {row.links.map((link) => (
                <li key={link.linkId} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{link.supplier.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{fmt(link.supplierProduct.unitCost)}</span>
                    <span className="ml-2">
                      <MarginBadge margin={calcMargin(row.product.basePrice, link.supplierProduct.unitCost)} />
                    </span>
                    {link.isPreferred && <span className="ml-1 text-yellow-500 text-xs">⭐ preferido</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {!link.isPreferred && (
                      <button
                        onClick={() => void handleSetPreferred(link.linkId)}
                        disabled={isWorking}
                        className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                      >⭐</button>
                    )}
                    <button
                      onClick={() => void handleDeleteLink(link.linkId)}
                      disabled={isWorking}
                      className="px-2 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-500 disabled:opacity-50"
                    >×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t pt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Agregar proveedor</p>
            <div className="space-y-2">
              <select
                value={selectedSupplierId}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  setSelectedSupplierId(isNaN(id) ? '' : id);
                  if (!isNaN(id)) void loadSupplierProducts(id);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Elegir proveedor —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              {selectedSupplierId !== '' && (
                <select
                  value={selectedSpId}
                  onChange={(e) => setSelectedSpId(parseInt(e.target.value, 10) || '')}
                  disabled={loadingProducts}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— {loadingProducts ? 'Cargando…' : 'Elegir producto del catálogo'} —</option>
                  {supplierProductsList.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name} — {fmt(sp.unitCost)}</option>
                  ))}
                </select>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                onClick={() => void handleAddLink()}
                disabled={!selectedSpId || isWorking}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isWorking ? 'Vinculando…' : 'Vincular'}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SuggestionsModal (sin cambios) ────────────────────────────────────────

interface SuggestionsModalProps {
  suggestions: SuggestedMatch[];
  businessUnitId: number;
  onClose: () => void;
  onLinked: () => void;
}

function SuggestionsModal({ suggestions, businessUnitId, onClose, onLinked }: SuggestionsModalProps) {
  const { createLink, isWorking } = useProductLinks();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  async function handleAccept(s: SuggestedMatch) {
    const link = await createLink(s.suggestedProduct.id, s.supplierProduct.id, businessUnitId);
    if (link) {
      setDismissed((prev) => new Set(prev).add(s.supplierProduct.id));
      onLinked();
    }
  }

  const visible = suggestions.filter((s) => !dismissed.has(s.supplierProduct.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-base font-bold text-gray-900">Sugerencias automáticas</h2>
          <p className="text-xs text-gray-400 mt-0.5">Productos con nombre similar ({visible.length} pendientes)</p>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {visible.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay sugerencias pendientes.</p>
          ) : (
            visible.map((s) => (
              <div key={s.supplierProduct.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.suggestedProduct.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    ↔ {s.supplierProduct.supplierName} · {s.supplierProduct.name} · {fmt(s.supplierProduct.unitCost)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-xs text-gray-400">{Math.round(s.score * 100)}%</span>
                  <button
                    onClick={() => void handleAccept(s)}
                    disabled={isWorking}
                    className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >✓</button>
                  <button
                    onClick={() => setDismissed((prev) => new Set(prev).add(s.supplierProduct.id))}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500"
                  >✗</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-5 border-t">
          <button onClick={onClose} className="w-full px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OrderPanel ─────────────────────────────────────────────────────────────

function exportToExcel(order: PurchaseOrder) {
  const wb = XLSX.utils.book_new();
  for (const group of order.bySupplier) {
    const rows = [
      ['Producto', 'Código prov.', 'Unidad', 'Cant.', 'Precio unit.', 'Subtotal', 'Ganancia proy.'],
      ...group.items.map((item) => [
        item.product.name, item.supplierProduct.supplierCode ?? '', item.supplierProduct.unit,
        item.quantity, item.unitCost, item.subtotal, item.gananciaProyectada,
      ]),
      [], ['Subtotal productos', '', '', '', '', group.subtotalProductos],
      ['Costo envío', '', '', '', '', group.costoEnvio],
      ['TOTAL', '', '', '', '', group.total],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), group.supplier.name.slice(0, 31));
  }
  const resumenRows = [
    ['Proveedor', 'Subtotal productos', 'Envío', 'Total'],
    ...order.bySupplier.map((g) => [g.supplier.name, g.subtotalProductos, g.costoEnvio, g.total]),
    [],
    ['Inversión total (con envíos)', order.totals.totalInversion],
    ['Envíos incluidos', order.totals.totalEnvios],
    ['Ganancia proyectada', order.totals.totalGananciaProyectada],
    ['ROI estimado (%)', order.totals.roi],
    ['Días de recupero', order.totals.diasRecuperoEstimado ?? 'Sin historial'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenRows), 'Resumen');
  XLSX.writeFile(wb, `pedido-proveedores-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

interface OrderPanelProps {
  order: PurchaseOrder | null;
  isBuilding: boolean;
  error: string | null;
  onRefresh: () => void;
  onClear: () => void;
  onClose: () => void;
}

function OrderPanel({ order, isBuilding, error, onRefresh, onClear, onClose }: OrderPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-sm font-bold text-gray-900">Pedido de compra</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isBuilding && <p className="text-sm text-gray-400 text-center py-8">Calculando…</p>}
        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {!isBuilding && !order && !error && (
          <p className="text-sm text-gray-400 text-center py-8">Ingresá cantidades para armar el pedido.</p>
        )}
        {order && (
          <>
            {order.bySupplier.map((group) => {
              const warning = order.warnings.find((w) => w.supplierId === group.supplier.id);
              return (
                <div key={group.supplier.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                    {group.supplier.name}
                    {group.supplier.paymentTerms && <span className="ml-1 text-gray-400">· {group.supplier.paymentTerms}</span>}
                    {group.supplier.city && <span className="ml-1 text-gray-400">· {group.supplier.city}</span>}
                    {group.supplier.deliveryDays != null && <span className="ml-1 text-gray-400">· {group.supplier.deliveryDays}d</span>}
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    {group.items.map((item) => (
                      <div key={item.supplierProduct.id} className="flex justify-between text-xs">
                        <span className="text-gray-700 truncate flex-1 mr-2">{item.product.name} ×{item.quantity}</span>
                        <span className="text-gray-600 shrink-0">{fmt(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 mt-1 space-y-0.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Productos:</span><span>{fmt(group.subtotalProductos)}</span>
                      </div>
                      {group.costoEnvio > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Envío:</span><span>{fmt(group.costoEnvio)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-semibold text-gray-800">
                        <span>Total proveedor:</span><span>{fmt(group.total)}</span>
                      </div>
                    </div>
                  </div>
                  {warning && (
                    <div className="bg-yellow-50 border-t border-yellow-200 px-3 py-2">
                      <p className="text-xs text-yellow-700 font-medium">⚠ Compra mínima: {fmt(warning.minimumOrder)}</p>
                      <p className="text-xs text-yellow-600">Faltan {fmt(warning.missing)} para alcanzar el mínimo</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Resumen de totales con explicaciones inline */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-1.5 bg-gray-50">
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Inversión total:</span><span>{fmt(order.totals.totalInversion)}</span>
              </div>
              {order.totals.totalEnvios > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Envíos incluidos:</span><span>{fmt(order.totals.totalEnvios)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-green-700">
                <span
                  title="Suma de (precio venta − costo) × cantidad para cada producto del pedido"
                  className="cursor-help underline decoration-dotted"
                >
                  Ganancia proyectada:
                </span>
                <span>{fmt(order.totals.totalGananciaProyectada)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-blue-700">
                <span
                  title="Retorno sobre la inversión: ganancia proyectada ÷ inversión total × 100. Indica cuánto ganás por cada peso invertido."
                  className="cursor-help underline decoration-dotted"
                >
                  ROI estimado:
                </span>
                <span>{order.totals.roi.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span
                  title="Estimación de días para recuperar la inversión, basada en el historial de ventas de los últimos 30 días"
                  className="cursor-help underline decoration-dotted"
                >
                  Recupero est.:
                </span>
                <span>{order.totals.diasRecuperoEstimado != null ? `${order.totals.diasRecuperoEstimado} días` : 'Sin historial'}</span>
              </div>
              {/* Leyenda */}
              <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-200 mt-1">
                ⓘ Pasá el cursor sobre cada término para ver su definición.
              </p>
            </div>
          </>
        )}
      </div>
      <div className="p-4 border-t space-y-2">
        <button
          onClick={onRefresh}
          disabled={isBuilding}
          title="Recalculá la simulación si cambiaste cantidades después de abrirla"
          className="w-full px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {isBuilding ? 'Calculando…' : '↻ Actualizar simulación'}
        </button>
        {order && (
          <button onClick={() => exportToExcel(order)} className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
            Exportar a Excel ↓
          </button>
        )}
        <button onClick={onClear} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
          Limpiar pedido
        </button>
      </div>
    </div>
  );
}

// ── ProductDetailPanel ────────────────────────────────────────────────────
// Panel lateral derecho que muestra detalle de un producto seleccionado.

interface DetailProduct {
  kind: 'own';
  row: ComparatorRow;
}
interface DetailUnlinked {
  kind: 'unlinked';
  item: UnlinkedSupplierProduct;
}
type DetailTarget = DetailProduct | DetailUnlinked;

interface ProductDetailPanelProps {
  target: DetailTarget;
  businessUnitId: number;
  suppliers: Supplier[];
  quantityMap: Map<number, number>;
  onAddToOrder: (productId: number, supplierProductId: number, qty: number, productName: string) => void;
  onOpenLinkModal: (row: ComparatorRow) => void;
  onClose: () => void;
}

function ProductDetailPanel({
  target,
  businessUnitId,
  suppliers: _suppliers,
  quantityMap,
  onAddToOrder,
  onOpenLinkModal,
  onClose,
}: ProductDetailPanelProps) {
  const [addToCatalog, setAddToCatalog] = useState<UnlinkedSupplierProduct | null>(null);

  if (target.kind === 'unlinked') {
    const item = target.item;
    return (
      <>
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-30">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900 truncate pr-2">{item.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
              <p className="text-xs font-medium text-yellow-700">Este producto no está en tu catálogo</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                Agregalo para poder comparar márgenes y armar pedidos de compra.
              </p>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Proveedor</span>
                <span className="font-medium text-gray-800">{item.supplierName}</span>
              </div>
              {item.supplierCode && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Código</span>
                  <span className="font-mono text-xs text-gray-600">{item.supplierCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Costo</span>
                <span className="font-semibold text-gray-900">{fmt(item.unitCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unidad</span>
                <span className="text-gray-700">{item.unit}</span>
              </div>
            </div>

            <button
              onClick={() => setAddToCatalog(item)}
              className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
            >
              + Agregar a mi catálogo
            </button>
          </div>
        </div>

        {addToCatalog && (
          <AddToCatalogModal
            supplierProduct={addToCatalog}
            businessUnitId={businessUnitId}
            onClose={() => setAddToCatalog(null)}
            onSuccess={() => { setAddToCatalog(null); onClose(); }}
          />
        )}
      </>
    );
  }

  // kind === 'own'
  const { row } = target;
  const product = row.product;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-30">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-sm font-bold text-gray-900 truncate pr-2">{product.name}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info del producto */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1 space-y-0.5">
            {product.category && <p className="text-xs text-gray-400">{product.category}</p>}
            <p className="text-gray-600">
              Venta: <span className="font-semibold text-gray-900">{fmt(product.basePrice)}</span>
            </p>
          </div>
          <div className="text-right">
            {row.stockStatus === 'out' && <span className="text-xs font-medium text-red-600">Sin stock</span>}
            {row.stockStatus === 'low' && <span className="text-xs font-medium text-yellow-600">Stock bajo ({product.currentStock})</span>}
            {row.stockStatus === 'ok' && <span className="text-xs text-green-600">Stock: {product.currentStock}</span>}
          </div>
        </div>

        {/* Proveedores */}
        {row.links.length === 0 ? (
          <div className="text-center space-y-2 py-4">
            <p className="text-sm text-gray-400">No hay proveedores vinculados</p>
            <button
              onClick={() => onOpenLinkModal(row)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Vincular proveedor
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proveedores</p>
            {row.links.map((link) => {
              const margin = calcMargin(product.basePrice, link.supplierProduct.unitCost);
              const marginAmt = Math.round((product.basePrice - link.supplierProduct.unitCost) * 100) / 100;
              const currentQty = quantityMap.get(product.id) ?? 0;

              return (
                <SupplierDetailCard
                  key={link.linkId}
                  link={link}
                  margin={margin}
                  marginAmt={marginAmt}
                  isPreferred={link.isPreferred}
                  currentQty={currentQty}
                  onAddToOrder={(qty) => onAddToOrder(product.id, link.supplierProduct.id, qty, product.name)}
                />
              );
            })}
          </div>
        )}
      </div>

      {row.links.length > 0 && (
        <div className="p-4 border-t">
          <button
            onClick={() => onOpenLinkModal(row)}
            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            Gestionar vínculos ···
          </button>
        </div>
      )}
    </div>
  );
}

// Card de proveedor dentro del panel de detalle
interface SupplierDetailCardProps {
  link: ComparatorLink;
  margin: number;
  marginAmt: number;
  isPreferred: boolean;
  currentQty: number;
  onAddToOrder: (qty: number) => void;
}

function SupplierDetailCard({ link, margin, marginAmt, isPreferred, currentQty, onAddToOrder }: SupplierDetailCardProps) {
  const [qty, setQty] = useState(currentQty > 0 ? String(currentQty) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when external quantityMap changes (e.g. cleared)
  useEffect(() => {
    if (currentQty === 0) setQty('');
  }, [currentQty]);

  function commit() {
    const n = parseInt(qty, 10);
    if (!isNaN(n) && n > 0) {
      onAddToOrder(n);
      // Keep the value visible so user knows what's in the order
    }
  }

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${isPreferred ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">
          {isPreferred && <span className="text-yellow-500 mr-1">⭐</span>}
          {link.supplier.name}
        </span>
        <MarginBadge margin={margin} />
      </div>

      <div className="text-xs text-gray-600 space-y-0.5">
        <div className="flex justify-between">
          <span>Costo:</span>
          <span className="font-medium text-gray-800">{fmt(link.supplierProduct.unitCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Ganancia/u:</span>
          <span className="font-medium text-green-700">+{fmt(marginAmt)}</span>
        </div>
        {link.supplier.city && (
          <div className="flex justify-between">
            <span>Ciudad:</span><span>{link.supplier.city}</span>
          </div>
        )}
        {link.supplier.paymentTerms && (
          <div className="flex justify-between">
            <span>Pago:</span><span>{link.supplier.paymentTerms}</span>
          </div>
        )}
        {link.supplier.deliveryDays != null && (
          <div className="flex justify-between">
            <span>Entrega:</span><span>{link.supplier.deliveryDays} días</span>
          </div>
        )}
        {link.supplier.shippingCost != null && link.supplier.shippingCost > 0 && (
          <div className="flex justify-between">
            <span>Envío:</span><span>{fmt(link.supplier.shippingCost)}</span>
          </div>
        )}
      </div>

      {/* Agregar al pedido */}
      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { commit(); inputRef.current?.blur(); } }}
          placeholder="Cantidad"
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={commit}
          disabled={!qty || parseInt(qty, 10) <= 0}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 shrink-0"
        >
          + Pedido
        </button>
      </div>
      {currentQty > 0 && (
        <p className="text-xs text-blue-600 font-medium">✓ En pedido: {currentQty} unid.</p>
      )}
    </div>
  );
}

// ── Tab 1: Buscar producto ────────────────────────────────────────────────

interface SearchTabProps {
  rows: ComparatorRow[];
  unlinked: UnlinkedSupplierProduct[];
  isLoadingOwn: boolean;
  isLoadingUnlinked: boolean;
  onSelectOwn: (row: ComparatorRow) => void;
  onSelectUnlinked: (item: UnlinkedSupplierProduct) => void;
}

function SearchTab({ rows, unlinked, isLoadingOwn, isLoadingUnlinked, onSelectOwn, onSelectUnlinked }: SearchTabProps) {
  const [query, setQuery] = useState('');

  const lowStockRows = useMemo(
    () => rows.filter((r) => r.stockStatus === 'out' || r.stockStatus === 'low').slice(0, 10),
    [rows],
  );

  const { ownResults, unlinkedResults } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { ownResults: [], unlinkedResults: [] };

    const own = rows.filter(
      (r) =>
        r.product.name.toLowerCase().includes(q) ||
        r.product.sku.toLowerCase().includes(q),
    );
    const unl = unlinked.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.supplierCode ?? '').toLowerCase().includes(q),
    );
    return { ownResults: own, unlinkedResults: unl };
  }, [query, rows, unlinked]);

  const isLoading = isLoadingOwn || isLoadingUnlinked;
  const hasQuery = query.trim().length >= 2;
  const hasResults = ownResults.length > 0 || unlinkedResults.length > 0;

  return (
    <div className="space-y-4">
      {/* Input de búsqueda */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá un producto para comparar proveedores..."
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-white"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
          >×</button>
        )}
      </div>

      {/* Estado vacío: mostrar stock bajo */}
      {!hasQuery && (
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Cargando…</p>
          ) : lowStockRows.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-gray-400">Todo el stock está en buen nivel.</p>
              <p className="text-xs text-gray-400 mt-1">Buscá un producto arriba para comparar proveedores.</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-yellow-500">⚠</span> Stock bajo o agotado
              </p>
              <div className="space-y-1.5">
                {lowStockRows.map((row) => (
                  <LowStockCard key={row.product.id} row={row} onClick={() => onSelectOwn(row)} />
                ))}
              </div>
              {rows.filter((r) => r.stockStatus !== 'ok').length > 10 && (
                <p className="text-xs text-gray-400 text-center">
                  + {rows.filter((r) => r.stockStatus !== 'ok').length - 10} más. Buscá por nombre para ver todos.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Resultados de búsqueda */}
      {hasQuery && (
        <div className="space-y-4">
          {!hasResults && (
            <p className="text-sm text-gray-400 text-center py-6">
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          )}

          {ownResults.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mis productos</p>
              {ownResults.map((row) => (
                <SearchResultOwn key={row.product.id} row={row} onClick={() => onSelectOwn(row)} />
              ))}
            </div>
          )}

          {unlinkedResults.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                En catálogos de proveedores (sin producto propio)
              </p>
              {unlinkedResults.map((item) => (
                <SearchResultUnlinked key={item.supplierProductId} item={item} onClick={() => onSelectUnlinked(item)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LowStockCard({ row, onClick }: { row: ComparatorRow; onClick: () => void }) {
  const best = bestLinkForRow(row);
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-gray-200 rounded-lg px-3 py-2.5 hover:bg-gray-50 hover:border-blue-300 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">{row.product.name}</span>
          {row.product.category && (
            <span className="ml-2 text-xs text-gray-400">{row.product.category}</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <StockBadge status={row.stockStatus} qty={row.product.currentStock} />
          {best && <MarginBadge margin={calcMargin(row.product.basePrice, best.supplierProduct.unitCost)} />}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
        <span>{fmt(row.product.basePrice)} venta</span>
        {best && <span>{fmt(best.supplierProduct.unitCost)} costo · {best.supplier.name}</span>}
        {row.links.length === 0 && <span className="text-orange-400">Sin proveedores vinculados</span>}
        {row.links.length > 1 && <span>{row.links.length} proveedores</span>}
      </div>
    </button>
  );
}

function SearchResultOwn({ row, onClick }: { row: ComparatorRow; onClick: () => void }) {
  const best = bestLinkForRow(row);
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-gray-200 rounded-lg px-3 py-2.5 hover:bg-blue-50 hover:border-blue-300 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">{row.product.name}</span>
          {row.product.category && <span className="ml-2 text-xs text-gray-400">{row.product.category}</span>}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <StockBadge status={row.stockStatus} qty={row.product.currentStock} />
          {best && <MarginBadge margin={calcMargin(row.product.basePrice, best.supplierProduct.unitCost)} />}
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-0.5">
        {fmt(row.product.basePrice)} venta
        {row.links.length === 0 && <span className="ml-2 text-orange-400">· Sin proveedores vinculados</span>}
        {row.links.length === 1 && <span className="ml-2">· {row.links[0]?.supplier.name}</span>}
        {row.links.length > 1 && <span className="ml-2">· {row.links.length} proveedores</span>}
      </div>
    </button>
  );
}

function SearchResultUnlinked({ item, onClick }: { item: UnlinkedSupplierProduct; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-dashed border-gray-300 rounded-lg px-3 py-2.5 hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{item.name}</span>
        <span className="text-xs text-gray-400 shrink-0 ml-2">{fmt(item.unitCost)}</span>
      </div>
      <p className="text-xs text-gray-400 mt-0.5">
        {item.supplierName}
        {item.supplierCode && <span className="ml-2 font-mono">{item.supplierCode}</span>}
        <span className="ml-2 text-orange-400">· Sin producto propio</span>
      </p>
    </button>
  );
}

// ── Tab 2: Por proveedor ──────────────────────────────────────────────────

interface SupplierBrowseTabProps {
  suppliers: Supplier[];
  businessUnitId: number;
  quantityMap: Map<number, number>;
  onAddToOrder: (productId: number, supplierProductId: number, qty: number, productName: string) => void;
  onOpenLinkModal: (row: ComparatorRow) => void;
  allRows: ComparatorRow[];
}

function SupplierBrowseTab({
  suppliers,
  businessUnitId,
  quantityMap,
  onAddToOrder,
  allRows,
}: SupplierBrowseTabProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [addToCatalogSp, setAddToCatalogSp] = useState<SupplierProduct | null>(null);

  const { products: catalogProducts, isLoading, refetch: refetchCatalog } = useSupplierProducts(
    selectedSupplierId !== '' ? selectedSupplierId : 0,
    selectedSupplierId !== '' ? businessUnitId : undefined,
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return catalogProducts;
    const q = search.toLowerCase();
    return catalogProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.supplierCode ?? '').toLowerCase().includes(q),
    );
  }, [catalogProducts, search]);

  const stats = useMemo(() => ({
    total:     catalogProducts.length,
    linked:    catalogProducts.filter((p) => p.isLinked).length,
    unlinked:  catalogProducts.filter((p) => !p.isLinked).length,
  }), [catalogProducts]);

  // Lookup: supplierProductId → ComparatorRow (para calcular productId al pedir)
  const rowBySupplierProductId = useMemo(() => {
    const map = new Map<number, ComparatorRow>();
    for (const row of allRows) {
      for (const link of row.links) {
        map.set(link.supplierProduct.id, row);
      }
    }
    return map;
  }, [allRows]);

  return (
    <div className="space-y-4">
      {/* Selector de proveedor */}
      <select
        value={selectedSupplierId}
        onChange={(e) => {
          setSelectedSupplierId(parseInt(e.target.value, 10) || '');
          setSearch('');
        }}
        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400"
      >
        <option value="">— Elegir proveedor para ver su catálogo —</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {selectedSupplierId === '' && (
        <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">🏭</p>
          <p className="text-sm text-gray-400">Seleccioná un proveedor para ver su catálogo con márgenes.</p>
        </div>
      )}

      {selectedSupplierId !== '' && (
        <>
          {/* Buscador interno */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nombre o código…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Cargando catálogo…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {catalogProducts.length === 0 ? 'Este proveedor no tiene productos en su catálogo.' : `Sin resultados para "${search}"`}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Producto</th>
                      <th className="text-left px-2 py-2 font-medium text-gray-600">Código</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Costo</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">En mi catálogo</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Margen</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600 w-36">Pedir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((sp) => {
                      const linkedRow = rowBySupplierProductId.get(sp.id);
                      const margin =
                        sp.isLinked && sp.linkedProductBasePrice != null
                          ? calcMargin(sp.linkedProductBasePrice, sp.unitCost)
                          : null;
                      const currentQty = linkedRow ? (quantityMap.get(linkedRow.product.id) ?? 0) : 0;

                      return (
                        <SupplierCatalogRow
                          key={sp.id}
                          sp={sp}
                          linkedRow={linkedRow}
                          margin={margin}
                          currentQty={currentQty}
                          businessUnitId={businessUnitId}
                          onAddToOrder={onAddToOrder}
                          onAddToCatalog={() => setAddToCatalogSp(sp)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer de estadísticas */}
              <p className="text-xs text-gray-400 pt-1">
                {stats.total} producto{stats.total !== 1 ? 's' : ''}
                {' · '}
                <span className="text-green-600">{stats.linked} vinculado{stats.linked !== 1 ? 's' : ''}</span>
                {' · '}
                <span className="text-gray-400">{stats.unlinked} sin vincular</span>
              </p>
            </>
          )}
        </>
      )}

      {/* Modal para agregar producto no vinculado al catálogo */}
      {addToCatalogSp && (
        <AddToCatalogModal
          supplierProduct={addToCatalogSp}
          businessUnitId={businessUnitId}
          onClose={() => setAddToCatalogSp(null)}
          onSuccess={() => {
            setAddToCatalogSp(null);
            void refetchCatalog();
          }}
        />
      )}
    </div>
  );
}

interface SupplierCatalogRowProps {
  sp: SupplierProduct;
  linkedRow: ComparatorRow | undefined;
  margin: number | null;
  currentQty: number;
  businessUnitId: number;
  onAddToOrder: (productId: number, supplierProductId: number, qty: number, productName: string) => void;
  onAddToCatalog: () => void;
}

function SupplierCatalogRow({ sp, linkedRow, margin, currentQty, onAddToOrder, onAddToCatalog }: SupplierCatalogRowProps) {
  const [qty, setQty] = useState(currentQty > 0 ? String(currentQty) : '');

  // Sync when external quantityMap changes (cleared, etc.)
  useEffect(() => {
    if (currentQty === 0) setQty('');
  }, [currentQty]);

  function handleCommit() {
    const n = parseInt(qty, 10);
    if (!n || n <= 0) return;

    if (!sp.isLinked || !linkedRow) {
      // Producto no vinculado: no se puede simular el pedido sin productId propio.
      // Ofrecemos agregar al catálogo en su lugar.
      onAddToCatalog();
      setQty('');
      return;
    }
    onAddToOrder(linkedRow.product.id, sp.id, n, linkedRow.product.name);
    // Mantener el valor en el campo para que el usuario vea la cantidad pedida
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-3 py-2.5 font-medium text-gray-900">{sp.name}</td>
      <td className="px-2 py-2.5 font-mono text-xs text-gray-400">
        {sp.supplierCode ?? <span className="text-gray-200">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right font-medium text-gray-800">
        {fmt(sp.unitCost)}
      </td>

      {/* En mi catálogo */}
      <td className="px-3 py-2.5">
        {sp.isLinked ? (
          <div>
            <span className="inline-block px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 font-medium">
              Vinculado
            </span>
            {sp.linkedProductName && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">{sp.linkedProductName}</p>
            )}
          </div>
        ) : (
          <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200">
            Sin vincular
          </span>
        )}
      </td>

      {/* Margen */}
      <td className="px-3 py-2.5 text-center">
        {margin !== null ? (
          <MarginBadge margin={margin} />
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Pedir */}
      <td className="px-3 py-2.5">
        {sp.isLinked ? (
          <div className="space-y-0.5">
            <div className="flex gap-1">
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
                placeholder="0"
                className="w-14 px-1.5 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={handleCommit}
                disabled={!qty || parseInt(qty, 10) <= 0}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
              >
                +
              </button>
            </div>
            {currentQty > 0 && (
              <p className="text-[10px] text-blue-600 font-medium">En pedido: {currentQty}</p>
            )}
          </div>
        ) : (
          <button
            onClick={onAddToCatalog}
            className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50 whitespace-nowrap"
            title="Para pedir este producto primero tenés que agregarlo a tu catálogo"
          >
            + Al catálogo
          </button>
        )}
      </td>
    </tr>
  );
}

// ── ComparatorView (raíz) ─────────────────────────────────────────────────

export function ComparatorView() {
  const activeBU = useAppStore((s) => s.activeBU);

  const { rows, isLoading: loadingOwn, error, refetch }         = useComparatorData(activeBU?.id ?? null);
  const { suggestions, refetch: refetchSuggestions }            = useSuggestedMatches(activeBU?.id ?? null);
  const { items: unlinked, isLoading: loadingUnlinked, refetch: refetchUnlinked } = useUnlinkedProducts(activeBU?.id ?? null);
  const { suppliers }                                           = useSuppliers();
  const { buildOrder, clearOrder, isBuilding, order, error: orderError } = usePurchaseOrder();

  const [mainTab, setMainTab]             = useState<'search' | 'bySupplier'>('search');
  const [detailTarget, setDetailTarget]   = useState<DetailTarget | null>(null);
  const [linkModalRow, setLinkModalRow]   = useState<ComparatorRow | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);
  const [quantityMap, setQuantityMap]     = useState<Map<number, number>>(new Map());

  // Items para el simulador: productId → mejor proveedor vinculado
  const orderItems = useMemo(() => {
    const items: Array<{ productId: number; supplierProductId: number; quantity: number }> = [];
    for (const [productId, quantity] of quantityMap.entries()) {
      if (quantity <= 0) continue;
      const row = rows.find((r) => r.product.id === productId);
      if (!row) continue;
      const link = bestLinkForRow(row);
      if (!link) continue;
      items.push({ productId, supplierProductId: link.supplierProduct.id, quantity });
    }
    return items;
  }, [quantityMap, rows]);

  // Totales para el botón del pedido
  const orderTotals = useMemo(() => {
    let totalCost = 0;
    for (const item of orderItems) {
      const row = rows.find((r) => r.product.id === item.productId);
      const link = row?.links.find((l) => l.supplierProduct.id === item.supplierProductId);
      if (link) totalCost += link.supplierProduct.unitCost * item.quantity;
    }
    return { count: orderItems.length, totalCost };
  }, [orderItems, rows]);

  function handleAddToOrder(productId: number, supplierProductId: number, qty: number, productName: string) {
    setQuantityMap((prev) => {
      const next = new Map(prev);
      next.set(productId, qty);
      return next;
    });
    setToast(`${productName} ×${qty} agregado al pedido`);
  }

  const handleOpenOrderPanel = useCallback(async () => {
    if (!activeBU || orderItems.length === 0) return;
    setShowOrderPanel(true);
    await buildOrder(activeBU.id, orderItems);
  }, [activeBU, orderItems, buildOrder]);

  const handleRefreshOrder = useCallback(async () => {
    if (!activeBU || orderItems.length === 0) return;
    await buildOrder(activeBU.id, orderItems);
  }, [activeBU, orderItems, buildOrder]);

  function handleClearOrder() {
    clearOrder();
    setQuantityMap(new Map());
    setShowOrderPanel(false);
  }

  function handleLinkChanged() {
    void refetch();
    void refetchUnlinked();
    const row = linkModalRow;
    setLinkModalRow(null);
    setTimeout(() => setLinkModalRow(row), 50);
  }

  function handleOpenLinkModal(row: ComparatorRow) {
    setDetailTarget(null);
    setLinkModalRow(row);
  }

  if (!activeBU) return null;

  const panelOpen = detailTarget !== null;

  return (
    <div className="flex h-full">
      {/* Contenido principal */}
      <div className={`flex-1 min-w-0 space-y-4 ${showOrderPanel ? 'mr-96' : ''} ${panelOpen && !showOrderPanel ? 'mr-80' : ''}`}>

        {/* Header: tabs + botón pedido */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setMainTab('search')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'search'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🔍 Buscar producto
            </button>
            <button
              onClick={() => setMainTab('bySupplier')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'bySupplier'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏭 Por proveedor
            </button>
          </div>

          <div className="flex items-center gap-2">
            {suggestions.length > 0 && (
              <button
                onClick={() => setShowSuggestionsModal(true)}
                className="px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Sugerencias <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{suggestions.length}</span>
              </button>
            )}

            {/* Botón pedido — siempre visible */}
            <button
              onClick={() => void handleOpenOrderPanel()}
              disabled={orderTotals.count === 0}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                orderTotals.count > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-gray-400 border border-gray-200 cursor-default'
              }`}
            >
              {orderTotals.count > 0
                ? `🛒 Pedido: ${orderTotals.count} ítem${orderTotals.count !== 1 ? 's' : ''} · ${fmt(orderTotals.totalCost)} →`
                : '🛒 Pedido vacío'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {/* Contenido por tab */}
        {mainTab === 'search' && (
          <SearchTab
            rows={rows}
            unlinked={unlinked}
            isLoadingOwn={loadingOwn}
            isLoadingUnlinked={loadingUnlinked}
            onSelectOwn={(row) => setDetailTarget({ kind: 'own', row })}
            onSelectUnlinked={(item) => setDetailTarget({ kind: 'unlinked', item })}
          />
        )}

        {mainTab === 'bySupplier' && (
          <SupplierBrowseTab
            suppliers={suppliers}
            businessUnitId={activeBU.id}
            quantityMap={quantityMap}
            onAddToOrder={handleAddToOrder}
            onOpenLinkModal={handleOpenLinkModal}
            allRows={rows}
          />
        )}
      </div>

      {/* Panel de detalle (slide-in derecho, detrás del OrderPanel) */}
      {detailTarget && (
        <ProductDetailPanel
          target={detailTarget}
          businessUnitId={activeBU.id}
          suppliers={suppliers}
          quantityMap={quantityMap}
          onAddToOrder={handleAddToOrder}
          onOpenLinkModal={handleOpenLinkModal}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {/* Modal de vínculos */}
      {linkModalRow && (
        <LinkModal
          row={linkModalRow}
          businessUnitId={activeBU.id}
          suppliers={suppliers}
          onClose={() => setLinkModalRow(null)}
          onChanged={handleLinkChanged}
        />
      )}

      {/* Modal de sugerencias */}
      {showSuggestionsModal && (
        <SuggestionsModal
          suggestions={suggestions}
          businessUnitId={activeBU.id}
          onClose={() => setShowSuggestionsModal(false)}
          onLinked={() => { void refetch(); void refetchSuggestions(); }}
        />
      )}

      {/* Panel del simulador de pedido */}
      {showOrderPanel && (
        <OrderPanel
          order={order}
          isBuilding={isBuilding}
          error={orderError}
          onRefresh={() => void handleRefreshOrder()}
          onClear={handleClearOrder}
          onClose={() => setShowOrderPanel(false)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
