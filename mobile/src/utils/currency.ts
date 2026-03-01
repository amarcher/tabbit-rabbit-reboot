import { REGION_TO_CURRENCY } from '@tabbit/shared';

// Re-export all shared currency utilities
export type { CurrencyInfo } from '@tabbit/shared';
export {
  CURRENCIES,
  isZeroDecimalCurrency,
  formatAmount,
  parseAmount,
  getCurrencySymbol,
  amountToDecimal,
  getPricePlaceholder,
  REGION_TO_CURRENCY,
  getDefaultTaxTip,
  formatCents,
  parseDollars,
} from '@tabbit/shared';

/**
 * Detect a reasonable default currency from the device locale.
 * Uses Intl API which is available in Hermes.
 */
export function detectCurrencyFromLocale(): string {
  try {
    const locales = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locales.split('-')[1]?.toUpperCase();
    return REGION_TO_CURRENCY[region || ''] || 'USD';
  } catch {
    return 'USD';
  }
}
