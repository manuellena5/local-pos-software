import type { ChipFilter, ProductsChipCounts } from '../types';
import { useProductsStore } from '../store/productsStore';

interface ProductsSummaryChipsProps {
  counts: ProductsChipCounts;
}

export function ProductsSummaryChips({ counts }: ProductsSummaryChipsProps) {
  const chip    = useProductsStore((s) => s.filter.chip);
  const setChip = useProductsStore((s) => s.setChip);

  const chips: { id: ChipFilter; label: string; count: number; style: string; activeStyle: string }[] = [
    {
      id: 'all',
      label: 'Todos',
      count: counts.all,
      style: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      activeStyle: 'bg-blue-100 border-blue-400 ring-2 ring-blue-300',
    },
    {
      id: 'low',
      label: '⚠️ Stock bajo',
      count: counts.low,
      style: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
      activeStyle: 'bg-orange-100 border-orange-400 ring-2 ring-orange-300',
    },
    {
      id: 'nocost',
      label: 'Sin costo',
      count: counts.nocost,
      style: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
      activeStyle: 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300',
    },
    {
      id: 'instock',
      label: '✅ Con stock',
      count: counts.instock,
      style: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      activeStyle: 'bg-green-100 border-green-400 ring-2 ring-green-300',
    },
  ];

  return (
    <div className="flex gap-1.5 flex-wrap mb-2">
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => setChip(c.id === chip ? 'all' : c.id)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all
            ${c.style} ${chip === c.id ? c.activeStyle : ''}`}
        >
          {c.label}: <span className="font-bold">{c.count}</span>
        </button>
      ))}
    </div>
  );
}
