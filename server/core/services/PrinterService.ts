import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import type { PrinterConfig, PrinterStatus, SaleTicketData, ReporteZData } from '../../../shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// PowerShell: impresión real via Win32 WritePrinter (RAW).
// Receives -PrinterName and -FilePath as parameters.
// ─────────────────────────────────────────────────────────────────────────────
const WIN_PRINT_PS = `
param([string]$PrinterName, [string]$FilePath)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class LocalPosPrint {
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, EntryPoint="OpenPrinterW")]
    public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
    [DllImport("winspool.drv")]
    public static extern bool ClosePrinter(IntPtr h);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct DOCINFOW {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, EntryPoint="StartDocPrinterW")]
    public static extern int StartDocPrinter(IntPtr h, int lvl, ref DOCINFOW doc);
    [DllImport("winspool.drv")]
    public static extern bool EndDocPrinter(IntPtr h);
    [DllImport("winspool.drv")]
    public static extern bool StartPagePrinter(IntPtr h);
    [DllImport("winspool.drv")]
    public static extern bool EndPagePrinter(IntPtr h);
    [DllImport("winspool.drv")]
    public static extern bool WritePrinter(IntPtr h, IntPtr p, int c, out int w);
}
"@
$hPrinter = [IntPtr]::Zero
if (-not [LocalPosPrint]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero)) {
    Write-Error "ERROR: Cannot open printer '$PrinterName'"
    exit 1
}
$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$doc = New-Object LocalPosPrint+DOCINFOW
$doc.pDocName = "LocalPOS"
$doc.pDataType = "RAW"
$jobId = [LocalPosPrint]::StartDocPrinter($hPrinter, 1, [ref]$doc)
if ($jobId -le 0) { [LocalPosPrint]::ClosePrinter($hPrinter); Write-Error "StartDocPrinter failed"; exit 1 }
[LocalPosPrint]::StartPagePrinter($hPrinter) | Out-Null
$pin = [System.Runtime.InteropServices.GCHandle]::Alloc($bytes, "Pinned")
try {
    $written = 0
    [LocalPosPrint]::WritePrinter($hPrinter, $pin.AddrOfPinnedObject(), $bytes.Length, [ref]$written) | Out-Null
} finally { $pin.Free() }
[LocalPosPrint]::EndPagePrinter($hPrinter) | Out-Null
[LocalPosPrint]::EndDocPrinter($hPrinter) | Out-Null
[LocalPosPrint]::ClosePrinter($hPrinter) | Out-Null
Write-Output "OK"
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// PowerShell: PING de conexión — verifica que el dispositivo USB responda.
// Envía ESC @ (inicializar impresora, sin output visible) y usa AbortPrinter
// para cancelar el job inmediatamente. Así no imprime nada y no genera
// notificaciones de Windows si la impresora no está disponible.
// Exits 1 si la impresora no responde; exits 0 si OK.
// ─────────────────────────────────────────────────────────────────────────────
const WIN_PING_PS = `
param([string]$PrinterName)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class LocalPosPing {
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, EntryPoint="OpenPrinterW")]
    public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
    [DllImport("winspool.drv")]
    public static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.drv")]
    public static extern bool AbortPrinter(IntPtr h);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct DOCINFOW {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, EntryPoint="StartDocPrinterW")]
    public static extern int StartDocPrinter(IntPtr h, int lvl, ref DOCINFOW doc);
    [DllImport("winspool.drv")]
    public static extern bool StartPagePrinter(IntPtr h);
    [DllImport("winspool.drv")]
    public static extern bool WritePrinter(IntPtr h, IntPtr p, int c, out int w);
}
"@
$hPrinter = [IntPtr]::Zero
if (-not [LocalPosPing]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero)) {
    Write-Error "ERROR: Cannot open printer '$PrinterName'"
    exit 1
}
$doc = New-Object LocalPosPing+DOCINFOW
$doc.pDocName = "LocalPOS-Ping"
$doc.pDataType = "RAW"
$jobId = [LocalPosPing]::StartDocPrinter($hPrinter, 1, [ref]$doc)
if ($jobId -le 0) {
    [LocalPosPing]::ClosePrinter($hPrinter)
    Write-Error "ERROR: StartDocPrinter failed - printer not available"
    exit 1
}
# Enviar ESC @ (2 bytes: inicializar impresora, sin output visible)
$bytes = [byte[]]@(0x1B, 0x40)
[LocalPosPing]::StartPagePrinter($hPrinter) | Out-Null
$pin = [System.Runtime.InteropServices.GCHandle]::Alloc($bytes, "Pinned")
$written = 0
$writeOk = $false
try {
    $writeOk = [LocalPosPing]::WritePrinter($hPrinter, $pin.AddrOfPinnedObject(), $bytes.Length, [ref]$written)
} finally { $pin.Free() }
# AbortPrinter cancela el job inmediatamente (sin imprimir, sin notificacion de Windows)
[LocalPosPing]::AbortPrinter($hPrinter) | Out-Null
[LocalPosPing]::ClosePrinter($hPrinter) | Out-Null
if (-not $writeOk -or $written -ne $bytes.Length) {
    Write-Error "ERROR: WritePrinter failed (ok=$writeOk written=$written)"
    exit 1
}
Write-Output "OK"
`.trim();

// ─────────────────────────────────────────────────────────────────────────────

function buildThermalPrinterInterface(config: PrinterConfig): string {
  if (config.type === 'network') {
    const host = config.host ?? '192.168.1.100';
    const port = config.port ?? 9100;
    return `tcp://${host}:${port}`;
  }
  // Linux/Mac USB: direct device file
  return config.portPath ?? '/dev/usb/lp0';
}

