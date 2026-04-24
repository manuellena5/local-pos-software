import { useBootstrap } from '@/core/config/useBootstrap';
import { useAppStore } from '@/core/store/appStore';
import { BusinessUnitSelector } from '@/core/business-units/BusinessUnitSelector';

export function App() {
  const { loading, error } = useBootstrap();
  const config = useAppStore((s) => s.config);
  const activeBU = useAppStore((s) => s.activeBU);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{config?.businessName ?? 'LocalPos'}</h1>
          {activeBU && (
            <p className="text-xs text-gray-400 mt-0.5">{activeBU.name} — {activeBU.moduleId}</p>
          )}
        </div>
        <BusinessUnitSelector />
      </header>

      <main className="p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-lg">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Unidades de negocio cargadas correctamente
          </p>
          {activeBU ? (
            <p className="text-green-600 font-medium">✓ BUs cargadas correctamente</p>
          ) : (
            <p className="text-yellow-500">Sin unidades de negocio activas</p>
          )}
        </div>
      </main>
    </div>
  );
}
