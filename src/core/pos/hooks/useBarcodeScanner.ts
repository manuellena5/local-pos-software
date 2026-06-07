import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  /** Callback que recibe el barcode escaneado */
  onScan: (barcode: string) => void;
  /** Largo mínimo del código para considerarlo válido (default: 3) */
  minLength?: number;
  /** Tiempo máximo entre keystrokes para considerarlo scanner HID, en ms (default: 50) */
  maxDelay?: number;
  /** Permite desactivar el hook sin desmontarlo (default: true) */
  enabled?: boolean;
  /**
   * Cuando es true, captura scans incluso si hay un input enfocado.
   * Útil en modales donde el input de búsqueda está siempre enfocado
   * pero igual se quiere detectar el lector HID.
   * (default: false)
   */
  captureInInputs?: boolean;
}

/**
 * Detecta escaneos de código de barras desde un lector HID USB (emula teclado).
 *
 * Los lectores HID envían los dígitos en ráfaga (< 50ms entre teclas) seguido
 * de Enter. El tipeo humano es mucho más lento y por eso se descarta.
 *
 * Por defecto ignora el input cuando el foco está en un campo de texto.
 * Usar `captureInInputs: true` para capturar también en inputs (ej. modales).
 *
 * Limitación conocida: barcodes con prefijo de balanza (empieza en "2") no se
 * filtran — no es el caso de uso de blanquería/deco.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 3,
  maxDelay = 50,
  enabled = true,
  captureInInputs = false,
}: BarcodeScannerOptions): void {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent): void {
      const active = document.activeElement;
      const tag = active?.tagName.toLowerCase() ?? '';
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        (active as HTMLElement | null)?.isContentEditable === true;

      // Si hay un campo enfocado y no estamos en modo captureInInputs, ignorar
      if (isEditable && !captureInInputs) return;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;

      if (lastKeyTimeRef.current !== 0 && elapsed > maxDelay) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const scanned = bufferRef.current;
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
        if (scanned.length >= minLength) {
          const isFromScanner = elapsed <= maxDelay || elapsed === now;
          if (isFromScanner) {
            e.preventDefault(); // evitar que Enter confirme formularios en el modal
            onScanRef.current(scanned);
          }
        }
        return;
      }

      if (e.key.length !== 1) return;

      bufferRef.current += e.key;
      lastKeyTimeRef.current = now;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      bufferRef.current = '';
      lastKeyTimeRef.current = 0;
    };
  }, [enabled, minLength, maxDelay, captureInInputs]);
}
