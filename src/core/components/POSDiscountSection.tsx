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
    <div className="flex items-center gap-1.5">
      {/* Toggle %/$ */}
      <button
        onClick={() => { setMode('percent'); setInputValue(''); }}
        className={`px-2 py-1.5 text-xs font-bold rounded border transition-colors ${
          mode === 'percent'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
        }`}
        title="Descuento porcentual"
      >
        %
      </button>
      <button
        onClick={() => { setMode('amount'); setInputValue(''); }}
        className={`px-2 py-1.5 text-xs font-bold rounded border transition-colors ${
          mode === 'amount'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
        }`}
        title="Descuento en pesos"
      >
        $
      </button>

      {/* Input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        placeholder={mode === 'percent' ? '0%' : '0.00'}
        className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleApply}
        className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
      >
        Aplicar
      </button>

      {hasDiscount && (
        <button
          onClick={handleClear}
          className="px-2 py-1.5 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
          title="Quitar descuento"
        >
          ✕
        </button>
      )}
    </div>
  );
}
