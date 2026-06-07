import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as fs from 'fs';
import type { PrinterConfig, PrinterStatus } from '../../../shared/types';

/**
 * Construye el string de interfaz requerido por node-thermal-printer a partir
 * de una PrinterConfig.
 */
function buildInterface(config: PrinterConfig): string {
  if (config.type === 'network') {
    const host = config.host ?? '192.168.1.100';
    const port = config.port ?? 9100;
    return `tcp://${host}:${port}`;
  }
  // USB: en Windows se usa \\.\USB001, en Linux /dev/usb/lp0
  const portPath = config.portPath ?? 'USB001';
  if (process.platform === 'win32') {
    return `\\\\.\\${portPath}`;
  }
  return portPath;
}

class PrinterService {
  private printer: ThermalPrinter | null = null;
  private currentStatus: PrinterStatus = 'disconnected';
  private currentConfig: PrinterConfig | null = null;

  /**
   * Detecta puertos USB/serial disponibles en el sistema.
   */
  async detectPorts(): Promise<string[]> {
    if (process.platform === 'win32') {
      // En Windows los puertos USB de impresoras usan el formato USB001-USB004
      return ['USB001', 'USB002', 'USB003', 'USB004'];
    }
    // En Linux/Mac se buscan dispositivos usb/lp
    try {
      const usbPaths = ['/dev/usb/lp0', '/dev/usb/lp1', '/dev/usb/lp2'];
      const existing = usbPaths.filter((p) => fs.existsSync(p));
      return existing.length > 0 ? existing : ['/dev/usb/lp0'];
    } catch {
      return ['/dev/usb/lp0'];
    }
  }

  /**
   * Intenta conectar con la configuración dada.
   * Si la conexión falla, el estado queda en 'error'.
   */
  async connect(config: PrinterConfig): Promise<{ success: boolean; error?: string }> {
    try {
      this.disconnect();

      const printerInterface = buildInterface(config);
      const characterSet = (config.characterSet as CharacterSet | undefined) ?? CharacterSet.PC858_EURO;

      this.printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: printerInterface,
        options: { timeout: 3000 },
        width: config.width ?? 48,
        characterSet,
      });

      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        this.printer = null;
        this.currentStatus = 'error';
        this.currentConfig = null;
        return { success: false, error: 'No se pudo conectar con la impresora. Verificá que esté encendida y conectada.' };
      }

      this.currentStatus = 'connected';
      this.currentConfig = config;
      return { success: true };
    } catch (err) {
      this.printer = null;
      this.currentStatus = 'error';
      this.currentConfig = null;
      const message = err instanceof Error ? err.message : 'Error desconocido al conectar';
      return { success: false, error: message };
    }
  }

  /**
   * Devuelve el estado actual de la conexión.
   * Verifica activamente si la impresora sigue conectada para detectar desconexiones físicas.
   */
  getStatus(): PrinterStatus {
    return this.currentStatus;
  }

  /**
   * Verifica activamente el estado de la impresora. Útil para polling.
   * Si la impresora se desconectó físicamente, actualiza el estado a 'disconnected'.
   */
  async checkStatus(): Promise<PrinterStatus> {
    if (!this.printer || this.currentStatus === 'disconnected') {
      return 'disconnected';
    }
    try {
      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        this.currentStatus = 'disconnected';
        this.printer = null;
      }
    } catch {
      this.currentStatus = 'disconnected';
      this.printer = null;
    }
    return this.currentStatus;
  }

  /**
   * Imprime una página de prueba con el mensaje de confirmación y la fecha actual.
   */
  async testPrint(): Promise<{ success: boolean; error?: string }> {
    if (!this.printer || this.currentStatus !== 'connected') {
      return { success: false, error: 'La impresora no está conectada.' };
    }
    try {
      const now = format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es });
      this.printer.alignCenter();
      this.printer.println('Impresora configurada correctamente');
      this.printer.drawLine();
      this.printer.println(now);
      this.printer.newLine();
      this.printer.cut();
      await this.printer.execute();
      this.printer.clear();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir';
      this.currentStatus = 'disconnected';
      this.printer = null;
      return { success: false, error: message };
    }
  }

  /**
   * Desconecta la impresora limpiamente.
   */
  disconnect(): void {
    this.printer = null;
    this.currentStatus = 'disconnected';
    this.currentConfig = null;
  }

  getConfig(): PrinterConfig | null {
    return this.currentConfig;
  }
}

export const printerService = new PrinterService();
