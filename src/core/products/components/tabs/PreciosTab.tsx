import { useEffect, useState } from 'react';
import type { ProductWithStock } from '@shared/types';
import { calcMargin, calcPriceGross, calcPriceNet, calcPriceNetFromGross } from '../../types';

interface PreciosTabProps {
  product?: ProductWithStock;
  formData: Partial<ProductWithStock>;
  onChange: (data: Partial<ProductWithStock>) => void;
}

const TAX_RATES = [
  { label: '21%', value: 21 },
  { label: '10.5%', value: 10.5 },
  { label: 'Exento', value: 0 },
];

const fi = 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700">
        {label}
        {hint && <span className="text-gray-400 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function PreciosTab({ formData, onChange }: PreciosTabProps) {
  const cost = formData.costPrice ?? 0;
  const taxRate = formData.taxRate ?? 21;
  const basePrice = formData.basePrice ?? 0;

  const margin = calcMargin(cost, basePrice);
  const priceGross = calcPriceGross(basePrice, taxRate);

  const [localCost, setLocalCost] = useState(String(cost));
  const [localCostGross, setLocalCostGross] = useState(
    String(calcPriceGross(cost, taxRate).toFixed(2)),
  );
  const [localMargin, setLocalMargin] = useState(String(margin.toFixed(2)));
  const [localPriceNet, setLocalPriceNet] = useState(String(basePrice.toFixed(2)));
  const [localPriceGross, setLocalPriceGross] = useState(String(priceGross.toFixed(2)));

  useEffect(() => {
    const cp = formData.costPrice ?? 0;
    const bp = formData.basePrice ?? 0;
    const tr = formData.taxRate ?? 21;
    setLocalCost(String(cp));
    setLocalCostGross(String(calcPriceGross(cp, tr).toFixed(2)));
    setLocalMargin(String(calcMargin(cp, bp).toFixed(2)));
    setLocalPriceNet(String(bp.toFixed(2)));
    setLocalPriceGross(String(calcPriceGross(bp, tr).toFixed(2)));
  }, [formData.costPrice, formData.basePrice, formData.taxRate]);

  const applyFromCost = (rawCost: string) => {
    const c = parseFloat(rawCost);
    if (isNaN(c) || c < 0) return;
    const m = parseFloat(localMargin);
    const newBase = isNaN(m) ? basePrice : calcPriceNet(c, m);
    const newGross = calcPriceGross(newBase, taxRate);
    setLocalCostGross(calcPriceGross(c, taxRate).toFixed(2));
    setLocalPriceNet(newBase.toFixed(2));
    setLocalPriceGross(newGross.toFixed(2));
    onChange({ ...formData, costPrice: c, basePrice: newBase });
  };

  // Ingresó el costo con IVA → calcula costo sin IVA y propaga
  const applyFromCostGross = (rawCostGross: string) => {
    const gross = parseFloat(rawCostGross);
    if (isNaN(gross) || gross < 0) return;
    const net = calcPriceNetFromGross(gross, taxRate);
    setLocalCost(net.toFixed(2));
    applyFromCost(net.toFixed(2));
  };

  const applyFromMargin = (rawMargin: string) => {
    const m = parseFloat(rawMargin);
    if (isNaN(m)) return;
    const c = parseFloat(localCost);
    const newBase = isNaN(c) ? basePrice : calcPriceNet(c, m);
    const newGross = calcPriceGross(newBase, taxRate);
    setLocalPriceNet(newBase.toFixed(2));
    setLocalPriceGross(newGross.toFixed(2));
    onChange({ ...formData, basePrice: newBase });
  };

  const applyFromPriceNet = (rawNet: string) => {
    const net = parseFloat(rawNet);
    if (isNaN(net) || net < 0) return;
    const c = parseFloat(localCost);
    const newMargin = isNaN(c) || c === 0 ? 0 : calcMargin(c, net);
    const newGross = calcPriceGross(net, taxRate);
    setLocalMargin(newMargin.toFixed(2));
    setLocalPriceGross(newGross.toFixed(2));
    onChange({ ...formData, basePrice: net });
  };

  const applyFromPriceGross = (rawGross: string) => {
    const gross = parseFloat(rawGross);
    if (isNaN(gross) || gross < 0) return;
    const net = calcPriceNetFromGross(gross, taxRate);
    const c = parseFloat(localCost);
    const newMargin = isNaN(c) || c === 0 ? 0 : calcMargin(c, net);
    setLocalMargin(newMargin.toFixed(2));
    setLocalPriceNet(net.toFixed(2));
    onChange({ ...formData, basePrice: net });
  };

  const handleTaxChange = (newRate: number) => {
    const net = parseFloat(localPriceNet);
    const newGross = isNaN(net) ? 0 : calcPriceGross(net, newRate);
    setLocalPriceGross(newGross.toFixed(2));
    onChange({ ...formData, taxRate: newRate });
  };

  const summaryMargin = calcMargin(parseFloat(localCost) || 0, parseFloat(localPriceNet) || 0);
  const summaryGross = calcPriceGross(parseFloat(localPriceNet) || 0, taxRate);
  const marginColor = summaryMargin >= 30 ? 'text-green-700' : summaryMargin >= 10 ? 'text-amber-600' : 'text-red-600';

  return (
    <div>
      {/* Summary box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4 flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Precio c/IVA</div>
          <div className="text-2xl font-bold text-blue-700">
            ${isNaN(summaryGross) ? '—' : summaryGross.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="w-px h-10 bg-blue-200" />
        <div className="text-center">
          <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Margen</div>
          <div className={`text-2xl font-bold ${marginColor}`}>
            {isNaN(summaryMargin) ? '—' : `${summaryMargin >= 0 ? '+' : ''}${summaryMargin.toFixed(1)}%`}
          </div>
        </div>
        <div className="w-px h-10 bg-blue-200" />
        <div className="text-center">
          <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">IVA</div>
          <div className="text-2xl font-bold text-blue-600">{taxRate === 0 ? 'Exento' : `${taxRate}%`}</div>
        </div>
        <div className="ml-auto text-xs text-blue-400 leading-relaxed">
          Editá cualquier campo<br />y los demás se recalculan
        </div>
      </div>

      {/* Calculator */}
      <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
        <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-700">💰 Calculadora de precios</span>
        </div>
        <div className="px-3.5 py-3">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Field label="Costo de compra" hint="(sin IVA)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${fi} pl-7`}
                  value={localCost}
                  onChange={(e) => setLocalCost(e.target.value)}
                  onBlur={(e) => applyFromCost(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Costo c/IVA" hint="(calculado)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${fi} pl-7 text-orange-700`}
                  value={localCostGross}
                  onChange={(e) => setLocalCostGross(e.target.value)}
                  onBlur={(e) => applyFromCostGross(e.target.value)}
                />
              </div>
              <span className="text-xs text-gray-400">Ingresá aquí si tenés el precio con IVA</span>
            </Field>
            <Field label="Alícuota IVA">
              <select
                className={fi}
                value={taxRate}
                onChange={(e) => handleTaxChange(Number(e.target.value))}
              >
                {TAX_RATES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Margen %" hint="(sobre costo)">
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  className={`${fi} pr-7`}
                  value={localMargin}
                  onChange={(e) => setLocalMargin(e.target.value)}
                  onBlur={(e) => applyFromMargin(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </Field>
            <Field label="Precio s/IVA">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${fi} pl-7`}
                  value={localPriceNet}
                  onChange={(e) => setLocalPriceNet(e.target.value)}
                  onBlur={(e) => applyFromPriceNet(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Precio c/IVA" hint="(Cons. Final)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${fi} pl-7 font-semibold text-blue-700`}
                  value={localPriceGross}
                  onChange={(e) => setLocalPriceGross(e.target.value)}
                  onBlur={(e) => applyFromPriceGross(e.target.value)}
                />
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Extra fields */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-700">🛡️ Límites y control</span>
        </div>
        <div className="px-3.5 py-3 grid grid-cols-2 gap-3">
          <Field label="Precio mínimo de venta" hint="(no permite vender por debajo)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={`${fi} pl-7`}
                value={formData.minimumSalePrice ?? ''}
                onChange={(e) =>
                  onChange({ ...formData, minimumSalePrice: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="Sin límite"
              />
            </div>
          </Field>
          <Field label="Stock mínimo" hint="(alerta de reposición)">
            <input
              type="number"
              min={0}
              className={fi}
              value={formData.minimumThreshold ?? ''}
              onChange={(e) =>
                onChange({ ...formData, minimumThreshold: e.target.value ? Number(e.target.value) : 0 })
              }
              placeholder="0"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
