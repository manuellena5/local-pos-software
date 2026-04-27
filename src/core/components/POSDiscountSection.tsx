import { useState } from 'react';
import { useCart } from '@/core/hooks/useCart';

export function POSDiscountSection() {
  const { discountPercent, discountAmount, setDiscountPercent, setDiscountAmount, totals } =
    useCart();
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');
  const [inputValue, setInputValue] = useState('');

  function handleApply() {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val < 0) return;

    if (mode === 'percent') {
      setDiscountPercent(Math.min(val, 100));
    } else {
      setDiscountAmount(val);
    }
  }

  function handleClear() {
    setDiscountPercent(0);
    setDiscountAmount(0);
    setInputValue('');
  }

  const hasDiscount = discountPercent > 0 || discountAmount > 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => {
            setMode('percent');
            setInputValue('');
          }}
          className={`flex-1 py-1.5 text-xs font-medium rounded border ${
            mode === 'percent'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Descuento %
        </button>
        <button
          onClick={() => {
            setMode('amount');
            setInputValue('');
          }}
          className={`flex-1 py-1.5 text-xs font-medium rounded border ${
            mode === 'amount'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Descuento $
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder={mode === 'percent' ? 'Ej: 10' : 'Ej: 500'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <button
          onClick={handleApply}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          Aplicar
        </button>
        {hasDiscount && (
          <button
            onClick={handleClear}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      {hasDiscount && (
        <p className="text-xs text-green-600 font-medium">
          Descuento aplicado: −${totals.discountAmount.toFixed(2)}
        </p>
      )}
    </div>
  );
}
