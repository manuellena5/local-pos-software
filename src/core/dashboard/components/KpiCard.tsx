interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  variant?: 'default' | 'info';
  isLoading?: boolean;
}

export function KpiCard({ label, value, sub, delta, variant = 'default', isLoading }: KpiCardProps) {
  const isInfo = variant === 'info';

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        isInfo ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'
      }`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>

      {isLoading ? (
        <>
          <div className="h-7 w-28 bg-gray-100 rounded animate-pulse mt-1" />
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mt-1" />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-0.5">
            <p className={`text-2xl font-bold ${isInfo ? 'text-blue-700' : 'text-gray-900'}`}>
              {value}
            </p>
            {delta != null && (
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  delta >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
              </span>
            )}
          </div>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </>
      )}
    </div>
  );
}
