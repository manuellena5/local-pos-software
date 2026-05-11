import { useState } from 'react';
import { useCart } from '@/core/hooks/useCart';
import { formatCurrency } from '@/lib/utils/pricing';
import type { PaymentMethod } from '@shared/types';

const METHODS = [
  { id: 'cash',        label: 'Efectivo' },
  { id: 'card',        label: 'Tarjeta' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'transfer',    label: 'Transferencia' },
  { id: 'modo',        label: 'Modo / Ualá' },
];

export function POSPaymentMethods() {
  const { totals, paymentMethods, setPaymentMethods } = useCart();
  const [amountStr, setAmountStr] = useState('');

  const selectedMethodId = paymentMethods[0]?.method ?? '';
  const totalPaid        = paymentMethods.reduce((s, p) => s + p.amount, 0);
  const isCash           = selectedMethodId === 'cash';
  const change           = totalPaid > totals.totalAmount
    ? Math.round((totalPaid - totals.totalAmount) * 100) / 100
    : 0;
  const missingAmount = totals.totalAmount - totalPaid;

  function selectMethod(methodId: string) {
    if (!methodId) {
      setPaymentMethods([]);
      setAmountStr('');
      return;
    }
    const fullAmount = totals.totalAmount;
    const updated: PaymentMethod[] = [{ method: methodId, amount: fullAmount }];
    setPaymentMethods(updated);
    setAmountStr(fullAmount > 0 ? fullAmount.toFixed(2) : '');
  }

  function handleAmountChange(raw: string) {
    setAmountStr(raw);
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0 && selectedMethodId) {
      setPaymentMethods([{ method: selectedMethodId, amount: val }]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Select nativo */}
      <select
        value={selectedMethodId}
        onChange={(e) => selectMethod(e.target.value)}
        style={{ height: 36, fontSize: 13 }}
        className="w-full border border-gray-300 rounded-lg px-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      >
        <option value="">— Seleccionar medio de pago —</option>
        {METHODS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>

      {/* Input de monto cuando hay método seleccionado */}
      {selectedMethodId && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 min-w-[60px]">Monto $</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={amountStr !== '' ? amountStr : (paymentMethods[0]?.amount.toFixed(2) ?? '')}
            onChange={(e) => handleAmountChange(e.target.value)}
            style={{ height: 28, fontSize: 13 }}
            className={`flex-1 px-2 border rounded text-right focus:outline-none focus:ring-1 ${
              isCash ? 'border-blue-300 focus:ring-blue-400' : 'border-gray-300 focus:ring-blue-300'
            }`}
          />
        </div>
      )}

      {/* Vuelto */}
      {isCash && change > 0 && (
        <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded px-2 py-1">
          <span className="text-xs font-semibold text-green-700">Vuelto</span>
          <span className="text-sm font-bold text-green-700">{formatCurrency(change)}</span>
        </div>
      )}

      {/* Falta cubrir */}
      {selectedMethodId && missingAmount > 1 && (
        <div className="flex justify-between text-[11px] text-red-500 border-t pt-0.5">
          <span>Falta cubrir</span>
          <span className="font-medium">{formatCurrency(missingAmount)}</span>
        </div>
      )}
    </div>
  );
}
