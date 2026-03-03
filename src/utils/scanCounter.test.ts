import { getScanCount, canScanFree, incrementScanCount, remainingFreeScans, FREE_SCAN_LIMIT } from './scanCounter';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

describe('getScanCount', () => {
  it('returns 0 for fresh state', () => {
    expect(getScanCount()).toBe(0);
  });

  it('returns stored count for current month', () => {
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    localStorageMock.setItem('tabbitrabbit:scanCounter', JSON.stringify({ month, count: 5 }));
    expect(getScanCount()).toBe(5);
  });

  it('returns 0 for stale month', () => {
    localStorageMock.setItem('tabbitrabbit:scanCounter', JSON.stringify({ month: '2020-01', count: 8 }));
    expect(getScanCount()).toBe(0);
  });
});

describe('canScanFree', () => {
  it('returns true when under limit', () => {
    expect(canScanFree()).toBe(true);
  });

  it('returns false at limit', () => {
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    localStorageMock.setItem('tabbitrabbit:scanCounter', JSON.stringify({ month, count: FREE_SCAN_LIMIT }));
    expect(canScanFree()).toBe(false);
  });

  it('returns false when over limit', () => {
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    localStorageMock.setItem('tabbitrabbit:scanCounter', JSON.stringify({ month, count: FREE_SCAN_LIMIT + 1 }));
    expect(canScanFree()).toBe(false);
  });
});

describe('incrementScanCount', () => {
  it('increments from 0 and persists', () => {
    const count = incrementScanCount();
    expect(count).toBe(1);
    expect(getScanCount()).toBe(1);
  });

  it('increments existing count', () => {
    incrementScanCount();
    incrementScanCount();
    expect(getScanCount()).toBe(2);
  });
});

describe('remainingFreeScans', () => {
  it('returns full limit for fresh state', () => {
    expect(remainingFreeScans()).toBe(FREE_SCAN_LIMIT);
  });

  it('returns correct remaining after some scans', () => {
    incrementScanCount();
    incrementScanCount();
    incrementScanCount();
    expect(remainingFreeScans()).toBe(FREE_SCAN_LIMIT - 3);
  });

  it('returns 0 when at limit', () => {
    for (let i = 0; i < FREE_SCAN_LIMIT; i++) incrementScanCount();
    expect(remainingFreeScans()).toBe(0);
  });

  it('never returns negative', () => {
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    localStorageMock.setItem('tabbitrabbit:scanCounter', JSON.stringify({ month, count: FREE_SCAN_LIMIT + 5 }));
    expect(remainingFreeScans()).toBe(0);
  });
});
