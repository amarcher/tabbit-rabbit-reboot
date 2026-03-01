/**
 * Parsed receipt from Claude vision OCR.
 *
 * - `items` — line items, each with a `description` and `price` in dollars.
 * - `subtotal` — sum of item prices before tax/tip (used as the denominator
 *   when converting currency amounts to percentages).
 * - `total` — receipt grand total (informational, not used in calculations).
 *
 * `tax` and `tip` are optional — omitted when not present on the receipt.
 * Each carries a companion `_unit` field ("currency" | "percent") that
 * indicates how the value should be interpreted:
 *   - "currency" — a dollar amount (e.g. 2.27 means $2.27)
 *   - "percent"  — a percentage   (e.g. 8.25 means 8.25%)
 *
 * When `_unit` is omitted, consumers should default to "percent".
 * Use {@link receiptValueToPercent} to normalize either form.
 */
export interface ReceiptResult {
  items: { description: string; price: number }[];
  subtotal?: number;
  tax?: number;
  tax_unit?: 'currency' | 'percent';
  tip?: number;
  tip_unit?: 'currency' | 'percent';
  total?: number;
  currency_code?: string;
}

/**
 * Normalize a receipt tax/tip value to a percentage.
 *
 * - Returns null if value is undefined, NaN, or negative.
 * - unit "currency": divides by subtotal → percentage (rounded to 2 decimals).
 *   Returns null if subtotal is missing or non-positive.
 * - unit "percent" (or undefined): returns the value as-is.
 * - Unrecognized unit values are treated as "percent" (the default).
 *
 * A value of 0 is passed through (returns 0), allowing explicit "0% tax" from
 * receipts. Consumers can check for null to distinguish "not present" from "0%".
 */
// KEEP IN SYNC with src/utils/anthropic.ts (web)
export function receiptValueToPercent(
  value: number | undefined,
  unit: 'currency' | 'percent' | undefined,
  subtotal: number | undefined
): number | null {
  if (value == null || isNaN(value) || value < 0) return null;
  if (unit === 'currency') {
    if (!subtotal || subtotal <= 0) return null;
    return Math.round((value / subtotal) * 10000) / 100;
  }
  // default to percent
  return value;
}
