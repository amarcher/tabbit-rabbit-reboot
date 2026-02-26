import { receiptValueToPercent } from './anthropic';

describe('receiptValueToPercent', () => {
  // --- currency conversions ---
  it('converts a currency amount to a percentage of subtotal', () => {
    // $2.27 tax on $25.98 subtotal → 8.74%
    expect(receiptValueToPercent(2.27, 'currency', 25.98)).toBe(8.74);
  });

  it('converts a small currency amount accurately', () => {
    // $1 on $100 → 1%
    expect(receiptValueToPercent(1, 'currency', 100)).toBe(1);
  });

  it('rounds currency conversion to two decimal places', () => {
    // $1 on $3 → 33.33%
    expect(receiptValueToPercent(1, 'currency', 3)).toBe(33.33);
  });

  it('returns null for currency unit when subtotal is zero', () => {
    expect(receiptValueToPercent(5, 'currency', 0)).toBeNull();
  });

  it('returns null for currency unit when subtotal is negative', () => {
    expect(receiptValueToPercent(5, 'currency', -10)).toBeNull();
  });

  it('returns null for currency unit when subtotal is undefined', () => {
    expect(receiptValueToPercent(5, 'currency', undefined)).toBeNull();
  });

  // --- percent pass-through ---
  it('passes through a percent value as-is', () => {
    expect(receiptValueToPercent(18, 'percent', 50)).toBe(18);
  });

  it('passes through percent even without a subtotal', () => {
    expect(receiptValueToPercent(8.25, 'percent', undefined)).toBe(8.25);
  });

  // --- default (unit undefined) → treated as percent ---
  it('defaults to percent when unit is undefined', () => {
    expect(receiptValueToPercent(20, undefined, 100)).toBe(20);
  });

  it('defaults to percent and ignores subtotal', () => {
    expect(receiptValueToPercent(7.5, undefined, undefined)).toBe(7.5);
  });

  // --- explicit zero → passed through (not treated as absent) ---
  it('returns 0 when value is explicitly 0 with percent unit', () => {
    expect(receiptValueToPercent(0, 'percent', 100)).toBe(0);
  });

  it('returns 0 when value is explicitly 0 with currency unit', () => {
    expect(receiptValueToPercent(0, 'currency', 100)).toBe(0);
  });

  // --- absent value → null ---
  it('returns null when value is undefined', () => {
    expect(receiptValueToPercent(undefined, 'currency', 100)).toBeNull();
  });

  // --- negative values → null ---
  it('returns null when value is negative', () => {
    expect(receiptValueToPercent(-3, 'currency', 100)).toBeNull();
  });

  it('returns null when value is negative with percent unit', () => {
    expect(receiptValueToPercent(-5, 'percent', 100)).toBeNull();
  });

  // --- NaN → null ---
  it('returns null when value is NaN', () => {
    expect(receiptValueToPercent(NaN, 'currency', 100)).toBeNull();
  });

  it('returns null when value is NaN with percent unit', () => {
    expect(receiptValueToPercent(NaN, 'percent', 100)).toBeNull();
  });

  // --- NaN subtotal with currency unit → null ---
  it('returns null when subtotal is NaN with currency unit', () => {
    expect(receiptValueToPercent(5, 'currency', NaN)).toBeNull();
  });

  // --- large ratio (no upper-bound clamp) ---
  it('handles a large currency-to-subtotal ratio', () => {
    // $500 on $10 subtotal → 5000%
    expect(receiptValueToPercent(500, 'currency', 10)).toBe(5000);
  });

  // --- unrecognized unit → treated as percent (default branch) ---
  it('treats an unrecognized unit as percent', () => {
    expect(receiptValueToPercent(8.25, 'dollars' as any, 100)).toBe(8.25);
  });
});
