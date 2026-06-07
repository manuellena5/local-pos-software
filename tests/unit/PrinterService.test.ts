import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock node-thermal-printer antes de importar el service
const mockIsPrinterConnected = vi.fn();
const mockExecute = vi.fn();
const mockPrintln = vi.fn();
const mockDrawLine = vi.fn();
const mockAlignCenter = vi.fn();
const mockNewLine = vi.fn();
const mockCut = vi.fn();
const mockClear = vi.fn();

const MockThermalPrinter = vi.fn().mockImplementation(() => ({
  isPrinterConnected: mockIsPrinterConnected,
  execute: mockExecute,
  println: mockPrintln,
  drawLine: mockDrawLine,
  alignCenter: mockAlignCenter,
  newLine: mockNewLine,
  cut: mockCut,
  clear: mockClear,
}));

vi.mock('node-thermal-printer', () => ({
  ThermalPrinter: MockThermalPrinter,
  PrinterTypes: { EPSON: 'epson' },
  CharacterSet: { PC858_EURO: 'PC858_EURO' },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

// Importar después de los mocks
const { printerService } = await import('../../server/core/services/PrinterService');

describe('PrinterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetear estado interno del singleton
    printerService.disconnect();
  });

  describe('getStatus', () => {
    it('should return disconnected when no connection has been established', () => {
      expect(printerService.getStatus()).toBe('disconnected');
    });
  });

  describe('connect', () => {
    it('should return success when printer is reachable via USB', async () => {
      mockIsPrinterConnected.mockResolvedValue(true);
      const result = await printerService.connect({ type: 'usb', portPath: 'USB001' });
      expect(result.success).toBe(true);
      expect(printerService.getStatus()).toBe('connected');
    });

    it('should return failure when printer is not reachable', async () => {
      mockIsPrinterConnected.mockResolvedValue(false);
      const result = await printerService.connect({ type: 'usb', portPath: 'USB001' });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(printerService.getStatus()).toBe('error');
    });

    it('should return failure when printer throws during connect', async () => {
      mockIsPrinterConnected.mockRejectedValue(new Error('Device not found'));
      const result = await printerService.connect({ type: 'usb', portPath: 'USB001' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Device not found');
    });

    it('should return success for network connection type', async () => {
      mockIsPrinterConnected.mockResolvedValue(true);
      const result = await printerService.connect({ type: 'network', host: '192.168.1.100', port: 9100 });
      expect(result.success).toBe(true);
      expect(MockThermalPrinter).toHaveBeenCalledWith(
        expect.objectContaining({ interface: 'tcp://192.168.1.100:9100' }),
      );
    });
  });

  describe('testPrint', () => {
    it('should return error when printer is not connected', async () => {
      const result = await printerService.testPrint();
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should print test page when connected', async () => {
      mockIsPrinterConnected.mockResolvedValue(true);
      mockExecute.mockResolvedValue(undefined);
      await printerService.connect({ type: 'usb', portPath: 'USB001' });

      const result = await printerService.testPrint();
      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should not crash the server when execute throws', async () => {
      mockIsPrinterConnected.mockResolvedValue(true);
      mockExecute.mockRejectedValue(new Error('Print queue full'));
      await printerService.connect({ type: 'usb', portPath: 'USB001' });

      const result = await printerService.testPrint();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Print queue full');
      // El servicio no crashea — status pasa a disconnected
      expect(printerService.getStatus()).toBe('disconnected');
    });
  });

  describe('disconnect', () => {
    it('should set status to disconnected', async () => {
      mockIsPrinterConnected.mockResolvedValue(true);
      await printerService.connect({ type: 'usb', portPath: 'USB001' });
      expect(printerService.getStatus()).toBe('connected');

      printerService.disconnect();
      expect(printerService.getStatus()).toBe('disconnected');
    });
  });

  describe('detectPorts', () => {
    it('should return candidate USB ports on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      const ports = await printerService.detectPorts();
      expect(ports).toContain('USB001');
      expect(ports.length).toBeGreaterThan(0);
    });
  });
});
