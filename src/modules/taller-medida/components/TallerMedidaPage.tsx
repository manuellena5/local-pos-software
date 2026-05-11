import { useState } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { OrderListScreen } from './OrderListScreen';
import { NewOrderForm } from './NewOrderForm';
import { OrderDetailScreen } from './OrderDetailScreen';
import { OrderReportScreen } from './OrderReportScreen';

type View = 'list' | 'new' | { detail: number };

const SUBTABS = [
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'reporte', label: 'Reporte' },
] as const;
type Subtab = (typeof SUBTABS)[number]['key'];

export function TallerMedidaPage() {
  const activeBU = useAppStore((s) => s.activeBU);
  const [subtab, setSubtab] = useState<Subtab>('pedidos');
  const [view, setView]     = useState<View>('list');

  if (!activeBU) return null;

  const showList   = () => setView('list');
  const showNew    = () => setView('new');
  const showDetail = (id: number) => setView({ detail: id });

  return (
    <div className="space-y-4">
      {/* Sub-navegación */}
      {view === 'list' && (
        <div className="flex gap-1 border-b border-gray-100 pb-3">
          {SUBTABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setSubtab(t.key); setView('list'); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                subtab === t.key && view === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      {view === 'list' && subtab === 'pedidos' && (
        <OrderListScreen
          businessUnitId={activeBU.id}
          onNewOrder={showNew}
          onSelectOrder={showDetail}
        />
      )}

      {view === 'list' && subtab === 'reporte' && (
        <OrderReportScreen businessUnitId={activeBU.id} />
      )}

      {view === 'new' && (
        <NewOrderForm
          businessUnitId={activeBU.id}
          onCreated={(id) => { showDetail(id); }}
          onCancel={showList}
        />
      )}

      {typeof view === 'object' && 'detail' in view && (
        <OrderDetailScreen
          orderId={view.detail}
          onBack={showList}
        />
      )}
    </div>
  );
}
