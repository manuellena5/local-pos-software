import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── vi.hoisted: mocks que pueden ser referenciados dentro de vi.mock factories ─
const mocks = vi.hoisted(() => ({
  execSync:             vi.fn(),
  isPrinterConnected:   vi.fn(),
  execute:              vi.fn(),
  readFileSync:         vi.fn().mockReturnValue(Buffer.from([0x1b, 0x40])),
  writeFileSync:        vi.fn(),
  unlinkSync:           vi.fn(),
  existsSync:           vi.fn().mockReturnValue(false),
}));

// ── vi.mock factories (hoisted automáticamente por Vitest) ───────────────────
vi.mock('child_process', () => ({
  default: { execSync: mocks.execSync },
  execSync: mocks.execSync,
}));

vi.mock('node-thermal-printer', () => ({
  ThermalPrinter: vi.fn().mockImplementation(() => ({
    isPrinterConnected: mocks.isPrinterConnected,
    execute:            mocks.execute,
    println:    vi.fn(), drawLine: vi.fn(), alignCenter: vi.fn(),
    newLine:    vi.fn(), cut:      vi.fn(), clear:       vi.fn(),
  })),
  PrinterTypes: { EPSON: 'epson' },
  CharacterSet: { PC858_EURO: 'PC858_EURO' },
}));

vi.mock('fs', () => ({
  default: {
    existsSync:    mocks.existsSync,
    readFileSync:  mocks.readFileSync,
    writeFileSync: mocks.writeFileSync,
    unlinkSync:    mocks.unlinkSync,
  },
  existsSync:    mocks.existsSync,
  readFileSync:  mocks.readFileSync,
  writeFileSync: mocks.writeFileSync,
  unlinkSync:    mocks.unlinkSync,
}));

// ── Importar singleton después de los mocks ───────────────────────────────────
const { printerService } = await import('../../server/core/services/PrinterService');
const { ThermalPrinter: MockThermalPrinter } = await import('node-thermal-printer');

