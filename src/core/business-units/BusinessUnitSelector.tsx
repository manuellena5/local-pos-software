import { useAppStore } from '@/core/store/appStore';

export function BusinessUnitSelector() {
  const { businessUnits, activeBU, setActiveBU } = useAppStore();

  if (businessUnits.length === 0) return null;

  return (
    <div className="flex gap-2">
      {businessUnits
        .filter((u) => u.isActive)
        .map((unit) => (
          <button
            key={unit.id}
            onClick={() => setActiveBU(unit)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeBU?.id === unit.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            ].join(' ')}
          >
            {unit.name}
          </button>
        ))}
    </div>
  );
}
