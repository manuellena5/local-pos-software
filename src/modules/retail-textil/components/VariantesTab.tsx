import { useRef, useState, useCallback, KeyboardEvent } from 'react';
import type { ProductTabComponentProps } from '@/core/api/extensions';
import { useVariantsFormStore } from '../store/variantsFormStore';
import { useProductVariants } from '../hooks/useProductVariants';

const ATTRIBUTE_TYPES = ['Fragancia', 'Color', 'Talle', 'Volumen', 'Material', 'Otro'];

const fi =
  'px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 w-full';
const fiNum = `${fi} text-right`;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

function parsePasteText(
  raw: string
): Array<{ attributeValue: string; price: number; stock: number }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split('\t').map((c) => c.trim());
      const attributeValue = cols[0] ?? '';
      const price = parseFloat((cols[1] ?? '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      const stock = parseInt(cols[2] ?? '0', 10) || 0;
      return { attributeValue, price, stock };
    })
    .filter((r) => r.attributeValue.length > 0);
}

export function VariantesTab({
  product,
  formData,
  businessUnitId: _businessUnitId,
  isCreating,
}: ProductTabComponentProps) {
  const {
    hasVariants,
    attributeType,
    variants,
    setHasVariants,
    setAttributeType,
    addVariant,
    updateVariant,
    removeVariant,
  } = useVariantsFormStore();

  useProductVariants(
    product?.id,
    formData.basePrice ?? product?.basePrice ?? 0,
    formData.costPrice ?? product?.costPrice ?? 0
  );

  const [newValue, setNewValue] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pastePreview, setPastePreview] = useState<ReturnType<typeof parsePasteText>>([]);
  // "Otro" selection: local flag + store holds the custom string
  const [isCustomType, setIsCustomType] = useState(!ATTRIBUTE_TYPES.includes(attributeType));
  const newValueRef = useRef<HTMLInputElement>(null);

  const basePrice = formData.basePrice ?? product?.basePrice ?? 0;
  const baseCost = formData.costPrice ?? product?.costPrice ?? 0;

  // attributeType en el store ya es el valor efectivo (puede ser un tipo custom)
  const effectiveAttributeType = attributeType;

  function handleAddVariant() {
    const val = newValue.trim();
    if (!val) return;
    if (variants.some((v) => v.attributeValue.toLowerCase() === val.toLowerCase())) return;
    addVariant({
      attributeValue: val,
      price: basePrice,
      costPrice: baseCost,
      stock: 0,
      barcode: '',
    });
    setNewValue('');
    setTimeout(() => newValueRef.current?.focus(), 50);
  }

  function handleNewValueKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddVariant();
    }
  }

  function handlePastePreview() {
    const rows = parsePasteText(pasteText);
    setPastePreview(rows);
  }

  function handlePasteConfirm() {
    const existing = new Set(variants.map((v) => v.attributeValue.toLowerCase()));
    for (const row of pastePreview) {
      if (existing.has(row.attributeValue.toLowerCase())) continue;
      addVariant({
        attributeValue: row.attributeValue,
        price: row.price || basePrice,
        costPrice: baseCost,
        stock: row.stock,
        barcode: '',
      });
    }
    setPasteOpen(false);
    setPasteText('');
    setPastePreview([]);
  }

  const handleCellTab = useCallback(
    (
      e: KeyboardEvent<HTMLInputElement>,
      rowIdx: number,
      col: 'price' | 'cost' | 'stock' | 'barcode'
    ) => {
      if (e.key !== 'Tab') return;
      const order: Array<typeof col> = ['price', 'cost', 'stock', 'barcode'];
      const colIdx = order.indexOf(col);
      if (!e.shiftKey && colIdx === order.length - 1 && rowIdx === variants.length - 1) {
        e.preventDefault();
        newValueRef.current?.focus();
      }
    },
    [variants.length]
  );

  const isBasePrice = (price: number) => Math.abs(price - basePrice) < 0.01;

  if (!hasVariants) {
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <Toggle checked={false} onChange={setHasVariants} />
          <div>
            <div className="text-sm font-semibold text-gray-700">Este producto tiene variantes</div>
            <div className="text-xs text-gray-400 mt-0.5">Colores, fragancias, talles, etc.</div>
          </div>
        </label>
        <p className="text-xs text-gray-400 px-1">
          Sin variantes activas. El stock y precio se gestionan directamente en la tab Precio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toggle ON */}
      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
        <Toggle checked={true} onChange={setHasVariants} />
        <div>
          <div className="text-sm font-semibold text-blue-700">Este producto tiene variantes</div>
          <div className="text-xs text-blue-500 mt-0.5">
            Editá las variantes en la tabla de abajo
          </div>
        </div>
      </label>

      {/* Selector de tipo */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Varían por:</span>
        <select
          className="px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
          value={isCustomType ? 'Otro' : attributeType}
          onChange={(e) => {
            if (e.target.value === 'Otro') {
              setIsCustomType(true);
              setAttributeType('');
            } else {
              setIsCustomType(false);
              setAttributeType(e.target.value);
            }
          }}
        >
          {ATTRIBUTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {isCustomType && (
          <input
            className="px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white outline-none focus:border-blue-500 w-36"
            placeholder="Ej: Aroma"
            value={attributeType}
            onChange={(e) => setAttributeType(e.target.value)}
          />
        )}
      </div>

      {/* Tabla de variantes */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-2 text-left font-semibold text-gray-600">
                {effectiveAttributeType || 'Atributo'}
              </th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">Precio</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">Costo</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-16">Stock</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">Barcode</th>
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {variants.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}
              >
                <td className="px-2 py-1">
                  <input
                    className={fi}
                    value={row.attributeValue}
                    onChange={(e) => updateVariant(i, { attributeValue: e.target.value })}
                    placeholder={effectiveAttributeType || 'Valor'}
                  />
                </td>
                <td className="px-1 py-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={`${fiNum} pl-5 ${row.price <= 0 ? 'text-red-600 font-semibold' : !isBasePrice(row.price) ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
                      value={row.price}
                      onChange={(e) => updateVariant(i, { price: parseFloat(e.target.value) || 0 })}
                      onKeyDown={(e) => handleCellTab(e, i, 'price')}
                    />
                  </div>
                </td>
                <td className="px-1 py-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={`${fiNum} pl-5`}
                      value={row.costPrice}
                      onChange={(e) =>
                        updateVariant(i, { costPrice: parseFloat(e.target.value) || 0 })
                      }
                      onKeyDown={(e) => handleCellTab(e, i, 'cost')}
                    />
                  </div>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={0}
                    className={fiNum}
                    value={row.stock}
                    onChange={(e) => updateVariant(i, { stock: parseInt(e.target.value) || 0 })}
                    onKeyDown={(e) => handleCellTab(e, i, 'stock')}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={fi}
                    value={row.barcode}
                    onChange={(e) => updateVariant(i, { barcode: e.target.value })}
                    placeholder="Opcional"
                    onKeyDown={(e) => handleCellTab(e, i, 'barcode')}
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  {row.hasSales ? (
                    <span
                      title="Esta variante tiene ventas registradas. Podés archivarla en lugar de eliminarla."
                      className="text-gray-300 cursor-default"
                    >
                      ×
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="text-gray-400 hover:text-red-500 font-bold leading-none"
                      title="Eliminar variante"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Fila de agregar */}
            <tr className="bg-gray-50/50">
              <td className="px-2 py-1.5" colSpan={5}>
                <input
                  ref={newValueRef}
                  className={fi}
                  placeholder={`+ Agregar ${effectiveAttributeType || 'variante'}…`}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={handleNewValueKeyDown}
                />
              </td>
              <td className="px-1 py-1.5">
                <button
                  type="button"
                  onClick={handleAddVariant}
                  disabled={!newValue.trim()}
                  className="px-2 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-40"
                >
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {variants.some((v) => v.price <= 0) && (
        <p className="text-xs text-red-500 px-1">
          Todas las variantes necesitan un precio mayor a $0 — si no, no se van a poder guardar.
        </p>
      )}

      {/* Nota de stock en edición */}
      {!isCreating && (
        <p className="text-xs text-gray-400 px-1">
          Los cambios de stock generan un movimiento de ajuste con trazabilidad al guardar.
        </p>
      )}

      {/* Pegar desde Excel */}
      {!pasteOpen ? (
        <button
          type="button"
          onClick={() => setPasteOpen(true)}
          className="px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          ↓ Pegar desde Excel
        </button>
      ) : (
        <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/30 space-y-2">
          <div className="text-xs font-semibold text-gray-700">
            Pegá las columnas de tu planilla aquí
          </div>
          <div className="text-xs text-gray-500">
            Formato esperado: {effectiveAttributeType || 'Atributo'} | Precio | Stock (copiá desde
            Excel con Ctrl+V)
          </div>
          <textarea
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500 resize-y"
            rows={5}
            placeholder={`Breeze\t6050\t5\nVainilla Cream\t6050\t3`}
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setPastePreview([]);
            }}
          />
          {pastePreview.length > 0 && (
            <div className="border border-green-200 rounded-lg overflow-hidden">
              <div className="px-2 py-1.5 bg-green-50 text-xs font-semibold text-green-700">
                {pastePreview.length} variantes listas para agregar
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-green-100">
                    <th className="px-2 py-1 text-left text-gray-600">
                      {effectiveAttributeType || 'Atributo'}
                    </th>
                    <th className="px-2 py-1 text-right text-gray-600">Precio</th>
                    <th className="px-2 py-1 text-right text-gray-600">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {pastePreview.map((row, i) => (
                    <tr key={i} className="border-b border-green-50">
                      <td className="px-2 py-1">{row.attributeValue}</td>
                      <td className="px-2 py-1 text-right">${row.price.toLocaleString('es-AR')}</td>
                      <td className="px-2 py-1 text-right">{row.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2">
            {pastePreview.length === 0 ? (
              <button
                type="button"
                onClick={handlePastePreview}
                disabled={!pasteText.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-40"
              >
                Previsualizar
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePasteConfirm}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
              >
                Confirmar y agregar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPasteOpen(false);
                setPasteText('');
                setPastePreview([]);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
