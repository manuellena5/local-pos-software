import { useState } from 'react';
import { useCart } from '@/core/hooks/useCart';
import { formatCurrency } from '@/lib/utils/pricing';
import type { PaymentMethod } from '@shared/types';

const METHODS = [
  { id: 'cash',        label: 'Efectivo',      icon: '💵' },
  { id: 'card',        label: 'Tarjeta',        icon: '💳' },
  { id: 'mercadopago', label: 'Mercado Pago',   icon: '🔵' },
  { id: 'transfer',    label: 'Transferencia',  icon: '🏦' },
  { id: 'modo',        label: 'Modo / Ualá',    icon: '📱' },
];

export function POSPaymentMethods() {
  const { totals, paymentMethods, setPaymentMethods } = useCart();
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  function toggleMethod(methodId: string) {
    const already = paymentMethods.find((p) => p.method === methodId);
    if (already) {
      const updated = paymentMethods.filter((p) => p.method !== methodId);
      setPaymentMethods(updated);
      setAmounts((prev) => {
        const next = { ...prev };
        delete next[methodId];
        return next;
      });
    } else {
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
        p.method === methodId ? { ...p, amount: val } : p,
      );
      setPaymentMethods(updated);
    }
  }

  const totalPaid = paymentMethods.reduce((s, p) => s + p.amount, 0);
  const cashEntry = paymentMethods.find((p) => p.method === 'cash');
  const change = totalPaid > totals.totalAmount
    ? Math.round((totalPaid - totals.totalAmount) * 100) / 100
    : 0;
  const missingAmount = totals.totalAmount - totalPaid;

  return (
    <div className="flex flex-col gap-2">
      {/* Grid 3 columnas — ícono arriba + texto abajo */}
      <div className="grid grid-cols-3 gap-1">
        {METHODS.map((m) => {
          const selected = paymentMethods.some((p) => p.method === m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleMethod(m.id)}
              style={{ height: 48, fontSize: 11 }}
              className={`flex flex-col items-center justify-center gap-[3px] px-1 rounded-lg font-medium border transition-all ${
                selected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Montos por método seleccionado */}
      {paymentMethods.length > 0 && (
        <div className="space-y-1">
          {paymentMethods.map((p) => {
            const meta = METHODS.find((m) => m.id === p.method);
            const isCash = p.method === 'cash';
            return (
              <div key={p.method} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600 min-w-[90px]">
                  {meta?.icon} {meta?.label ?? p.method}
                </span>
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amounts[p.method] ?? p.amount.toFixed(2)}
                  onChange={(e) => handleAmountChange(p.method, e.target.value)}
                  className={`flex-1 px-2 border rounded text-xs text-right ${
                    isCash ? 'border-blue-300 focus:ring-blue-400' : 'border-gray-300'
                  } focus:outline-none focus:ring-1`}
                  style={{ height: 26 }}
                />
              </div>
            );
          })}

          {/* Vuelto */}
          {cashEntry && change > 0 && (
            <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded px-2 py-1">
              <span className="text-xs font-semibold text-green-700">Vuelto</span>
              <span className="text-sm font-bold text-green-700">{formatCurrency(change)}</span>
            </div>
          )}

          {/* Falta cubrir */}
          {missingAmount > 1 && (
            <div className="flex justify-between text-[11px] text-red-500 pt-0.5 border-t">
              <span>Falta cubrir</span>
              <span className="font-medium">{formatCurrency(missingAmount)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
