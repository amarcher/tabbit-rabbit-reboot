export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
];

const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'RWF', 'PYG',
]);

export function isZeroDecimalCurrency(currencyCode: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase());
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currencyCode: string): Intl.NumberFormat {
  const key = currencyCode.toUpperCase();
  let fmt = formatterCache.get(key);
  if (!fmt) {
    const isZero = isZeroDecimalCurrency(key);
    fmt = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: key,
      minimumFractionDigits: isZero ? 0 : 2,
      maximumFractionDigits: isZero ? 0 : 2,
    });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

const symbolCache = new Map<string, Intl.NumberFormat>();

/**
 * Format a smallest-unit amount (cents/yen/etc.) for display.
 * For USD, 1299 → "$12.99". For JPY, 1299 → "¥1,299".
 */
export function formatAmount(cents: number, currencyCode: string = 'USD'): string {
  const code = currencyCode.toUpperCase();
  const isZero = isZeroDecimalCurrency(code);
  const value = isZero ? cents : cents / 100;

  try {
    return getFormatter(code).format(value);
  } catch {
    // Fallback if currency code is unrecognized
    return isZero ? `${cents}` : `$${(cents / 100).toFixed(2)}`;
  }
}

/**
 * Parse a user-entered amount string into smallest currency unit.
 * For USD, "12.99" → 1299. For JPY, "1299" → 1299.
 */
export function parseAmount(input: string, currencyCode: string = 'USD'): number {
  const cleaned = input.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  if (isZeroDecimalCurrency(currencyCode)) {
    return Math.round(parsed);
  }
  return Math.round(parsed * 100);
}

/**
 * Get the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  try {
    let fmt = symbolCache.get(code);
    if (!fmt) {
      fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: code });
      symbolCache.set(code, fmt);
    }
    const parts = fmt.formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || currencyCode;
  } catch {
    return currencyCode;
  }
}

/**
 * Convert smallest-unit amount to a decimal number for payment URLs.
 * USD 1299 → 12.99, JPY 1299 → 1299.
 */
export function amountToDecimal(cents: number, currencyCode: string = 'USD'): number {
  if (isZeroDecimalCurrency(currencyCode)) return cents;
  return cents / 100;
}

/**
 * Get a placeholder string for the price input.
 */
export function getPricePlaceholder(currencyCode: string = 'USD'): string {
  if (isZeroDecimalCurrency(currencyCode)) {
    return getCurrencySymbol(currencyCode) + '0';
  }
  return getCurrencySymbol(currencyCode) + '0.00';
}

/**
 * Detect a reasonable default currency from the browser locale.
 */
export function detectCurrencyFromLocale(): string {
  try {
    const locale = navigator.language || 'en-US';
    const region = locale.split('-')[1]?.toUpperCase();
    const regionToCurrency: Record<string, string> = {
      US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
      JP: 'JPY', KR: 'KRW', CN: 'CNY', IN: 'INR', MX: 'MXN',
      BR: 'BRL', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
      SG: 'SGD', HK: 'HKD', TW: 'TWD', TH: 'THB',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
      PT: 'EUR', AT: 'EUR', BE: 'EUR', IE: 'EUR', FI: 'EUR',
      GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
      LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR',
    };
    return regionToCurrency[region || ''] || 'USD';
  } catch {
    return 'USD';
  }
}

interface DefaultTaxTip {
  tax: number;
  tip: number;
}

/**
 * Get locale-appropriate default tax and tip percentages.
 */
export function getDefaultTaxTip(currencyCode: string): DefaultTaxTip {
  switch (currencyCode.toUpperCase()) {
    case 'USD': return { tax: 7, tip: 18 };
    case 'CAD': return { tax: 13, tip: 15 };
    case 'GBP':
    case 'EUR':
    case 'CHF':
    case 'SEK':
    case 'NOK':
    case 'DKK':
      return { tax: 0, tip: 0 };
    case 'JPY': return { tax: 10, tip: 0 };
    case 'KRW': return { tax: 10, tip: 0 };
    case 'CNY': return { tax: 0, tip: 0 };
    case 'AUD':
    case 'NZD':
      return { tax: 10, tip: 0 };
    case 'INR': return { tax: 5, tip: 0 };
    case 'MXN': return { tax: 16, tip: 15 };
    case 'BRL': return { tax: 0, tip: 10 };
    default: return { tax: 0, tip: 0 };
  }
}

// Legacy aliases for backward compatibility during migration
export function formatCents(cents: number): string {
  return formatAmount(cents, 'USD');
}

export function parseDollars(dollars: string): number {
  return parseAmount(dollars, 'USD');
}
