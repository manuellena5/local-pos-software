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
}

/**
 * Detecta escaneos de código de barras desde un lector HID USB (emula teclado).
 *
 * Los lectores HID envían los dígitos en ráfaga (< 50ms entre teclas) seguido
 * de Enter. El tipeo humano es mucho más lento y por eso se descarta.
 *
 * El hook ignora el input cuando el foco está en un campo de texto para no
 * interferir con la búsqueda manual.
 *
 * Limitación conocida: barcodes con prefijo de balanza (empieza en "2") no se
 * filtran — no es el caso de uso de blanquería/deco.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 3,
  maxDelay = 50,
  enabled = true,
}: BarcodeScannerOptions): void {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  // Usamos ref para onScan para evitar re-registrar el listener en cada render
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent): void {
      // Ignorar si el foco está en un campo editable — no interferir con tipeo
      const active = document.activeElement;
      const tag = active?.tagName.toLowerCase() ?? '';
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        (active as HTMLElement | null)?.isContentEditable === true;
      if (isEditable) return;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;

      // Si pasó más tiempo del permitido entre teclas, el buffer anterior
      // era tipeo humano — descartar y empezar de cero
      if (lastKeyTimeRef.current !== 0 && elapsed > maxDelay) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const scanned = bufferRef.current;
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
        if (scanned.length >= minLength) {
          // Solo disparar si el último intervalo fue rápido (scanner)
          // elapsed puede ser 0 si es el primer Enter o si ya reseteamos
          const isFromScanner = elapsed <= maxDelay || elapsed === now;
          if (isFromScanner) {
            onScanRef.current(scanned);
          }
        }
        return;
      }

      // Ignorar teclas no imprimibles (Shift, Ctrl, Alt, F1-F12, etc.)
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
  }, [enabled, minLength, maxDelay]);
}
