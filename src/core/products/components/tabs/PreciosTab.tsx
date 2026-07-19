import { useEffect, useState } from 'react';
import type { ProductWithStock } from '@shared/types';
import { calcMargin, calcPriceNet } from '../../types';

interface PreciosTabProps {
  product?: ProductWithStock;
  formData: Partial<ProductWithStock>;
  onChange: (data: Partial<ProductWithStock>) => void;
}

const fi =
  'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full';

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <label className="text-xs font-semibold text-gray-600">
      {text}
      {hint && <span className="text-gray-400 font-normal ml-1">{hint}</span>}
    </label>
  );
}

export function PreciosTab({ formData, onChange }: PreciosTabProps) {
  const cost = formData.costPrice ?? 0;
  const price = formData.basePrice ?? 0;

  const [localCost, setLocalCost] = useState(String(cost || ''));
  const [localMargin, setLocalMargin] = useState(String(calcMargin(cost, price).toFixed(1)));
  const [localPrice, setLocalPrice] = useState(String(price || ''));

  useEffect(() => {
    const c = formData.costPrice ?? 0;
    const p = formData.basePrice ?? 0;
    setLocalCost(c ? String(c) : '');
    setLocalMargin(calcMargin(c, p).toFixed(1));
    setLocalPrice(p ? String(p) : '');
  }, [formData.costPrice, formData.basePrice]);

  function applyFromCost(raw: string) {
    const c = parseFloat(raw);
    if (isNaN(c) || c < 0) return;
    const m = parseFloat(localMargin);
    const newPrice = isNaN(m) ? price : calcPriceNet(c, m);
    setLocalPrice(newPrice ? newPrice.toFixed(2) : '');
    onChange({ ...formData, costPrice: c, basePrice: newPrice });
  }

  function applyFromMargin(raw: string) {
    const m = parseFloat(raw);
    if (isNaN(m)) return;
    const c = parseFloat(localCost) || 0;
    const newPrice = calcPriceNet(c, m);
    setLocalPrice(newPrice ? newPrice.toFixed(2) : '');
    onChange({ ...formData, basePrice: newPrice });
  }

  function applyFromPrice(raw: string) {
    const p = parseFloat(raw);
    if (isNaN(p) || p < 0) return;
    const c = parseFloat(localCost) || 0;
    const newMargin = c > 0 ? calcMargin(c, p) : 0;
    setLocalMargin(newMargin.toFixed(1));
    onChange({ ...formData, basePrice: p });
  }

  const summaryPrice = parseFloat(localPrice) || 0;
  const summaryCost = parseFloat(localCost) || 0;
  const summaryMargin = calcMargin(summaryCost, summaryPrice);
  const marginColor =
    summaryMargin >= 30
      ? 'text-green-700'
      : summaryMargin >= 10
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="space-y-3">
      {/* Banner resumen */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-5">
        <div className="text-center">
          <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">
            Precio de venta
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {summaryPrice > 0 ? (
              `$${summaryPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            ) : (
              <span className="text-blue-300">—</span>
            )}
          </div>
        </div>
        <div className="w-px h-10 bg-blue-200" />
        <div className="text-center">
          <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">
            Margen
          </div>
          <div className={`text-2xl font-bold ${marginColor}`}>
            {summaryCost > 0 && summaryPrice > 0 ? (
              `${summaryMargin >= 0 ? '+' : ''}${summaryMargin.toFixed(1)}%`
            ) : (
              <span className="text-blue-300">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Calculadora */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label text="Costo de compra" />
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={`${fi} pl-7`}
              value={localCost}
              onChange={(e) => setLocalCost(e.target.value)}
              onBlur={(e) => applyFromCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label text="Margen" hint="(% sobre costo)" />
          <div className="relative">
            <input
              type="number"
              step="0.5"
              className={`${fi} pr-7`}
              value={localMargin}
              onChange={(e) => setLocalMargin(e.target.value)}
              onBlur={(e) => applyFromMargin(e.target.value)}
              placeholder="0"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              %
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label text="Precio de venta" hint="(editable — recalcula margen)" />
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            className={`${fi} pl-7 font-semibold text-blue-700`}
            value={localPrice}
            onChange={(e) => setLocalPrice(e.target.value)}
            onBlur={(e) => applyFromPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Límites */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
        <div className="flex flex-col gap-1">
          <Label text="Precio mínimo" hint="(no permite vender por debajo)" />
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={`${fi} pl-7`}
              value={formData.minimumSalePrice ?? ''}
              onChange={(e) =>
                onChange({
                  ...formData,
                  minimumSalePrice: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="Sin límite"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label text="Stock mínimo" hint="(alerta de reposición)" />
          <input
            type="number"
            min={0}
            className={fi}
            value={formData.minimumThreshold ?? ''}
            onChange={(e) =>
              onChange({
                ...formData,
                minimumThreshold: e.target.value ? Number(e.target.value) : 0,
              })
            }
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}
