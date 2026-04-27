import { useAppStore } from '@/core/store/appStore';
import { usePOSStore } from '@/core/store/posStore';
import type { BusinessUnit } from '@shared/types';

export function BusinessUnitSelector() {
  const { businessUnits, activeBU, setActiveBU } = useAppStore();
  const clearCart = usePOSStore((s) => s.clearCart);

  if (businessUnits.length === 0) return null;

  function handleSwitch(unit: BusinessUnit) {
    if (unit.id === activeBU?.id) return; // ya está activa
    clearCart();
    setActiveBU(unit);
  }

  return (
    <div className="flex gap-2">
      {businessUnits
        .filter((u) => u.isActive)
        .map((unit) => (
          <button
            key={unit.id}
            onClick={() => handleSwitch(unit)}
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
