import { useState } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { printerApi } from '@/lib/api/printer';
import type { PrinterConfig, PrinterStatus } from '@shared/types';

// Ancho en caracteres por línea según tamaño de papel
const PAPER_WIDTH_CHARS: Record<58 | 80, number> = { 58: 32, 80: 48 };

interface PrinterSettingsTabProps {
  onStatusChange?: (status: PrinterStatus) => void;
}

export function PrinterSettingsTab({ onStatusChange }: PrinterSettingsTabProps) {
  const printerStatus = useAppStore((s) => s.printerStatus);
  const setPrinterStatus = useAppStore((s) => s.setPrinterStatus);
  const businessName = useAppStore((s) => s.config?.businessName ?? '');

  const [connectionType, setConnectionType] = useState<'usb' | 'network'>('usb');
  const [portPath, setPortPath] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(9100);
  const [paperWidth, setPaperWidth] = useState<58 | 80>(58);
  const [detectedPorts, setDetectedPorts] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleDetect(): Promise<void> {
    setDetecting(true);
    setDetectError(null);
    setDetectedPorts([]);
    try {
      const result = await printerApi.detectPorts();
      setDetectedPorts(result.ports);
      if (result.ports.length > 0) setPortPath(result.ports[0] ?? 'USB001');
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : 'Error al detectar puertos');
    } finally {
      setDetecting(false);
    }
  }

  function buildConfig(): PrinterConfig {
    const width = PAPER_WIDTH_CHARS[paperWidth];
    if (connectionType === 'usb') {
      return { type: 'usb', portPath, width };
    }
    return { type: 'network', host, port, width };
  }

  async function handleSaveConfig(): Promise<void> {
    setSaving(true);
    setSaveResult(null);
    try {
      await printerApi.saveConfig(buildConfig());
      setSaveResult('✓ Configuración guardada');
      setTimeout(() => setSaveResult(null), 2500);
    } catch (e) {
      setSaveResult(`Error: ${e instanceof Error ? e.message : 'No se pudo guardar'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleConnect(): Promise<void> {
    setConnecting(true);
    setConnectError(null);
    setTestResult(null);
    try {
      const result = await printerApi.connect(buildConfig());
      if (result.success) {
        setPrinterStatus('connected');
        onStatusChange?.('connected');
      } else {
        setPrinterStatus('error');
        onStatusChange?.('error');
        setConnectError(result.error ?? 'No se pudo conectar');
      }
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Error al conectar');
    } finally {
      setConnecting(false);
    }
  }

  async function handleTestPrint(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await printerApi.testPrint(businessName);
      setTestResult(result.success ? '✓ Ticket de prueba enviado correctamente.' : `Error: ${result.error ?? 'fallo desconocido'}`);
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : 'fallo al imprimir'}`);
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect(): Promise<void> {
    try {
      await printerApi.disconnect();
      setPrinterStatus('disconnected');
      onStatusChange?.('disconnected');
      setTestResult(null);
      setConnectError(null);
    } catch {
      // Desconectar localmente aunque falle el server
      setPrinterStatus('disconnected');
    }
  }

  const statusConfig = {
    connected:    { label: 'Conectada',      bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    disconnected: { label: 'Desconectada',   bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
    error:        { label: 'Error',          bg: 'bg-red-100',   text: 'text-red-800',   dot: 'bg-red-500'  },
  }[printerStatus];

  return (
    <div className="space-y-6 max-w-lg">
      {/* Estado actual */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${statusConfig.bg}`}>
        <span className={`w-3 h-3 rounded-full shrink-0 ${statusConfig.dot}`} />
        <div>
          <p className={`text-base font-semibold ${statusConfig.text}`}>{statusConfig.label}</p>
          {printerStatus === 'disconnected' && (
            <p className="text-xs text-gray-500 mt-0.5">Configurá y conectá una impresora para habilitar la impresión de tickets.</p>
          )}
          {printerStatus === 'error' && (
            <p className="text-xs text-red-600 mt-0.5">No se pudo comunicar con la impresora. Verificá la conexión.</p>
          )}
        </div>
      </div>

      {/* Tipo de conexión */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Tipo de conexión</p>
        <div className="flex gap-4">
          {(['usb', 'network'] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="connectionType"
                value={type}
                checked={connectionType === type}
                onChange={() => { setConnectionType(type); setConnectError(null); setTestResult(null); }}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-700">{type === 'usb' ? 'USB' : 'Red (IP)'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Configuración según tipo */}
      {connectionType === 'usb' ? (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Impresora
              </label>
              <select
                value={portPath}
                onChange={(e) => setPortPath(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {detectedPorts.length > 0
                  ? detectedPorts.map((p) => <option key={p} value={p}>{p}</option>)
                  : <option value={portPath}>{portPath || '(seleccioná o detectá)'}</option>
                }
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Windows: nombre del dispositivo (ej: POS-80-Series) · Linux: ruta (ej: /dev/usb/lp0)
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleDetect()}
              disabled={detecting}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 shrink-0"
            >
              {detecting ? 'Detectando...' : 'Detectar'}
            </button>
          </div>
          {detectError && <p className="text-xs text-red-500">{detectError}</p>}
          {detectedPorts.length === 0 && !detecting && (
            <p className="text-xs text-gray-400">
              Hacé clic en &quot;Detectar&quot; o escribí el nombre manualmente.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Dirección IP</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="Ej: 192.168.1.100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Puerto</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="9100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {/* Ancho de papel */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Ancho de papel</p>
        <div className="flex gap-4">
          {([58, 80] as const).map((w) => (
            <label key={w} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paperWidth"
                value={w}
                checked={paperWidth === w}
                onChange={() => setPaperWidth(w)}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-700">{w}mm</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Nictom IT03 y la mayoría de impresoras de bolsillo usan 58mm.
        </p>
      </div>

      {/* Resultado de guardar */}
      {saveResult && (
        <p className={`text-sm rounded-lg px-3 py-2 ${saveResult.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {saveResult}
        </p>
      )}

      {/* Errores de conexión */}
      {connectError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{connectError}</p>
      )}

      {/* Resultado de prueba */}
      {testResult && (
        <p className={`text-sm rounded-lg px-3 py-2 ${testResult.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {testResult}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSaveConfig()}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>

        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={connecting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {connecting ? 'Conectando...' : 'Conectar'}
        </button>

        <button
          type="button"
          onClick={() => void handleTestPrint()}
          disabled={printerStatus !== 'connected' || testing}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {testing ? 'Imprimiendo...' : 'Imprimir página de prueba'}
        </button>

        {printerStatus === 'connected' && (
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Desconectar
          </button>
        )}
      </div>

      {/* Nota de compatibilidad */}
      <p className="text-xs text-gray-400 border-t pt-4">
        Compatible con impresoras ESC/POS: Nictom IT03, Epson TM-T20, Xprinter XP-58 y similares.
      </p>
    </div>
  );
}
