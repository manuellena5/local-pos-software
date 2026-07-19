import type { DashboardDTO } from '@shared/types';

const METHOD_COLORS: Record<string, string> = {
  cash: '#2563EB',
  transfer: '#0891B2',
  card: '#7C3AED',
  mercadopago: '#00AEEF',
};

const DEFAULT_COLOR = '#6B7280';

function fmt(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface PaymentMethodsProps {
  data: DashboardDTO['paymentMethods'];
  isLoading?: boolean;
}

export function PaymentMethods({ data, isLoading }: PaymentMethodsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-1.5 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">Sin ventas registradas hoy</p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const color = METHOD_COLORS[item.method] ?? DEFAULT_COLOR;
        return (
          <div key={item.method} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">{item.label}</span>
              <span className="text-gray-500 text-xs">
                {item.percentage}% · ${fmt(item.total)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${item.percentage}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
