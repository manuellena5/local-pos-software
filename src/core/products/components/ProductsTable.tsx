import { useState } from 'react';
import type { ProductWithStock } from '@shared/types';
import { formatCurrency } from '@/lib/utils/pricing';
import { productImageUrl } from '@/lib/utils/imageUrl';
import { useProductColumns } from '../hooks/useProductColumns';
import { useColumnResize } from '../hooks/useColumnResize';
import { useProductsStore } from '../store/productsStore';
import { InlineEditCell } from './InlineEditCell';
import { StockBadge } from './StockBadge';
import { productsApi } from '@/lib/api/products';
import type { ColumnId } from '../types';
import {
  calcMargin,
  calcPriceNet,
} from '../types';

interface ProductsTableProps {
  products: ProductWithStock[];
  businessUnitId: number;
  onRefetch: () => void;
  onToast: (msg: string, type?: 'ok' | 'error') => void;
}

function marginClass(margin: number): string {
  if (margin >= 80) return 'text-green-700 font-bold';
  if (margin >= 30) return 'text-amber-600 font-bold';
  return 'text-red-600 font-bold';
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function ProductThumbnail({ product }: { product: ProductWithStock }) {
  const [imgError, setImgError] = useState(false);
  if (product.primaryImage && !imgError) {
    return (
      <img
        src={productImageUrl(product.primaryImage)}
        alt={product.name}
        onError={() => setImgError(true)}
        style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{ width: 36, height: 36, borderRadius: 4, flexShrink: 0 }}
      className="bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 select-none"
      title={product.name}
    >
      {getInitials(product.name)}
    </div>
  );
}

function VariantStockBreakdown({ breakdown }: { breakdown: string }) {
  const lines = breakdown.split(' · ').map((part) => {
    const sep = part.lastIndexOf(':');
    return { label: part.slice(0, sep), stock: part.slice(sep + 1).trim() };
  });
  return (
    <span className="block text-[10px] text-gray-400 leading-tight mt-0.5">
      {lines.map((l, i) => (
        <span key={i} className="mr-1.5 whitespace-nowrap">
          {l.label}: <span className="text-gray-600 font-medium">{l.stock}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Resize handle at the right edge of a <th>.
 * Uses setPointerCapture so pointermove/pointerup fire on the element itself
 * even when the pointer leaves it — no window listeners needed.
 */
function ResizeHandle({
  col,
  getWidth,
  setWidth,
  commit,
}: {
  col: ColumnId;
  getWidth: (col: ColumnId) => number;
  setWidth: (col: ColumnId, w: number) => void;
  commit: () => void;
}) {
  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startW = getWidth(col);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      setWidth(col, Math.max(50, startW + ev.clientX - startX));
    };
    const onUp = () => {
      commit();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  return (
    <span
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute', right: 0, top: 0,
        height: '100%', width: 8,
        cursor: 'col-resize', zIndex: 20,
        touchAction: 'none',
      }}
      className="flex items-center justify-center select-none group"
      title="Arrastrar para redimensionar"
    >
      <span
        style={{ width: 2, height: 16, borderRadius: 2 }}
        className="bg-gray-300 group-hover:bg-blue-500 transition-colors"
      />
    </span>
  );
}

export function ProductsTable({ products, businessUnitId, onRefetch, onToast }: ProductsTableProps) {
  const { isVisible } = useProductColumns();
  const { getWidth, setWidth, commit } = useColumnResize();
  const openEditModal  = useProductsStore((s) => s.openEditModal);
  const openStockModal = useProductsStore((s) => s.openStockModal);
  const openDrawer     = useProductsStore((s) => s.openDrawer);

  const handleInlineConfirm = async (
    product: ProductWithStock,
    field: 'cost' | 'price' | 'margin',
    raw: string,
  ) => {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;

    let costPrice = product.costPrice;
    let basePrice = product.basePrice;

    if (field === 'cost') {
      costPrice = val;
      const currentMargin = product.costPrice > 0
        ? (product.basePrice - product.costPrice) / product.costPrice
        : 0;
      basePrice = Math.round(costPrice * (1 + currentMargin) * 100) / 100;
    } else if (field === 'price') {
      basePrice = val; // usuario ingresa precio base directamente
    } else {
      basePrice = calcPriceNet(costPrice, val);
    }

    try {
      await productsApi.inlineUpdate(product.id, businessUnitId, { costPrice, basePrice });
      onToast(`✅ ${product.name} actualizado`);
      onRefetch();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No hay productos que coincidan con el filtro
      </div>
    );
  }

  const resizeProps = { getWidth, setWidth, commit };

  // overflow-hidden removed from th — would block pointer-events on the absolute ResizeHandle
  const thCls = 'relative text-left px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide select-none';
  // max-w-0 on td makes overflow:hidden + text-ellipsis work in table-layout:fixed
  const tdCls = 'px-2 py-1 text-xs overflow-hidden';
  const tdTruncate = `${tdCls} truncate`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* hint bar */}
      <div className="px-2 py-1 text-[10px] text-gray-400 bg-gray-50 border-b border-gray-100">
        ✏️ <strong>Doble click</strong> en Costo / Precio / Margen para editar ·{' '}
        <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> confirma ·{' '}
        <kbd className="bg-gray-100 px-1 rounded">Esc</kbd> cancela ·{' '}
        arrastrá el borde de cada columna para redimensionar
      </div>

      {/* horizontal scroll wrapper */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ tableLayout: 'fixed', minWidth: 400 }}>
          <colgroup>
            <col style={{ width: 44 }} />
            <col style={{ width: getWidth('name') }} />
            {isVisible('category')         && <col style={{ width: getWidth('category') }} />}
            {isVisible('cost')             && <col style={{ width: getWidth('cost') }} />}
            {isVisible('price')            && <col style={{ width: getWidth('price') }} />}
            {isVisible('margin')           && <col style={{ width: getWidth('margin') }} />}
            {isVisible('stock')            && <col style={{ width: getWidth('stock') }} />}
            {isVisible('lastSupplier')     && <col style={{ width: getWidth('lastSupplier') }} />}
            {isVisible('barcode')          && <col style={{ width: getWidth('barcode') }} />}
            {isVisible('supplierCode')     && <col style={{ width: getWidth('supplierCode') }} />}
            {isVisible('priceNet')         && <col style={{ width: getWidth('priceNet') }} />}
            {isVisible('ivaRate')          && <col style={{ width: getWidth('ivaRate') }} />}
            {isVisible('lastPurchaseDate') && <col style={{ width: getWidth('lastPurchaseDate') }} />}
            <col style={{ width: getWidth('actions') }} />
          </colgroup>

          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th style={{ width: 44 }} />
              <th className={thCls} style={{ width: getWidth('name') }}>
                <span className="block truncate pr-2">Producto</span>
                <ResizeHandle col="name" {...resizeProps} />
              </th>
              {isVisible('category') && (
                <th className={thCls} style={{ width: getWidth('category') }}>
                  <span className="block truncate pr-2">Categoría</span>
                  <ResizeHandle col="category" {...resizeProps} />
                </th>
              )}
              {isVisible('cost') && (
                <th className={thCls} style={{ width: getWidth('cost') }}>
                  <span className="block truncate pr-2" title="Doble click para editar">Costo</span>
                  <ResizeHandle col="cost" {...resizeProps} />
                </th>
              )}
              {isVisible('price') && (
                <th className={thCls} style={{ width: getWidth('price') }}>
                  <span className="block truncate pr-2" title="Doble click para editar">Precio</span>
                  <ResizeHandle col="price" {...resizeProps} />
                </th>
              )}
              {isVisible('margin') && (
                <th className={thCls} style={{ width: getWidth('margin') }}>
                  <span className="block truncate pr-2" title="Doble click para editar">Margen %</span>
                  <ResizeHandle col="margin" {...resizeProps} />
                </th>
              )}
              {isVisible('stock') && (
                <th className={thCls} style={{ width: getWidth('stock') }}>
                  <span className="block truncate pr-2">Stock</span>
                  <ResizeHandle col="stock" {...resizeProps} />
                </th>
              )}
              {isVisible('lastSupplier') && (
                <th className={thCls} style={{ width: getWidth('lastSupplier') }}>
                  <span className="block truncate pr-2">Proveedor</span>
                  <ResizeHandle col="lastSupplier" {...resizeProps} />
                </th>
              )}
              {isVisible('barcode') && (
                <th className={thCls} style={{ width: getWidth('barcode') }}>
                  <span className="block truncate pr-2">Cód. barras</span>
                  <ResizeHandle col="barcode" {...resizeProps} />
                </th>
              )}
              {isVisible('supplierCode') && (
                <th className={thCls} style={{ width: getWidth('supplierCode') }}>
                  <span className="block truncate pr-2">Cód. prov.</span>
                  <ResizeHandle col="supplierCode" {...resizeProps} />
                </th>
              )}
              {isVisible('priceNet') && (
                <th className={thCls} style={{ width: getWidth('priceNet') }}>
                  <span className="block truncate pr-2">Precio s/IVA</span>
                  <ResizeHandle col="priceNet" {...resizeProps} />
                </th>
              )}
              {isVisible('ivaRate') && (
                <th className={thCls} style={{ width: getWidth('ivaRate') }}>
                  <span className="block truncate pr-2">IVA %</span>
                  <ResizeHandle col="ivaRate" {...resizeProps} />
                </th>
              )}
              {isVisible('lastPurchaseDate') && (
                <th className={thCls} style={{ width: getWidth('lastPurchaseDate') }}>
                  <span className="block truncate pr-2">Últ. compra</span>
                  <ResizeHandle col="lastPurchaseDate" {...resizeProps} />
                </th>
              )}
              <th className={`${thCls} text-center`} style={{ width: getWidth('actions') }}>
                <span className="block truncate">Acc.</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const margin = calcMargin(p.costPrice, p.basePrice);

              return (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                  {/* Thumbnail */}
                  <td className="px-1 py-1" style={{ width: 44 }}>
                    <ProductThumbnail product={p} />
                  </td>

                  {/* Nombre + SKU — max-w-0 fuerza que overflow:hidden funcione en table-layout:fixed */}
                  <td className={tdCls} style={{ maxWidth: 0 }}>
                    <div className="font-semibold text-gray-900 truncate leading-tight" title={p.name}>{p.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono truncate" title={p.sku}>{p.sku}</div>
                  </td>

                  {isVisible('category') && (
                    <td className={tdCls} style={{ maxWidth: 0 }}>
                      {p.category ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 truncate max-w-full">
                          {p.category}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}

                  {isVisible('cost') && (
                    <td className={tdCls}>
                      <InlineEditCell
                        value={String(p.costPrice)}
                        displayValue={
                          <span className="text-gray-700">
                            {formatCurrency(p.costPrice)}
                          </span>
                        }
                        onConfirm={(raw) => handleInlineConfirm(p, 'cost', raw)}
                      />
                    </td>
                  )}

                  {isVisible('price') && (
                    <td className={tdCls}>
                      <InlineEditCell
                        value={String(p.basePrice)}
                        displayValue={<span className="font-semibold text-gray-900">{formatCurrency(p.basePrice)}</span>}
                        onConfirm={(raw) => handleInlineConfirm(p, 'price', raw)}
                      />
                    </td>
                  )}

                  {isVisible('margin') && (
                    <td className={tdCls}>
                      <InlineEditCell
                        value={String(margin.toFixed(1))}
                        displayValue={<span className={marginClass(margin)}>{margin >= 0 ? '+' : ''}{margin.toFixed(0)}%</span>}
                        step="0.5"
                        onConfirm={(raw) => handleInlineConfirm(p, 'margin', raw)}
                      />
                    </td>
                  )}

                  {isVisible('stock') && (
                    <td className={tdCls}>
                      <StockBadge quantity={p.currentStock} minimumThreshold={p.minimumThreshold} />
                      {p.hasVariants && p.variantBreakdown && (
                        <VariantStockBreakdown breakdown={p.variantBreakdown} />
                      )}
                    </td>
                  )}

                  {isVisible('lastSupplier') && (
                    <td className={tdCls} style={{ maxWidth: 0 }}>
                      {p.supplierName ? (
                        <button
                          onClick={() => openDrawer(p.id)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] hover:bg-gray-200 transition-colors max-w-full truncate"
                          title={p.supplierName}
                        >
                          <span className="truncate">{p.supplierName}</span>
                          <span className="text-gray-400 shrink-0">›</span>
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}

                  {isVisible('barcode') && (
                    <td className={`${tdTruncate} font-mono text-gray-500`} style={{ maxWidth: 0 }}>
                      {p.barcode ?? <span className="text-gray-300">—</span>}
                    </td>
                  )}

                  {isVisible('supplierCode') && (
                    <td className={`${tdTruncate} font-mono text-gray-500`} style={{ maxWidth: 0 }}>
                      {p.supplierCode ?? <span className="text-gray-300">—</span>}
                    </td>
                  )}

                  {isVisible('priceNet') && (
                    <td className={`${tdCls} text-gray-600`}>
                      {formatCurrency(p.basePrice)}
                    </td>
                  )}

                  {isVisible('ivaRate') && (
                    <td className={`${tdCls} text-gray-600`}>
                      {p.taxRate === 0 ? 'Exento' : `${p.taxRate}%`}
                    </td>
                  )}

                  {isVisible('lastPurchaseDate') && (
                    <td className={`${tdCls} text-gray-400`}>—</td>
                  )}

                  {/* Acciones — solo íconos con tooltip */}
                  <td className={tdCls}>
                    <div className="flex items-center gap-px justify-center">
                      <button
                        onClick={() => openEditModal(p)}
                        title="Editar producto"
                        className="w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-blue-50 text-blue-600 border border-transparent hover:border-blue-200 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => openStockModal(p.id)}
                        title="Ajustar stock"
                        className="w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-cyan-50 text-cyan-600 border border-transparent hover:border-cyan-200 transition-colors"
                      >
                        📦
                      </button>
                      <button
                        onClick={() => openDrawer(p.id)}
                        title="Ver historial"
                        className="w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-violet-50 text-violet-600 border border-transparent hover:border-violet-200 transition-colors"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