class PrinterService {
  /** For network / Linux USB: persistent ThermalPrinter instance. */
  private printer: ThermalPrinter | null = null;
  private currentStatus: PrinterStatus = 'disconnected';
  private currentConfig: PrinterConfig | null = null;

  // ── detectPorts ──────────────────────────────────────────────────────────

  /**
   * Detecta impresoras disponibles en el sistema.
   * En Windows devuelve los nombres de las impresoras instaladas (via wmic).
   * En Linux/Mac devuelve rutas de dispositivos USB.
   */
  async detectPorts(): Promise<string[]> {
    if (process.platform === 'win32') {
      try {
        // wmic printer get Name /format:csv → "Node,Name\nHOST,POS-80-Series\n..."
        const output = execSync('wmic printer get Name /format:csv', {
          encoding: 'utf8',
          timeout: 5000,
        });
        return output
          .split('\n')
          .map((l) => l.split(',').pop()?.trim() ?? '')
          .filter((name) => name && name !== 'Name');
      } catch {
        return [];
      }
    }
    // Linux / Mac
    try {
      const candidates = ['/dev/usb/lp0', '/dev/usb/lp1', '/dev/usb/lp2'];
      const found = candidates.filter((p) => fs.existsSync(p));
      return found.length > 0 ? found : ['/dev/usb/lp0'];
    } catch {
      return ['/dev/usb/lp0'];
    }
  }

  // ── connect ──────────────────────────────────────────────────────────────

  /**
   * Intenta conectar con la configuración dada.
   * En Windows USB verifica el nombre de impresora via wmic.
   * En red / Linux USB usa node-thermal-printer directamente.
   */
  async connect(config: PrinterConfig): Promise<{ success: boolean; error?: string }> {
    this.disconnect();

    if (process.platform === 'win32' && config.type === 'usb') {
      return this.connectWindowsUsb(config);
    }
    return this.connectDirect(config);
  }

