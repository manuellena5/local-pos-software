import { useState } from 'react';
import { useBootstrap } from '@/core/config/useBootstrap';
import { useAppStore } from '@/core/store/appStore';
import { BusinessUnitSelector } from '@/core/business-units/BusinessUnitSelector';
import { ProductList } from '@/core/components/ProductList';
import { StockDashboard } from '@/core/components/StockDashboard';
import { POSPage } from '@/core/components/POSPage';
import { InvoiceQueueStatus } from '@/core/components/InvoiceQueueStatus';
import { CustomerList } from '@/core/components/CustomerList';
import { CashboxPage } from '@/core/components/CashboxPage';
import { CashboxStatus } from '@/core/components/CashboxStatus';
import { ReportsPage } from '@/core/components/ReportsPage';
import { SettingsPage } from '@/core/components/SettingsPage';
import { NetworkStatusBar } from '@/core/components/NetworkStatusBar';
import { initRetailTextilModule } from '@/modules/retail-textil';

// Inicializar módulos verticales (registra extensiones del formulario de producto, etc.)
initRetailTextilModule();

type AppTab = 'dashboard' | 'productos' | 'pos' | 'clientes' | 'caja' | 'reportes' | 'configuracion';

const TABS: { key: AppTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'productos', label: 'Productos', icon: '📦' },
  { key: 'pos', label: 'Punto de venta', icon: '💰' },
  { key: 'clientes', label: 'Clientes', icon: '👥' },
  { key: 'caja', label: 'Caja', icon: '🏦' },
  { key: 'reportes', label: 'Reportes', icon: '📊' },
  { key: 'configuracion', label: 'Configuración', icon: '⚙️' },
];

export function App() {
  const { loading, error } = useBootstrap();
  const config = useAppStore((s) => s.config);
  const activeBU = useAppStore((s) => s.activeBU);
  const [tab, setTab] = useState<AppTab>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
          <p className="text-red-500 font-medium">Error: {error}</p>
          <p className="text-gray-400 text-sm mt-1">Verificar que el servidor esté corriendo en :3001</p>
        </div>
      </div>
    );
  }

  if (!activeBU) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Sin unidades de negocio activas</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{config?.businessName ?? 'LocalPos'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeBU.name} — {activeBU.moduleId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CashboxStatus businessUnitId={activeBU?.id} onGoToCashbox={() => setTab('caja')} />
          <InvoiceQueueStatus businessUnitId={activeBU?.id} />
          <NetworkStatusBar />
          <BusinessUnitSelector />
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-1 max-w-6xl mx-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6">
          {tab === 'dashboard' && <StockDashboard businessUnitId={activeBU.id} />}
          {tab === 'productos' && <ProductList businessUnitId={activeBU.id} />}
          {tab === 'pos' && <POSPage businessUnitId={activeBU.id} />}
          {tab === 'clientes' && <CustomerList />}
          {tab === 'caja' && <CashboxPage businessUnitId={activeBU.id} />}
          {tab === 'reportes' && <ReportsPage businessUnitId={activeBU.id} />}
          {tab === 'configuracion' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}
