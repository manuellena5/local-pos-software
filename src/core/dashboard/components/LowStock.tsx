import type { DashboardDTO } from '@shared/types';

interface LowStockProps {
  data: DashboardDTO['lowStock'];
  isLoading?: boolean;
  onNavigate: (tab: string) => void;
}

export function LowStock({ data, isLoading, onNavigate }: LowStockProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-green-600 py-2">✓ Sin alertas de stock</p>
    );
  }

  // Group by category preserving order of first appearance
  const categories: string[] = [];
  const byCategory = new Map<string, DashboardDTO['lowStock']>();
  for (const item of data) {
    if (!byCategory.has(item.category)) {
      categories.push(item.category);
      byCategory.set(item.category, []);
    }
    byCategory.get(item.category)!.push(item);
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {cat}
          </p>
          <div className="space-y-1">
            {byCategory.get(cat)!.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? 'base'}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700 truncate flex-1">{item.name}</span>
                <span
                  className={`ml-3 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                    item.isCritical
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {item.currentStock} / {item.minStock}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => onNavigate('productos')}
        className="text-xs text-blue-600 hover:underline mt-1"
      >
        Ver todo el stock →
      </button>
    </div>
  );
}
