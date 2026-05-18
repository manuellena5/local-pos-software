import { calcMargin, calcPriceGross, calcPriceNet, calcPriceNetFromGross } from '../../src/core/products/types';

describe('Product pricing calculations', () => {
  describe('calcPriceNet', () => {
    it('calculates net price from cost and margin', () => {
      expect(calcPriceNet(100, 50)).toBe(150);
      expect(calcPriceNet(200, 0)).toBe(200);
      expect(calcPriceNet(100, 100)).toBe(200);
    });
  });

  describe('calcPriceGross', () => {
    it('adds tax rate to net price', () => {
      expect(calcPriceGross(100, 21)).toBeCloseTo(121);
      expect(calcPriceGross(100, 0)).toBe(100);
      expect(calcPriceGross(100, 10.5)).toBeCloseTo(110.5);
    });
  });

  describe('calcMargin', () => {
    it('calculates margin percentage over cost', () => {
      expect(calcMargin(100, 150)).toBeCloseTo(50);
      expect(calcMargin(100, 100)).toBe(0);
      expect(calcMargin(0, 150)).toBe(0);
    });

    it('returns 0 for zero cost', () => {
      expect(calcMargin(0, 100)).toBe(0);
    });
  });

  describe('calcPriceNetFromGross', () => {
    it('strips tax from gross price', () => {
      expect(calcPriceNetFromGross(121, 21)).toBeCloseTo(100);
      expect(calcPriceNetFromGross(100, 0)).toBe(100);
      expect(calcPriceNetFromGross(110.5, 10.5)).toBeCloseTo(100);
    });
  });

  describe('bidirectional consistency', () => {
    it('cost → margin → net → gross → net round-trips correctly', () => {
      const cost = 500;
      const margin = 40;
      const taxRate = 21;
      const net   = calcPriceNet(cost, margin);
      const gross = calcPriceGross(net, taxRate);
      const backNet = calcPriceNetFromGross(gross, taxRate);
      expect(backNet).toBeCloseTo(net, 5);
    });
  });
});
