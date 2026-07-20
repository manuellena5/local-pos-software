import { useEffect, useState } from 'react';
import type { ProductVariant } from '@shared/types';
import { variantsApi } from '@/lib/api/variants';
import { formatCurrency, parseLocaleNumber } from '@/lib/utils/pricing';
import { InlineEditCell } from './InlineEditCell';
import { marginClass, tdCls, tdTruncate } from './tableCellStyles';
import type { ColumnId } from '../types';
import { calcMargin, calcPriceNet } from '../types';

interface ProductVariantRowsProps {
  productId: number;
  businessUnitId: number;
  isVisible: (id: ColumnId) => boolean;
  onRefetch: () => void;
  onToast: (msg: string, type?: 'ok' | 'error') => void;
}

/**
 * Filas expandibles con el detalle de cada variante de un producto, con
 * precio, costo y stock editables inline. Reutiliza el mismo endpoint de
 * upsert que el modal de edición — mandar una sola variante en el array no
 * toca las demás. Respeta las mismas columnas (visibles/ocultas) que la fila
 * del producto para que quede todo alineado.
 */
export function ProductVariantRows({
  productId,
  businessUnitId,
  isVisible,
  onRefetch,
  onToast,
}: ProductVariantRowsProps) {
  const [variants, setVariants] = useState<ProductVariant[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    variantsApi
      .getByProduct(productId)
      .then((data) => { if (!cancelled) setVariants(data); })
      .catch(() => { if (!cancelled) onToast('No se pudieron cargar las variantes', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const updateVariant = async (
    variant: ProductVariant,
    patch: { price?: number; costPrice?: number; stock?: number },
  ) => {
    try {
      // upsertVariants devuelve TODAS las variantes del producto, no solo la
      // editada — se usa tal cual como nuevo estado en vez de mezclar por índice.
      const updated = await variantsApi.upsert(productId, businessUnitId, {
        attributeType: variant.attributeType,
        variants: [{
          id: variant.id,
          attributeValue: variant.attributeValue,
          price: patch.price ?? variant.price,
          costPrice: patch.costPrice ?? variant.costPrice,
          barcode: variant.barcode,
          ...(patch.stock !== undefined ? { stock: patch.stock } : {}),
        }],
      });
      setVariants(updated);
      onToast(`✅ ${variant.attributeValue} actualizado`);
      onRefetch();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    }
  };

  if (loading) {
    return (
      <tr className="bg-gray-50/60 border-b border-gray-100">
        <td />
        <td className={tdCls} colSpan={99}>
          <span className="text-gray-400">Cargando variantes...</span>
        </td>
      </tr>
    );
  }

  if (!variants || variants.length === 0) {
    return (
      <tr className="bg-gray-50/60 border-b border-gray-100">
        <td />
        <td className={tdCls} colSpan={99}>
          <span className="text-gray-400">Sin variantes activas</span>
        </td>
      </tr>
    );
  }

  return (
    <>
      {variants.map((v) => {
        const margin = calcMargin(v.costPrice, v.price);
        return (
          <tr key={v.id} className="bg-gray-50/60 border-b border-gray-100">
            {/* Thumbnail placeholder */}
            <td className="px-1 py-1" style={{ width: 44 }} />

            {/* Nombre → atributo de la variante */}
            <td className={tdCls} style={{ maxWidth: 0 }}>
              <div className="text-gray-600 truncate leading-tight pl-3" title={`${v.attributeType}: ${v.attributeValue}`}>
                ↳ {v.attributeType}: <span className="font-medium text-gray-800">{v.attributeValue}</span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono truncate pl-3">{v.sku}</div>
            </td>

            {isVisible('category') && <td className={tdCls}><span className="text-gray-300">—</span></td>}

            {isVisible('cost') && (
              <td className={tdCls}>
                <InlineEditCell
                  value={String(v.costPrice)}
                  displayValue={<span className="text-gray-700">{formatCurrency(v.costPrice)}</span>}
                  onConfirm={async (raw) => {
                    const costPrice = parseLocaleNumber(raw);
                    if (isNaN(costPrice) || costPrice < 0) {
                      onToast('El costo no puede ser negativo', 'error');
                      return;
                    }
                    await updateVariant(v, { costPrice });
                  }}
                />
              </td>
            )}

            {isVisible('price') && (
              <td className={tdCls}>
                <InlineEditCell
                  value={String(v.price)}
                  displayValue={<span className="font-semibold text-gray-900">{formatCurrency(v.price)}</span>}
                  onConfirm={async (raw) => {
                    const price = parseLocaleNumber(raw);
                    if (isNaN(price) || price <= 0) {
                      onToast('El precio debe ser mayor a 0', 'error');
                      return;
                    }
                    await updateVariant(v, { price });
                  }}
                />
              </td>
            )}

            {isVisible('margin') && (
              <td className={tdCls}>
                <InlineEditCell
                  value={String(margin.toFixed(1))}
                  displayValue={
                    <span className={marginClass(margin)}>{margin >= 0 ? '+' : ''}{margin.toFixed(0)}%</span>
                  }
                  onConfirm={async (raw) => {
                    const marginVal = parseLocaleNumber(raw);
                    if (isNaN(marginVal)) {
                      onToast('Margen inválido', 'error');
                      return;
                    }
                    const price = calcPriceNet(v.costPrice, marginVal);
                    if (price <= 0) {
                      onToast('El precio resultante debe ser mayor a 0', 'error');
                      return;
                    }
                    await updateVariant(v, { price });
                  }}
                />
              </td>
            )}

            {isVisible('stock') && (
              <td className={tdCls}>
                <InlineEditCell
                  value={String(v.stock)}
                  displayValue={
                    <span className={v.stock === 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {v.stock}
                    </span>
                  }
                  onConfirm={async (raw) => {
                    const stock = parseInt(raw, 10);
                    if (isNaN(stock) || stock < 0) {
                      onToast('El stock no puede ser negativo', 'error');
                      return;
                    }
                    await updateVariant(v, { stock });
                  }}
                />
              </td>
            )}

            {isVisible('lastSupplier') && <td className={tdCls}><span className="text-gray-300">—</span></td>}

            {isVisible('barcode') && (
              <td className={`${tdTruncate} font-mono text-gray-500`} style={{ maxWidth: 0 }}>
                {v.barcode ?? <span className="text-gray-300">—</span>}
              </td>
            )}

            {isVisible('supplierCode') && (
              <td className={`${tdTruncate}`} style={{ maxWidth: 0 }}>
                <span className="text-gray-300">—</span>
              </td>
            )}

            {isVisible('priceNet') && (
              <td className={`${tdCls} text-gray-600`}>{formatCurrency(v.price)}</td>
            )}

            {isVisible('ivaRate') && <td className={`${tdCls} text-gray-300`}>—</td>}

            {isVisible('lastPurchaseDate') && <td className={`${tdCls} text-gray-300`}>—</td>}

            {/* Acciones */}
            <td className={tdCls} />
          </tr>
        );
      })}
    </>
  );
}
