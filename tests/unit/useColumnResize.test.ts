import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnResize, DEFAULT_WIDTHS, loadWidths } from '../../src/core/products/hooks/useColumnResize';

beforeEach(() => { localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

describe('useColumnResize', () => {
  describe('getWidth', () => {
    it('returns default width when nothing stored', () => {
      const { result } = renderHook(() => useColumnResize());
      expect(result.current.getWidth('name')).toBe(DEFAULT_WIDTHS.name);
      expect(result.current.getWidth('stock')).toBe(DEFAULT_WIDTHS.stock);
    });

    it('returns stored width from localStorage', () => {
      localStorage.setItem('localpos.products.colwidths', JSON.stringify({ name: 350 }));
      const { result } = renderHook(() => useColumnResize());
      expect(result.current.getWidth('name')).toBe(350);
    });

    it('falls back to 100 for unknown columns', () => {
      const { result } = renderHook(() => useColumnResize());
      // @ts-expect-error — columna inexistente a propósito
      expect(result.current.getWidth('nonexistent')).toBe(100);
    });
  });

  describe('setWidth', () => {
    it('updates width immediately', () => {
      const { result } = renderHook(() => useColumnResize());

      act(() => { result.current.setWidth('name', 300); });

      expect(result.current.getWidth('name')).toBe(300);
    });

    it('does not persist until commit() is called', () => {
      const { result } = renderHook(() => useColumnResize());

      act(() => { result.current.setWidth('name', 300); });

      expect(localStorage.getItem('localpos.products.colwidths')).toBeNull();
    });

    it('updates multiple columns independently', () => {
      const { result } = renderHook(() => useColumnResize());

      act(() => {
        result.current.setWidth('name', 300);
        result.current.setWidth('stock', 130);
      });

      expect(result.current.getWidth('name')).toBe(300);
      expect(result.current.getWidth('stock')).toBe(130);
    });
  });

  describe('commit', () => {
    it('persists current widths to localStorage', () => {
      const { result } = renderHook(() => useColumnResize());

      act(() => { result.current.setWidth('category', 170); });
      act(() => { result.current.commit(); });

      const stored = loadWidths();
      expect(stored.category).toBe(170);
    });

    it('persists all changed widths together', () => {
      const { result } = renderHook(() => useColumnResize());

      act(() => {
        result.current.setWidth('name', 250);
        result.current.setWidth('cost', 90);
      });
      act(() => { result.current.commit(); });

      const stored = loadWidths();
      expect(stored.name).toBe(250);
      expect(stored.cost).toBe(90);
    });
  });

  describe('drag simulation (setWidth + commit pattern)', () => {
    it('simulates drag right: startX=100, move to 150 → +50px', () => {
      const { result } = renderHook(() => useColumnResize());
      const startW = result.current.getWidth('name'); // 200
      const startX = 100;

      // simulate pointermove at clientX=150
      act(() => { result.current.setWidth('name', Math.max(50, startW + (150 - startX))); });

      expect(result.current.getWidth('name')).toBe(250);
    });

    it('simulates drag left: startX=300, move to 250 → -50px', () => {
      const { result } = renderHook(() => useColumnResize());
      const startW = result.current.getWidth('name'); // 200
      const startX = 300;

      act(() => { result.current.setWidth('name', Math.max(50, startW + (250 - startX))); });

      expect(result.current.getWidth('name')).toBe(150);
    });

    it('clamps to 50px minimum', () => {
      const { result } = renderHook(() => useColumnResize());
      const startW = result.current.getWidth('stock'); // 80
      const startX = 500;

      act(() => { result.current.setWidth('stock', Math.max(50, startW + (0 - startX))); });

      expect(result.current.getWidth('stock')).toBe(50);
    });

    it('full drag cycle: setWidth multiple times then commit persists last value', () => {
      const { result } = renderHook(() => useColumnResize());

      // Simulate multiple pointermove events during drag
      act(() => { result.current.setWidth('price', 130); });
      act(() => { result.current.setWidth('price', 145); });
      act(() => { result.current.setWidth('price', 160); });
      act(() => { result.current.commit(); });

      const stored = loadWidths();
      expect(stored.price).toBe(160);
      expect(result.current.getWidth('price')).toBe(160);
    });

    it('persists to localStorage and is available on next hook mount', () => {
      const { result: r1 } = renderHook(() => useColumnResize());

      act(() => { r1.current.setWidth('margin', 95); });
      act(() => { r1.current.commit(); });

      // New hook instance (simulates remount/page reload)
      const { result: r2 } = renderHook(() => useColumnResize());
      expect(r2.current.getWidth('margin')).toBe(95);
    });
  });
});
