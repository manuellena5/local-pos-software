import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  version: string;
}

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('http://localhost:3001/api/health', { signal: controller.signal })
      .then((r) => r.json() as Promise<{ data: HealthStatus }>)
      .then((body) => setHealth(body.data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('Servidor no disponible');
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">LocalPosSoftware</h1>
        <p className="text-gray-400 text-sm mb-6">Fase 0 — Setup y arquitectura base</p>
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Backend status
          </p>
          {health && (
            <p className="text-green-600 font-medium">
              ✓ {health.status} — v{health.version}
            </p>
          )}
          {error && <p className="text-red-500">{error}</p>}
          {!health && !error && <p className="text-gray-400 text-sm">Conectando...</p>}
        </div>
      </div>
    </div>
  );
}