// ── Helpers ───────────────────────────────────────────────────────────────────
const WMIC_ONLINE  = 'Node,Name,WorkOffline\nOZARG094,POS-80-Series,FALSE\n';
const WMIC_OFFLINE = 'Node,Name,WorkOffline\nOZARG094,POS-80-Series,TRUE\n';
const WMIC_EMPTY   = 'Node,Name,WorkOffline\n';
const WMIC_NAMES   = 'Node,Name\nOZARG094,POS-80-Series\nOZARG094,HP DeskJet 2700 series\n';

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('PrinterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    printerService.disconnect();
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    // Defaults razonables para cada test
    mocks.execSync.mockReturnValue(WMIC_ONLINE);
    mocks.readFileSync.mockReturnValue(Buffer.from([0x1b, 0x40]));
    mocks.execute.mockResolvedValue(undefined);
  });

  // ── getStatus ──────────────────────────────────────────────────────────────
  describe('getStatus', () => {
    it('should return disconnected when no connection has been established', () => {
      expect(printerService.getStatus()).toBe('disconnected');
    });
  });

  // ── connect — Linux/network (ThermalPrinter) ──────────────────────────────
  describe('connect — Linux/network path (ThermalPrinter)', () => {
    it('should return success when printer is reachable via Linux USB', async () => {
      mocks.isPrinterConnected.mockResolvedValue(true);
      const result = await printerService.connect({ type: 'usb', portPath: '/dev/usb/lp0' });
      expect(result.success).toBe(true);
      expect(printerService.getStatus()).toBe('connected');
    });

    it('should return failure when isPrinterConnected returns false', async () => {
      mocks.isPrinterConnected.mockResolvedValue(false);
      const result = await printerService.connect({ type: 'usb', portPath: '/dev/usb/lp0' });
      expect(result.success).toBe(false);
      expect(printerService.getStatus()).toBe('error');
    });

    it('should return failure when ThermalPrinter throws during connect', async () => {
      mocks.isPrinterConnected.mockRejectedValue(new Error('Device not found'));
      const result = await printerService.connect({ type: 'usb', portPath: '/dev/usb/lp0' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Device not found');
    });

    it('should use tcp:// interface for network connection', async () => {
      mocks.isPrinterConnected.mockResolvedValue(true);
      vi.mocked(MockThermalPrinter).mockClear();
      await printerService.connect({ type: 'network', host: '192.168.1.100', port: 9100 });
      expect(MockThermalPrinter).toHaveBeenCalledWith(
        expect.objectContaining({ interface: 'tcp://192.168.1.100:9100' }),
      );
    });
  });

  // ── connect — Windows USB (wmic) ───────────────────────────────────────────
  describe('connect — Windows USB path (wmic)', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    });

    it('should return success when printer exists and is online in Windows', async () => {
      mocks.execSync.mockReturnValue(WMIC_ONLINE);
      const result = await printerService.connect({ type: 'usb', portPath: 'POS-80-Series' });
      expect(result.success).toBe(true);
      expect(printerService.getStatus()).toBe('connected');
    });

    it('should NOT create a ThermalPrinter instance for Windows USB', async () => {
      mocks.execSync.mockReturnValue(WMIC_ONLINE);
      vi.mocked(MockThermalPrinter).mockClear();
      await printerService.connect({ type: 'usb', portPath: 'POS-80-Series' });
      expect(MockThermalPrinter).not.toHaveBeenCalled();
    });

    it('should return failure when printer is in offline mode (WorkOffline=TRUE)', async () => {
      mocks.execSync.mockReturnValue(WMIC_OFFLINE);
      const result = await printerService.connect({ type: 'usb', portPath: 'POS-80-Series' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/offline/i);
    });

    it('should return failure when printer is not found in Windows', async () => {
      mocks.execSync.mockReturnValue(WMIC_EMPTY);
      const result = await printerService.connect({ type: 'usb', portPath: 'UnknownPrinter' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no encontrada/i);
    });

    it('should return failure when portPath is empty', async () => {
      const result = await printerService.connect({ type: 'usb', portPath: '' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/requerido/i);
    });

    it('should return failure when wmic command throws', async () => {
      mocks.execSync.mockImplementation(() => { throw new Error('wmic error'); });
      const result = await printerService.connect({ type: 'usb', portPath: 'POS-80-Series' });
      expect(result.success).toBe(false);
    });
  });

  // ── testPrint ──────────────────────────────────────────────────────────────
  describe('testPrint', () => {
    it('should return error when printer is not connected', async () => {
      const result = await printerService.testPrint();
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should call ThermalPrinter.execute() when connected on Linux', async () => {
      mocks.isPrinterConnected.mockResolvedValue(true);
      await printerService.connect({ type: 'usb', portPath: '/dev/usb/lp0' });
      mocks.execute.mockClear();
      const result = await printerService.testPrint();
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalled();
    });

    it('should call PowerShell (execSync) for Windows USB testPrint', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      mocks.execSync.mockReturnValue(WMIC_ONLINE);
      await printerService.connect({ type: 'usb', portPath: 'POS-80-Series' });
      mocks.execSync.mockReturnValue('OK');
      const result = await printerService.testPrint();
      expect(result.success).toBe(true);
      const psCalls = mocks.execSync.mock.calls.filter(
        (c) => typeof c[0] === 'string' && (c[0] as string).toLowerCase().includes('powershell'),
      );
      expect(psCalls.length).toBeGreaterThan(0);
    });

    it('should return error without crashing when Linux print throws', async () => {
      mocks.isPrinterConnected.mockResolvedValue(true);
      await printerService.connect({ type: 'usb', portPath: '/dev/usb/lp0' });
      mocks.execute.mockRejectedValue(new Error('Print queue full'));
      const result = await printerService.testPrint();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Print queue full');
    });
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  describe('disconnect', () => {
    it('should set status to disconnected after a successful connection', async () => {
      mocks.isPrinterConnected.mockResolvedValue(true);
      await printerService.connect({ type: 'usb', portPath: '/dev/usb/lp0' });
      expect(printerService.getStatus()).toBe('connected');
      printerService.disconnect();
      expect(printerService.getStatus()).toBe('disconnected');
    });
  });

  // ── detectPorts ────────────────────────────────────────────────────────────
  describe('detectPorts', () => {
    it('should return Windows printer names from wmic output', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      mocks.execSync.mockReturnValue(WMIC_NAMES);
      const ports = await printerService.detectPorts();
      expect(ports).toContain('POS-80-Series');
      expect(ports).toContain('HP DeskJet 2700 series');
    });

    it('should return empty array when wmic throws on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      mocks.execSync.mockImplementation(() => { throw new Error('wmic failed'); });
      const ports = await printerService.detectPorts();
      expect(ports).toEqual([]);
    });
  });
});