  private async connectWindowsUsb(
    config: PrinterConfig,
  ): Promise<{ success: boolean; error?: string }> {
    const printerName = config.portPath ?? '';
    if (!printerName) {
      return { success: false, error: 'Nombre de impresora requerido.' };
    }
    try {
      const output = execSync(
        'wmic printer get Name,WorkOffline,PrinterStatus /format:csv',
        { encoding: 'utf8', timeout: 5000 },
      );
      const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
      const printerLine = lines.find((l) =>
        l.toLowerCase().includes(printerName.toLowerCase()),
      );

      if (!printerLine) {
        return {
          success: false,
          error: `Impresora "${printerName}" no encontrada en Windows. Verificá el nombre en Dispositivos e impresoras.`,
        };
      }

      // WorkOffline = TRUE → modo offline manual
      if (/,TRUE[,\r]?$/i.test(printerLine) || printerLine.toUpperCase().includes(',TRUE,')) {
        return {
          success: false,
          error: `La impresora "${printerName}" está en modo offline. Desactivá "Usar impresora sin conexión" desde Windows.`,
        };
      }

      // PrinterStatus: 3=Idle, 4=Printing, 5=Warmup → OK
      // 128=Offline, 2=Error → no disponible
      const cols = printerLine.split(',');
      const statusCode = parseInt(cols[2] ?? '0', 10);
      const isReady = statusCode === 0 || statusCode === 3 || statusCode === 4 || statusCode === 5;
      if (!isReady) {
        return {
          success: false,
          error: `La impresora "${printerName}" no está disponible (estado: ${statusCode}). Verificá que esté encendida y conectada.`,
        };
      }

      // Verificación física real: WIN_PING_PS envía ESC @ y usa AbortPrinter
      // para cancelar inmediatamente. wmic solo ve el spooler de Windows, que
      // muestra la impresora instalada aunque esté desenchufada.
      const pingError = await this.pingWindowsUsb(printerName);
      if (pingError) {
        return {
          success: false,
          error: `La impresora "${printerName}" no responde. Verificá que esté encendida y conectada por USB. (${pingError})`,
        };
      }

      this.currentStatus = 'connected';
      this.currentConfig = config;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al verificar impresora en Windows.',
      };
    }
  }

  private async connectDirect(
    config: PrinterConfig,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const iface = buildThermalPrinterInterface(config);
      const characterSet =
        (config.characterSet as CharacterSet | undefined) ?? CharacterSet.PC858_EURO;

      this.printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: iface,
        options: { timeout: 3000 },
        width: config.width ?? 48,
        characterSet,
      });

      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        this.printer = null;
        this.currentStatus = 'error';
        return {
          success: false,
          error: 'No se pudo conectar. Verificá que la impresora esté encendida y conectada.',
        };
      }

      this.currentStatus = 'connected';
      this.currentConfig = config;
      return { success: true };
    } catch (err) {
      this.printer = null;
      this.currentStatus = 'error';
      const message = err instanceof Error ? err.message : 'Error desconocido al conectar.';
      return { success: false, error: message };
    }
  }

  // ── getStatus / checkStatus ───────────────────────────────────────────────

  /** Estado en memoria (sin I/O). */
  getStatus(): PrinterStatus {
    return this.currentStatus;
  }

  /**
   * Verifica activamente el estado. Detecta desconexiones físicas sin crashear.
   * Usado por el endpoint de polling.
   *
   * Para Windows USB: usa wmic (sin enviar datos, para no generar notificaciones
   * de Windows cuando la impresora está offline) + chequea jobs en error.
   * La detección definitiva ocurre cuando una impresión falla.
   */
  async checkStatus(): Promise<PrinterStatus> {
    if (this.currentStatus === 'disconnected') return 'disconnected';

    if (process.platform === 'win32' && this.currentConfig?.type === 'usb') {
      try {
        const printerName = this.currentConfig.portPath ?? '';
        const output = execSync(
          'wmic printer get Name,WorkOffline,PrinterStatus /format:csv',
          { encoding: 'utf8', timeout: 3000 },
        );
        const lines = output.split('\n');
        const line = lines.find((l) => l.toLowerCase().includes(printerName.toLowerCase()));
        if (!line) {
          this.currentStatus = 'disconnected';
          this.currentConfig = null;
          return this.currentStatus;
        }
        const isOffline = /,TRUE[,\r]?$/i.test(line) || line.toUpperCase().includes(',TRUE,');
        const cols = line.split(',');
        const statusCode = parseInt(cols[2] ?? '0', 10);
        const isReady = statusCode === 0 || statusCode === 3 || statusCode === 4 || statusCode === 5;
        if (isOffline || !isReady) {
          this.currentStatus = 'disconnected';
          this.currentConfig = null;
        }
      } catch {
        this.currentStatus = 'disconnected';
        this.currentConfig = null;
      }
      return this.currentStatus;
    }

    // Network / Linux USB
    if (!this.printer) return 'disconnected';
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

  // ── testPrint ─────────────────────────────────────────────────────────────

  /**
   * Imprime una página de prueba.
   * En Windows USB: extrae el buffer ESC/POS via archivo temporal y lo envía
   * al printer por nombre usando la Win32 WritePrinter API (PowerShell).
   * En red / Linux USB: usa la instancia de ThermalPrinter directamente.
   */
  async testPrint(businessName = ''): Promise<{ success: boolean; error?: string }> {
    if (this.currentStatus !== 'connected') {
      return { success: false, error: 'La impresora no está conectada.' };
    }

    const buildContent = (p: ThermalPrinter): void => {
      const now = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: es });
      p.newLine();
      p.alignCenter();
      p.println('=== TICKET DE PRUEBA ===');
      if (businessName) p.println(businessName);
      p.println(now);
      p.println('========================');
      p.newLine();
      p.cut();
    };

    try {
      if (process.platform === 'win32' && this.currentConfig?.type === 'usb') {
        const printerName = this.currentConfig.portPath ?? '';
        const buffer = await this.buildEscPosBuffer((p) => buildContent(p));
        await this.printWindowsRaw(printerName, buffer);
        return { success: true };
      }

      // Network / Linux USB
      if (!this.printer) return { success: false, error: 'La impresora no está conectada.' };
      buildContent(this.printer);
      await this.printer.execute();
      this.printer.clear();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir.';
      this.currentStatus = 'disconnected';
      this.currentConfig = null;
      this.printer = null;
      return { success: false, error: message };
    }
  }

  // ── printSaleTicket ───────────────────────────────────────────────────────

  /**
   * Imprime el ticket de una venta usando ESC/POS directo.
   * No abre ningún diálogo de impresión del sistema operativo.
   */
  async printSaleTicket(data: SaleTicketData): Promise<{ success: boolean; error?: string }> {
    if (this.currentStatus !== 'connected') {
      return { success: false, error: 'La impresora no está conectada.' };
    }

    try {
      if (process.platform === 'win32' && this.currentConfig?.type === 'usb') {
        const printerName = this.currentConfig.portPath ?? '';
        const buffer = await this.buildEscPosBuffer(async (p) => {
          await this.buildTicketContent(p, data);
        });
        await this.printWindowsRaw(printerName, buffer);
        return { success: true };
      }

      // Network / Linux USB
      if (!this.printer) return { success: false, error: 'La impresora no está conectada.' };
      await this.buildTicketContent(this.printer, data);
      await this.printer.execute();
      this.printer.clear();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir el ticket.';
      this.currentStatus = 'disconnected';
      this.currentConfig = null;
      this.printer = null;
      return { success: false, error: message };
    }
  }

  // ── printReporteZ ─────────────────────────────────────────────────────────

  /**
   * Imprime el Reporte Z de cierre de caja en formato ESC/POS 58mm.
   */
  async printReporteZ(data: ReporteZData): Promise<{ success: boolean; error?: string }> {
    if (this.currentStatus !== 'connected') {
      return { success: false, error: 'La impresora no está conectada.' };
    }

    try {
      if (process.platform === 'win32' && this.currentConfig?.type === 'usb') {
        const printerName = this.currentConfig.portPath ?? '';
        const buffer = await this.buildEscPosBuffer((p) => this.buildReporteZContent(p, data));
        await this.printWindowsRaw(printerName, buffer);
        return { success: true };
      }

      if (!this.printer) return { success: false, error: 'La impresora no está conectada.' };
      this.buildReporteZContent(this.printer, data);
      await this.printer.execute();
      this.printer.clear();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir el Reporte Z.';
      this.currentStatus = 'disconnected';
      this.currentConfig = null;
      this.printer = null;
      return { success: false, error: message };
    }
  }

  private buildReporteZContent(p: ThermalPrinter, data: ReporteZData): void {
    const W = this.currentConfig?.width ?? 32;

    p.newLine();
    p.newLine();
    p.newLine();

    p.alignCenter();
    p.bold(true);
    p.setTextSize(1, 1);
    p.println(ticketTruncate(data.businessName, Math.floor(W / 2)));
    p.setTextSize(0, 0);
    p.bold(false);

    p.println(ticketTruncate(data.businessUnitName, W));
    p.println('*** REPORTE Z ***');

    p.drawLine();

    p.alignLeft();
    const openDate = data.openedAt.slice(0, 10).split('-').reverse().join('/');
    const openTime = data.openedAt.slice(11, 16);
    const closeDate = data.closedAt.slice(0, 10).split('-').reverse().join('/');
    const closeTime = data.closedAt.slice(11, 16);
    p.println(`Apertura: ${openDate} ${openTime}`);
    p.println(`Cierre:   ${closeDate} ${closeTime}`);
    if (data.operatorEmail) {
      p.println(ticketTruncate(`Operador: ${data.operatorEmail}`, W));
    }

    p.drawLine();

    p.bold(true);
    p.println('VENTAS DEL PERIODO');
    p.bold(false);
    p.println(ticketRightAlign('Cantidad:', String(data.sales.count), W));
    p.println(ticketRightAlign('Anuladas:', String(data.sales.cancelledCount), W));
    p.println(ticketRightAlign('Ticket prom.:', ticketMoney(data.sales.averageTicket), W));
    p.bold(true);
    p.println(ticketRightAlign('TOTAL VENTAS', ticketMoney(data.sales.total), W));
    p.bold(false);

    if (data.sales.byPaymentMethod.length > 0) {
      p.drawLine();
      p.bold(true);
      p.println('DESGLOSE POR MEDIO DE PAGO');
      p.bold(false);
      for (const pm of data.sales.byPaymentMethod) {
        p.println(ticketRightAlign(pm.method, ticketMoney(pm.amount), W));
      }
    }

    p.drawLine();

    p.bold(true);
    p.println('MOVIMIENTOS DE CAJA');
    p.bold(false);
    p.println(ticketRightAlign('Saldo inicial:', ticketMoney(data.cash.openingBalance), W));
    p.println(ticketRightAlign('Ing. manuales:', ticketMoney(data.cash.manualIncome), W));
    p.println(ticketRightAlign('Egr. manuales:', ticketMoney(data.cash.manualExpense), W));
    p.println(ticketRightAlign('Cobros:', ticketMoney(data.cash.cashSalesTotal), W));
    p.println(ticketRightAlign('Saldo teorico:', ticketMoney(data.cash.theoreticalBalance), W));
    p.println(ticketRightAlign('Saldo declarado:', ticketMoney(data.cash.declaredBalance), W));
    const diffSign = data.cash.difference >= 0 ? '+' : '-';
    p.bold(true);
    p.println(
      ticketRightAlign(
        'Diferencia:',
        `${diffSign}${ticketMoney(Math.abs(data.cash.difference))}`,
        W,
      ),
    );
    p.bold(false);

    if (data.afip.emitted > 0 || data.afip.pending > 0) {
      p.drawLine();
      p.bold(true);
      p.println('FACTURACION AFIP');
      p.bold(false);
      p.println(ticketRightAlign('Emitidos:', String(data.afip.emitted), W));
      p.println(ticketRightAlign('Pendientes:', String(data.afip.pending), W));
    }

    p.drawLine();
    p.alignCenter();
    p.println(data.generatedAt);

    p.newLine();
    p.newLine();
    p.newLine();
    p.newLine();
    p.partialCut();
  }

  // ── disconnect ────────────────────────────────────────────────────────────

  disconnect(): void {
    this.printer = null;
    this.currentStatus = 'disconnected';
    this.currentConfig = null;
  }

  getConfig(): PrinterConfig | null {
    return this.currentConfig;
  }

  // ── helpers privados ──────────────────────────────────────────────────────

  // ── buildTicketContent ────────────────────────────────────────────────────

  private async buildTicketContent(p: ThermalPrinter, data: SaleTicketData): Promise<void> {
    const W = this.currentConfig?.width ?? 48;

    // Feed inicial para que el papel salga del cabezal
    p.newLine();
    p.newLine();
    p.newLine();

    // Mayor densidad de tinta (raw ESC/POS)
    p.raw(Buffer.from([0x1b, 0x7c, 0x08]));

    // ── HEADER ───────────────────────────────────────────────────────────────
    // Nombre del negocio: centrado, bold, doble tamaño
    p.alignCenter();
    p.setTextSize(1, 1);
    p.bold(true);
    p.println(ticketTruncate(data.businessName, Math.floor(W / 2)));
    p.setTextSize(0, 0);
    p.bold(false);

    if (data.businessAddress) p.println(ticketTruncate(data.businessAddress, W));
    p.println(ticketTruncate(`CUIT: ${data.cuit}`, W));
    if (data.ingBrutos) p.println(ticketTruncate(`I.B.: ${data.ingBrutos}`, W));

    p.drawLine();

    // ── CLIENTE + COMPROBANTE + FECHA ─────────────────────────────────────────
    p.alignLeft();

    // Cliente: siempre "CONSUMIDOR FINAL", con nombre si aplica
    p.println(ticketTruncate(data.fiscalCondition, W));

    // Número de comprobante o venta
    if (data.invoiceNumber) {
      p.println(ticketTruncate(`Comprobante: ${data.invoiceNumber}`, W));
    } else {
      p.println(`Venta N: ${data.saleNumber.padStart(4, '0')}`);
    }

    // Fecha y hora
    p.println(`Fecha: ${data.date}  Hora: ${data.time}`);

    p.drawLine();

    // ── ÍTEMS ─────────────────────────────────────────────────────────────────
    for (const item of data.items) {
      p.println(ticketTruncate(item.name, W));
      const discountTag =
        item.itemDiscount && item.itemDiscount > 0 ? ` (-${item.itemDiscount}%)` : '';
      const qtyLabel = `${item.quantity} x ${ticketMoney(item.unitPrice)}${discountTag}`;
      p.println(ticketRightAlign(qtyLabel, ticketMoney(item.subtotal), W));
    }

    p.drawLine();

    // ── DESCUENTO GLOBAL + TOTAL ──────────────────────────────────────────────
    if (
      data.globalDiscount &&
      data.globalDiscount > 0 &&
      data.subtotalBeforeDiscount !== undefined &&
      data.globalDiscountAmount !== undefined
    ) {
      p.println(ticketRightAlign('Subtotal', ticketMoney(data.subtotalBeforeDiscount), W));
      p.println(
        ticketRightAlign(
          `Descuento (${data.globalDiscount}%)`,
          `-${ticketMoney(data.globalDiscountAmount)}`,
          W,
        ),
      );
    }

    p.bold(true);
    p.println(ticketRightAlign('TOTAL', ticketMoney(data.total), W));
    p.bold(false);

    p.drawLine();

    // ── MEDIOS DE PAGO + VUELTO ───────────────────────────────────────────────
    for (const payment of data.payments) {
      p.println(ticketRightAlign(payment.method, ticketMoney(payment.amount), W));
    }
    if (data.change !== undefined && data.change > 0) {
      p.println(ticketRightAlign('Vuelto', ticketMoney(data.change), W));
    }

    p.drawLine();

    // ── CAE + QR AFIP ─────────────────────────────────────────────────────────
    if (data.cae) {
      p.alignLeft();
      p.println(`CAE: ${data.cae}`);
      if (data.caeVto) {
        const raw = data.caeVto;
        const vtoFormatted =
          raw.length === 8
            ? `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`
            : raw;
        p.println(`Vto: ${vtoFormatted}`);
      }

      // QR AFIP (RG 4291/2018)
      const qrUrl = buildAfipQrUrl(data);
      if (qrUrl) {
        p.alignCenter();
        try {
          p.printQR(qrUrl, { cellSize: 4, correction: 'M' });
        } catch {
          // Fallback: generar imagen PNG si la impresora no soporta QR nativo
          const qrBuffer = await QRCode.toBuffer(qrUrl, { width: 160 });
          const qrTempFile = path.join(os.tmpdir(), `localpos_qr_${Date.now()}.png`);
          fs.writeFileSync(qrTempFile, qrBuffer);
          try {
            await p.printImage(qrTempFile);
          } finally {
            try { fs.unlinkSync(qrTempFile); } catch { /* ignorar */ }
          }
        }
      }

      p.alignLeft();
      p.drawLine();
    }

    // ── CIERRE ────────────────────────────────────────────────────────────────
    p.alignCenter();
    p.println('Gracias por su compra!');

    // Feed final + corte
    p.newLine();
    p.newLine();
    p.newLine();
    p.newLine();
    p.cut();
  }

  /**
   * Construye un buffer ESC/POS usando node-thermal-printer escribiendo
   * a un archivo temporal (evita necesitar @thiagoelg/node-printer).
   */
  private async buildEscPosBuffer(
    buildFn: (printer: ThermalPrinter) => Promise<void> | void,
  ): Promise<Buffer> {
    const tempFile = path.join(os.tmpdir(), `localpos_buf_${Date.now()}.bin`);
    const p = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: tempFile,
      width: this.currentConfig?.width ?? 48,
      characterSet:
        (this.currentConfig?.characterSet as CharacterSet | undefined) ?? CharacterSet.PC858_EURO,
    });
    await buildFn(p);
    await p.execute();
    const buffer = fs.readFileSync(tempFile);
    try { fs.unlinkSync(tempFile); } catch { /* ignorar */ }
    return buffer;
  }

  /**
   * Envía bytes ESC/POS raw a una impresora Windows por nombre usando
   * la Win32 WritePrinter API via PowerShell.
   * No requiere @thiagoelg/node-printer ni compartir la impresora.
   */
  /**
   * Verifica la conexión física USB enviando ESC @ y cancelando el job
   * inmediatamente con AbortPrinter (sin imprimir, sin notificación Windows).
   * Retorna null si OK, o un string de error si no responde.
   */
  private async pingWindowsUsb(printerName: string): Promise<string | null> {
    const tempDir = os.tmpdir();
    const ts = Date.now();
    const scriptFile = path.join(tempDir, `localpos_ping_${ts}.ps1`);
    fs.writeFileSync(scriptFile, WIN_PING_PS, { encoding: 'utf8' });
    try {
      execSync(
        `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}" -PrinterName "${printerName}"`,
        { timeout: 8_000 },
      );
      return null; // OK
    } catch (err) {
      return err instanceof Error ? err.message : 'No responde';
    } finally {
      try { fs.unlinkSync(scriptFile); } catch { /* ignorar */ }
    }
  }

  private async printWindowsRaw(printerName: string, buffer: Buffer): Promise<void> {
    const tempDir = os.tmpdir();
    const ts = Date.now();
    const jobFile = path.join(tempDir, `localpos_job_${ts}.bin`);
    const scriptFile = path.join(tempDir, `localpos_print_${ts}.ps1`);

    fs.writeFileSync(jobFile, buffer);
    // BOM-less UTF-8 for PowerShell compatibility
    fs.writeFileSync(scriptFile, WIN_PRINT_PS, { encoding: 'utf8' });

    try {
      execSync(
        `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}" -PrinterName "${printerName}" -FilePath "${jobFile}"`,
        { timeout: 15_000 },
      );
    } finally {
      try { fs.unlinkSync(scriptFile); } catch { /* ignorar */ }
      try { fs.unlinkSync(jobFile); } catch { /* ignorar */ }
    }
  }
}

