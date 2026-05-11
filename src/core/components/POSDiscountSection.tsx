import { useState } from 'react';
import { useCart } from '@/core/hooks/useCart';

export function POSDiscountSection() {
  const { discountPercent, discountAmount, setDiscountPercent, setDiscountAmount } =
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
    <div className="flex items-center gap-1">
      {/* Toggle %/$ — altura exacta 26px */}
      <button
        onClick={() => { setMode('percent'); setInputValue(''); }}
        style={{ height: 26, fontSize: 11 }}
        className={`px-2 font-bold rounded border transition-colors ${
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
        style={{ height: 26, fontSize: 11 }}
        className={`px-2 font-bold rounded border transition-colors ${
          mode === 'amount'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
        }`}
        title="Descuento en pesos"
      >
        $
      </button>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        placeholder={mode === 'percent' ? '0%' : '0.00'}
        style={{ height: 26, fontSize: 12 }}
        className="w-16 px-2 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      <button
        onClick={handleApply}
        style={{ height: 26, fontSize: 11 }}
        className="px-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
      >
        Aplicar
      </button>

      {hasDiscount && (
        <button
          onClick={handleClear}
          style={{ height: 26, fontSize: 11 }}
          className="px-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
          title="Quitar descuento"
        >
          ✕
        </button>
      )}
    </div>
  );
}
