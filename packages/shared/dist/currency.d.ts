export interface CurrencyInfo {
    code: string;
    symbol: string;
    name: string;
}
export declare const CURRENCIES: CurrencyInfo[];
export declare function isZeroDecimalCurrency(currencyCode: string): boolean;
/**
 * Format a smallest-unit amount (cents/yen/etc.) for display.
 * For USD, 1299 → "$12.99". For JPY, 1299 → "¥1,299".
 */
export declare function formatAmount(cents: number, currencyCode?: string): string;
/**
 * Parse a user-entered amount string into smallest currency unit.
 * For USD, "12.99" → 1299. For JPY, "1299" → 1299.
 */
export declare function parseAmount(input: string, currencyCode?: string): number;
/**
 * Get the currency symbol for a given currency code.
 */
export declare function getCurrencySymbol(currencyCode: string): string;
/**
 * Convert smallest-unit amount to a decimal number for payment URLs.
 * USD 1299 → 12.99, JPY 1299 → 1299.
 */
export declare function amountToDecimal(cents: number, currencyCode?: string): number;
/**
 * Get a placeholder string for the price input.
 */
export declare function getPricePlaceholder(currencyCode?: string): string;
/**
 * Region-to-currency mapping shared between platforms.
 * Used by platform-specific detectCurrencyFromLocale() implementations.
 */
export declare const REGION_TO_CURRENCY: Record<string, string>;
interface DefaultTaxTip {
    tax: number;
    tip: number;
}
/**
 * Get locale-appropriate default tax and tip percentages.
 */
export declare function getDefaultTaxTip(currencyCode: string): DefaultTaxTip;
export declare function formatCents(cents: number): string;
export declare function parseDollars(dollars: string): number;
export {};
//# sourceMappingURL=currency.d.ts.map