import { useEffect, useState } from 'react';
import { useAppStore } from '@/core/store/appStore';
import { printerApi } from '@/lib/api/printer';
import type { PrinterConfig, PrinterStatus } from '@shared/types';

const POLL_INTERVAL_MS = 30_000;

/**
 * Hook que hace polling al estado de la impresora cada 30 segundos
 * y actualiza el store global. Se monta una sola vez en App.tsx.
 */
export function usePrinterStatus(): { printerStatus: PrinterStatus; printerConfig: PrinterConfig | null } {
  const printerStatus = useAppStore((s) => s.printerStatus);
  const setPrinterStatus = useAppStore((s) => s.setPrinterStatus);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function poll(): Promise<void> {
      try {
        const result = await printerApi.getStatus();
        if (!controller.signal.aborted) {
          setPrinterStatus(result.status);
          setPrinterConfig(result.config);
        }
      } catch {
        // Si el servidor no responde, no cambiamos el estado — próximo ciclo reintentará
      }
    }

    void poll();
    const intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [setPrinterStatus]);

  return { printerStatus, printerConfig };
}
