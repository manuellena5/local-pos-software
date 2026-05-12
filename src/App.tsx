import { useState } from 'react';
import { useBootstrap } from '@/core/config/useBootstrap';
import { useAppStore } from '@/core/store/appStore';
import { BusinessUnitSelector } from '@/core/business-units/BusinessUnitSelector';
import { ProductList } from '@/core/components/ProductList';
import { POSPage } from '@/core/components/POSPage';
import { InvoiceQueueStatus } from '@/core/components/InvoiceQueueStatus';
import { CustomerList } from '@/core/components/CustomerList';
import { CashboxPage } from '@/core/components/CashboxPage';
import { CashboxStatus } from '@/core/components/CashboxStatus';
import { ReportsPage } from '@/core/components/ReportsPage';
import { SettingsPage } from '@/core/components/SettingsPage';
import { NetworkStatusBar } from '@/core/components/NetworkStatusBar';
import { DashboardPage } from '@/core/dashboard/DashboardPage';
import { initRetailTextilModule } from '@/modules/retail-textil';
import { initTallerMedidaModule } from '@/modules/taller-medida';
import { TallerMedidaPage } from '@/modules/taller-medida/components/TallerMedidaPage';
import { initProveedoresModule } from '@/modules/proveedores';
import { SuppliersView } from '@/modules/proveedores/components/SuppliersView';

// Inicializar módulos verticales (registra extensiones del formulario de producto, etc.)
initRetailTextilModule();
initTallerMedidaModule();
initProveedoresModule();

type AppTab = 'dashboard' | 'productos' | 'pos' | 'clientes' | 'caja' | 'pedidos' | 'proveedores' | 'reportes' | 'configuracion';

const CORE_TABS: { key: AppTab; label: string; icon: string }[] = [
  { key: 'dashboard',     label: 'Dashboard',       icon: '🏠' },
  { key: 'productos',     label: 'Productos',        icon: '📦' },
  { key: 'pos',           label: 'Punto de venta',   icon: '💰' },
  { key: 'clientes',      label: 'Clientes',         icon: '👥' },
  { key: 'caja',          label: 'Caja',             icon: '🏦' },
  { key: 'proveedores',   label: 'Proveedores',      icon: '🏭' },
  { key: 'reportes',      label: 'Reportes',         icon: '📊' },
  { key: 'configuracion', label: 'Configuración',    icon: '⚙️' },
];

const TALLER_TAB: { key: AppTab; label: string; icon: string } = {
  key: 'pedidos', label: 'Pedidos', icon: '🧵',
};

export function App() {
  const { loading, error } = useBootstrap();
  const config    = useAppStore((s) => s.config);
  const activeBU  = useAppStore((s) => s.activeBU);
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

  const isTallerBU = activeBU.moduleId === 'taller-medida';

  // Insertar tab Pedidos entre Caja y Reportes solo para BU taller-medida
  const TABS = isTallerBU
    ? [
        ...CORE_TABS.slice(0, 5),   // dashboard → caja
        TALLER_TAB,
        ...CORE_TABS.slice(5),      // reportes → configuracion
      ]
    : CORE_TABS;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{config?.businessName ?? 'LocalPos'}</h1>
          <p className="text-sm font-medium text-gray-600 mt-0.5">
            Unidad activa: {activeBU.name} — {activeBU.moduleId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CashboxStatus businessUnitId={activeBU?.id} onGoToCashbox={() => setTab('caja')} />
          <InvoiceQueueStatus businessUnitId={activeBU?.id} />
          <NetworkStatusBar />
          <BusinessUnitSelector />
        </div>
      </header>

      <div className="shrink-0 border-b border-gray-200 bg-white px-6">
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

      {/* POS: layout full-height sin scroll exterior */}
      {tab === 'pos' ? (
        <main className="flex-1 min-h-0 overflow-hidden pt-2 pb-2 px-6 flex flex-col">
          <div className="max-w-6xl mx-auto w-full flex-1 min-h-0 flex flex-col">
            <div className="bg-white rounded-xl shadow px-6 pt-3 pb-2 flex-1 min-h-0 flex flex-col overflow-hidden">
              <POSPage businessUnitId={activeBU.id} />
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow p-6">
              {tab === 'dashboard'     && (
                <DashboardPage
                  businessUnitId={activeBU.id}
                  moduleId={activeBU.moduleId}
                  onNavigate={(t) => setTab(t as AppTab)}
                />
              )}
              {tab === 'productos'     && <ProductList businessUnitId={activeBU.id} />}
              {tab === 'clientes'      && <CustomerList />}
              {tab === 'caja'          && <CashboxPage businessUnitId={activeBU.id} />}
              {tab === 'pedidos'       && <TallerMedidaPage />}
              {tab === 'proveedores'   && <SuppliersView />}
              {tab === 'reportes'      && <ReportsPage businessUnitId={activeBU.id} />}
              {tab === 'configuracion' && <SettingsPage />}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
