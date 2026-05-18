interface StockBadgeProps {
  quantity: number;
  minimumThreshold: number;
}

export function StockBadge({ quantity, minimumThreshold }: StockBadgeProps) {
  if (quantity === 0) {
    return (
      <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 tabular-nums">
        0
      </span>
    );
  }
  if (minimumThreshold > 0 && quantity <= minimumThreshold) {
    return (
      <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-600 tabular-nums">
        {quantity}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 tabular-nums">
      {quantity}
    </span>
  );
}
