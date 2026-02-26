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
// KEEP IN SYNC with mobile/src/utils/anthropic.ts
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

// KEEP IN SYNC with api/parse-receipt.js
const RECEIPT_PROMPT =
  'Extract all line items with prices from this receipt image. Return ONLY valid JSON with this exact structure: { "items": [{ "description": "Item name", "price": 12.99 }], "subtotal": 25.98, "tax": 8.25, "tax_unit": "percent", "tip": 5.00, "tip_unit": "currency", "total": 33.25 }. Prices should be numbers (dollars, not cents). tax and tip can be either dollar amounts (unit: "currency") or percentages (unit: "percent") — set the unit to match what the receipt shows. If both a dollar amount and a percentage are shown, prefer the percentage. If tax or tip is not on the receipt, omit them. Do not include tax or tip as line items. If you cannot read an item, skip it.';

export async function scanReceiptDirect(
  apiKey: string,
  imageBase64: string,
  mediaType: string
): Promise<ReceiptResult> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const normalizedType = allowedTypes.includes(mediaType) ? mediaType : 'image/jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: normalizedType,
                data: imageBase64,
              },
            },
            { type: 'text', text: RECEIPT_PROMPT },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || `API error (${response.status})`;
    throw new Error(msg);
  }

  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error('No response from vision model');
  }

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

const BYOK_KEY = 'tabbitrabbit:anthropicKey';

export function getStoredApiKey(): string | null {
  return localStorage.getItem(BYOK_KEY);
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(BYOK_KEY, key);
}

export function removeStoredApiKey(): void {
  localStorage.removeItem(BYOK_KEY);
}
