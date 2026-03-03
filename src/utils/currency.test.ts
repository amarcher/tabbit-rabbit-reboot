import {
  isZeroDecimalCurrency,
  formatAmount,
  parseAmount,
  amountToDecimal,
  getDefaultTaxTip,
  getCurrencySymbol,
  getPricePlaceholder,
  formatCents,
  parseDollars,
} from '@tabbit/shared';

// --- isZeroDecimalCurrency ---

describe('isZeroDecimalCurrency', () => {
  it('returns true for JPY', () => {
    expect(isZeroDecimalCurrency('JPY')).toBe(true);
  });

  it('returns true for KRW', () => {
    expect(isZeroDecimalCurrency('KRW')).toBe(true);
  });

  it('returns true for VND', () => {
    expect(isZeroDecimalCurrency('VND')).toBe(true);
  });

  it('returns false for USD', () => {
    expect(isZeroDecimalCurrency('USD')).toBe(false);
  });

  it('returns false for EUR', () => {
    expect(isZeroDecimalCurrency('EUR')).toBe(false);
  });

  it('returns false for GBP', () => {
    expect(isZeroDecimalCurrency('GBP')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isZeroDecimalCurrency('jpy')).toBe(true);
    expect(isZeroDecimalCurrency('Jpy')).toBe(true);
  });
});

// --- formatAmount ---

describe('formatAmount', () => {
  it('formats USD cents as dollars', () => {
    const result = formatAmount(1299, 'USD');
    expect(result).toContain('12.99');
  });

  it('formats JPY without decimals', () => {
    const result = formatAmount(1299, 'JPY');
    expect(result).toContain('1,299');
    expect(result).not.toContain('.');
  });

  it('formats zero cents', () => {
    const result = formatAmount(0, 'USD');
    expect(result).toContain('0.00');
  });

  it('formats negative values', () => {
    const result = formatAmount(-500, 'USD');
    expect(result).toContain('5.00');
  });

  it('defaults to USD when no currency provided', () => {
    const result = formatAmount(1299);
    expect(result).toContain('12.99');
  });

  it('handles unknown currency with fallback', () => {
    const result = formatAmount(1299, 'XYZ');
    // Should not throw — falls back to some string representation
    expect(typeof result).toBe('string');
  });
});

// --- parseAmount ---

describe('parseAmount', () => {
  it('parses USD string to cents', () => {
    expect(parseAmount('12.99', 'USD')).toBe(1299);
  });

  it('parses JPY string as whole units', () => {
    expect(parseAmount('1299', 'JPY')).toBe(1299);
  });

  it('handles comma as decimal separator', () => {
    expect(parseAmount('12,99', 'USD')).toBe(1299);
  });

  it('strips non-numeric characters', () => {
    expect(parseAmount('$12.99', 'USD')).toBe(1299);
  });

  it('returns 0 for empty string', () => {
    expect(parseAmount('', 'USD')).toBe(0);
  });

  it('returns 0 for NaN input', () => {
    expect(parseAmount('abc', 'USD')).toBe(0);
  });

  it('defaults to USD', () => {
    expect(parseAmount('10.00')).toBe(1000);
  });

  it('rounds to nearest cent for USD', () => {
    expect(parseAmount('12.999', 'USD')).toBe(1300);
  });
});

// --- amountToDecimal ---

describe('amountToDecimal', () => {
  it('converts USD cents to decimal', () => {
    expect(amountToDecimal(1299, 'USD')).toBe(12.99);
  });

  it('returns JPY amount as-is', () => {
    expect(amountToDecimal(1299, 'JPY')).toBe(1299);
  });

  it('converts zero', () => {
    expect(amountToDecimal(0, 'USD')).toBe(0);
  });

  it('defaults to USD', () => {
    expect(amountToDecimal(500)).toBe(5);
  });
});

// --- getDefaultTaxTip ---

describe('getDefaultTaxTip', () => {
  it('returns US defaults for USD', () => {
    expect(getDefaultTaxTip('USD')).toEqual({ tax: 7, tip: 18 });
  });

  it('returns zero tax/tip for EUR', () => {
    expect(getDefaultTaxTip('EUR')).toEqual({ tax: 0, tip: 0 });
  });

  it('returns Japanese defaults for JPY', () => {
    expect(getDefaultTaxTip('JPY')).toEqual({ tax: 10, tip: 0 });
  });

  it('returns Canadian defaults for CAD', () => {
    expect(getDefaultTaxTip('CAD')).toEqual({ tax: 13, tip: 15 });
  });

  it('returns zero for unknown currency', () => {
    expect(getDefaultTaxTip('XYZ')).toEqual({ tax: 0, tip: 0 });
  });

  it('is case insensitive', () => {
    expect(getDefaultTaxTip('usd')).toEqual({ tax: 7, tip: 18 });
  });
});

// --- getCurrencySymbol ---

describe('getCurrencySymbol', () => {
  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns a symbol for JPY', () => {
    const symbol = getCurrencySymbol('JPY');
    expect(symbol).toBeTruthy();
  });

  it('falls back to currency code for unknown', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

// --- getPricePlaceholder ---

describe('getPricePlaceholder', () => {
  it('returns placeholder with decimals for USD', () => {
    expect(getPricePlaceholder('USD')).toContain('0.00');
  });

  it('returns placeholder without decimals for JPY', () => {
    const placeholder = getPricePlaceholder('JPY');
    expect(placeholder).toContain('0');
    expect(placeholder).not.toContain('0.00');
  });

  it('defaults to USD', () => {
    expect(getPricePlaceholder()).toContain('0.00');
  });
});

// --- legacy aliases ---

describe('formatCents', () => {
  it('formats as USD', () => {
    expect(formatCents(1299)).toContain('12.99');
  });
});

describe('parseDollars', () => {
  it('parses as USD', () => {
    expect(parseDollars('12.99')).toBe(1299);
  });
});
