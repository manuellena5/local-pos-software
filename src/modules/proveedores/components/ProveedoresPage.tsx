import { useState } from 'react';
import { SuppliersView } from './SuppliersView';
// ComparatorView oculto hasta ser rediseñado — no borrar
// import { ComparatorView } from './ComparatorView';

type SubTab = 'lista';

const TABS: { key: SubTab; label: string; icon: string }[] = [
  { key: 'lista', label: 'Proveedores', icon: '🏭' },
  // { key: 'comparador', label: 'Comparador', icon: '📊' },
];

export function ProveedoresPage() {
  const [subTab, setSubTab] = useState<SubTab>('lista');

  return (
    <div className="space-y-4">
      {/* Sub-navegación */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              subTab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'lista' && <SuppliersView />}
      {false && <>{/* <ComparatorView /> — oculto hasta rediseño */}</>}
    </div>
  );
}
