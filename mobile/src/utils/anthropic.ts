import * as SecureStore from 'expo-secure-store';

export interface ReceiptResult {
  items: { description: string; price: number }[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

const RECEIPT_PROMPT =
  'Extract all line items with prices from this receipt image. Return ONLY valid JSON with this exact structure: { "items": [{ "description": "Item name", "price": 12.99 }], "subtotal": 25.98, "tax": 2.27, "total": 28.25 }. Prices should be numbers (dollars, not cents). If you cannot read an item, skip it. Do not include tax or tip as line items.';

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

const BYOK_KEY = 'anthropicApiKey';

export async function getStoredApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(BYOK_KEY);
}

export async function setStoredApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(BYOK_KEY, key);
}

export async function removeStoredApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(BYOK_KEY);
}
