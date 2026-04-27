import { useState } from 'react';
import { useCart } from '@/core/hooks/useCart';
import type { PaymentMethod } from '@shared/types';

const METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'modo', label: 'Modo / Ualá' },
];

export function POSPaymentMethods() {
  const { totals, paymentMethods, setPaymentMethods } = useCart();
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  function toggleMethod(methodId: string) {
    const already = paymentMethods.find((p) => p.method === methodId);
    if (already) {
      // Quitar
      const updated = paymentMethods.filter((p) => p.method !== methodId);
      setPaymentMethods(updated);
      setAmounts((prev) => {
        const next = { ...prev };
        delete next[methodId];
        return next;
      });
    } else {
      // Agregar con monto restante
      const paid = paymentMethods.reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, totals.totalAmount - paid);
      const newAmount = remaining > 0 ? remaining.toFixed(2) : '';
      setAmounts((prev) => ({ ...prev, [methodId]: newAmount }));
      const updated: PaymentMethod[] = [
        ...paymentMethods,
        { method: methodId, amount: remaining > 0 ? remaining : 0 },
      ];
      setPaymentMethods(updated);
    }
  }

  function handleAmountChange(methodId: string, raw: string) {
    setAmounts((prev) => ({ ...prev, [methodId]: raw }));
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0) {
      const updated = paymentMethods.map((p) =>
        p.method === methodId ? { ...p, amount: val } : p
      );
      setPaymentMethods(updated);
    }
  }

  const totalPaid = paymentMethods.reduce((s, p) => s + p.amount, 0);
  const cashMethod = paymentMethods.find((p) => p.method === 'cash');
  const change = cashMethod
    ? Math.max(0, Math.round((totalPaid - totals.totalAmount) * 100) / 100)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {METHODS.map((m) => {
          const selected = paymentMethods.some((p) => p.method === m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleMethod(m.id)}
              className={`px-3 py-2 rounded text-sm font-medium border transition-colors ${
                selected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {paymentMethods.length > 0 && (
        <div className="space-y-2">
          {paymentMethods.map((p) => {
            const label = METHODS.find((m) => m.id === p.method)?.label ?? p.method;
            return (
              <div key={p.method} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-32">{label}</span>
                <span className="text-sm text-gray-400">$</span>
                <input
                  type="text"
                  value={amounts[p.method] ?? p.amount.toFixed(2)}
                  onChange={(e) => handleAmountChange(p.method, e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            );
          })}

          <div className="flex justify-between text-sm pt-1 border-t">
            <span className="text-gray-500">Total pagado</span>
            <span
              className={
                totalPaid >= totals.totalAmount ? 'text-green-600 font-medium' : 'text-red-500'
              }
            >
              ${totalPaid.toFixed(2)}
            </span>
          </div>

          {change > 0 && (
            <div className="flex justify-between text-sm font-bold text-blue-600 bg-blue-50 rounded px-2 py-1">
              <span>Vuelto</span>
              <span>${change.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
