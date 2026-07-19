import { LOW_STOCK_THRESHOLD } from '@shared/constants';

interface StockBadgeProps {
  quantity: number;
  minimumThreshold: number;
}

export function StockBadge({ quantity, minimumThreshold }: StockBadgeProps) {
  const threshold = minimumThreshold > 0 ? minimumThreshold : LOW_STOCK_THRESHOLD;

  if (quantity === 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600">
        Sin stock
      </span>
    );
  }
  if (quantity <= threshold) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-600">
        Stock bajo ({quantity})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 tabular-nums">
      {quantity}
    </span>
  );
}
