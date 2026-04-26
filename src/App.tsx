import { useState } from 'react';
import { useBootstrap } from '@/core/config/useBootstrap';
import { useAppStore } from '@/core/store/appStore';
import { BusinessUnitSelector } from '@/core/business-units/BusinessUnitSelector';
import { ProductList } from '@/core/components/ProductList';
import { StockDashboard } from '@/core/components/StockDashboard';

export function App() {
  const { loading, error } = useBootstrap();
  const config = useAppStore((s) => s.config);
  const activeBU = useAppStore((s) => s.activeBU);
  const [tab, setTab] = useState<'dashboard' | 'productos'>('dashboard');

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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{config?.businessName ?? 'LocalPos'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeBU.name} — {activeBU.moduleId}
          </p>
        </div>
        <BusinessUnitSelector />
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              tab === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab('productos')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              tab === 'productos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Productos
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          {tab === 'dashboard' && <StockDashboard businessUnitId={activeBU.id} />}
          {tab === 'productos' && <ProductList businessUnitId={activeBU.id} />}
        </div>
      </main>
    </div>
  );
}
