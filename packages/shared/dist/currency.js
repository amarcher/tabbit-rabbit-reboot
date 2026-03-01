"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDollars = exports.formatCents = exports.getDefaultTaxTip = exports.REGION_TO_CURRENCY = exports.getPricePlaceholder = exports.amountToDecimal = exports.getCurrencySymbol = exports.parseAmount = exports.formatAmount = exports.isZeroDecimalCurrency = exports.CURRENCIES = void 0;
exports.CURRENCIES = [
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
function isZeroDecimalCurrency(currencyCode) {
    return ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase());
}
exports.isZeroDecimalCurrency = isZeroDecimalCurrency;
const formatterCache = new Map();
function getFormatter(currencyCode) {
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
const symbolCache = new Map();
/**
 * Format a smallest-unit amount (cents/yen/etc.) for display.
 * For USD, 1299 → "$12.99". For JPY, 1299 → "¥1,299".
 */
function formatAmount(cents, currencyCode = 'USD') {
    const code = currencyCode.toUpperCase();
    const isZero = isZeroDecimalCurrency(code);
    const value = isZero ? cents : cents / 100;
    try {
        return getFormatter(code).format(value);
    }
    catch (_a) {
        // Fallback if currency code is unrecognized
        return isZero ? `${cents}` : `$${(cents / 100).toFixed(2)}`;
    }
}
exports.formatAmount = formatAmount;
/**
 * Parse a user-entered amount string into smallest currency unit.
 * For USD, "12.99" → 1299. For JPY, "1299" → 1299.
 */
function parseAmount(input, currencyCode = 'USD') {
    const cleaned = input.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed))
        return 0;
    if (isZeroDecimalCurrency(currencyCode)) {
        return Math.round(parsed);
    }
    return Math.round(parsed * 100);
}
exports.parseAmount = parseAmount;
/**
 * Get the currency symbol for a given currency code.
 */
function getCurrencySymbol(currencyCode) {
    var _a;
    const code = currencyCode.toUpperCase();
    try {
        let fmt = symbolCache.get(code);
        if (!fmt) {
            fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: code });
            symbolCache.set(code, fmt);
        }
        const parts = fmt.formatToParts(0);
        return ((_a = parts.find((p) => p.type === 'currency')) === null || _a === void 0 ? void 0 : _a.value) || currencyCode;
    }
    catch (_b) {
        return currencyCode;
    }
}
exports.getCurrencySymbol = getCurrencySymbol;
/**
 * Convert smallest-unit amount to a decimal number for payment URLs.
 * USD 1299 → 12.99, JPY 1299 → 1299.
 */
function amountToDecimal(cents, currencyCode = 'USD') {
    if (isZeroDecimalCurrency(currencyCode))
        return cents;
    return cents / 100;
}
exports.amountToDecimal = amountToDecimal;
/**
 * Get a placeholder string for the price input.
 */
function getPricePlaceholder(currencyCode = 'USD') {
    if (isZeroDecimalCurrency(currencyCode)) {
        return getCurrencySymbol(currencyCode) + '0';
    }
    return getCurrencySymbol(currencyCode) + '0.00';
}
exports.getPricePlaceholder = getPricePlaceholder;
/**
 * Region-to-currency mapping shared between platforms.
 * Used by platform-specific detectCurrencyFromLocale() implementations.
 */
exports.REGION_TO_CURRENCY = {
    US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
    JP: 'JPY', KR: 'KRW', CN: 'CNY', IN: 'INR', MX: 'MXN',
    BR: 'BRL', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
    SG: 'SGD', HK: 'HKD', TW: 'TWD', TH: 'THB',
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
    PT: 'EUR', AT: 'EUR', BE: 'EUR', IE: 'EUR', FI: 'EUR',
    GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
    LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR',
};
/**
 * Get locale-appropriate default tax and tip percentages.
 */
function getDefaultTaxTip(currencyCode) {
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
exports.getDefaultTaxTip = getDefaultTaxTip;
// Legacy aliases for backward compatibility during migration
function formatCents(cents) {
    return formatAmount(cents, 'USD');
}
exports.formatCents = formatCents;
function parseDollars(dollars) {
    return parseAmount(dollars, 'USD');
}
exports.parseDollars = parseDollars;