// ── helpers de formato de ticket ─────────────────────────────────────────

function ticketMoney(amount: number): string {
  return `$ ${amount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function ticketRightAlign(label: string, value: string, width: number): string {
  const gap = width - label.length - value.length;
  return gap > 0 ? label + ' '.repeat(gap) + value : `${label} ${value}`;
}

function ticketTruncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
}

/**
 * Construye la URL del QR de AFIP según RG 4291/2018.
 * Retorna null si los datos no son suficientes para generarlo.
 */
function buildAfipQrUrl(data: SaleTicketData): string | null {
  if (!data.cae || !data.invoiceNumber) return null;

  // Parsear invoiceNumber: "C-0001-00000014" → ptoVta=1, nroCmp=14, tipoCmp=11 (Factura C)
  const parts = data.invoiceNumber.split('-');
  if (parts.length !== 3) return null;
  const tipo = parts[0] ?? '';
  const ptoVta = parseInt(parts[1] ?? '0', 10);
  const nroCmp = parseInt(parts[2] ?? '0', 10);

  // tipoCmp: C=11, B=6, A=1, Ticket=83
  const tipoCmpMap: Record<string, number> = { A: 1, B: 6, C: 11 };
  const tipoCmp = tipoCmpMap[tipo.toUpperCase()] ?? 83;

  // Datos del receptor
  const tipoDocRec = data.customerDocType ?? 99;
  const nroDocRec = data.customerDoc ?? 0;

  // CUIT del emisor como número (sacar guiones)
  const cuitNum = parseInt(data.cuit.replace(/-/g, ''), 10);
  const caeNum = parseInt(data.cae, 10);

  // Fecha en formato YYYY-MM-DD
  const [day, month, year] = data.date.split('/');
  const fecha = `${year}-${month}-${day}`;

  const payload = {
    ver: 1,
    fecha,
    cuit: cuitNum,
    ptoVta,
    tipoCmp,
    nroCmp,
    importe: data.total,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec,
    nroDocRec,
    tipoCodAut: 'E',
    codAut: caeNum,
  };

  const base64url = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `https://www.afip.gob.ar/fe/qr/?p=${base64url}`;
}

export const printerService = new PrinterService();
