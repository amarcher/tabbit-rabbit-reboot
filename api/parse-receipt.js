const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  try {
    const { image_base64, media_type, currency_code } = req.body;
    const currencyCode = currency_code || 'USD';
    const currencyName = currencyCode === 'USD' ? 'dollars' : currencyCode;

    if (!image_base64) {
      return res.status(400).json({ error: 'image_base64 is required' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const mediaType = allowedTypes.includes(media_type) ? media_type : 'image/jpeg';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
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
                  media_type: mediaType,
                  data: image_base64,
                },
              },
              {
                type: 'text',
                // KEEP IN SYNC with src/utils/anthropic.ts buildReceiptPrompt()
                text: `Extract line items from this receipt image. Return ONLY valid JSON: { "items": [{ "description": "Chicken Sandwich", "price": 12.99 }], "subtotal": 25.98, "tax": 9.5, "tax_unit": "percent", "tip": 4.00, "tip_unit": "currency", "total": 31.45, "currency_code": "${currencyCode}" }. Rules: (1) Prices are in ${currencyName}, not smallest units. Each price is the line total — if "2 x Coffee $8.00", price is 8.00. (2) subtotal is the pre-tax/pre-tip sum regardless of label (may say "Food", "Merchandise", etc.). (3) Only include tax/tip if ACTUALLY CHARGED — ignore policy notices like "18% gratuity for parties of 8+", suggested tip options, or unselected tip lines. (4) Always pair tax with tax_unit and tip with tip_unit. Use "currency" for monetary amounts, "percent" for percentages. If both are shown (e.g. "Tax 8.5% $4.25"), return the percent value with tax_unit "percent". (5) Completely omit tax, tip, and total fields if not present — do not include them as null or 0. (6) Exclude tax, tip, discounts, and voided items from the items array. Skip unreadable items. (7) Set currency_code to the ISO 4217 code of the currency on the receipt (expected: ${currencyCode}). If the receipt is in a different currency, return that currency's code instead.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: 'Anthropic API error', details: data });
    }

    const content = data.content && data.content[0] && data.content[0].text;

    if (!content) {
      return res.status(500).json({ error: 'No response from vision model', details: data });
    }

    // Parse the JSON from the model response (strip markdown code fences if present)
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
