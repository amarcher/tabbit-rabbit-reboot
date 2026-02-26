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
    const { image_base64, media_type } = req.body;

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
                // KEEP IN SYNC with src/utils/anthropic.ts
                text: 'Extract all line items with prices from this receipt image. Return ONLY valid JSON with this exact structure: { "items": [{ "description": "Item name", "price": 12.99 }], "subtotal": 25.98, "tax": 8.25, "tax_unit": "percent", "tip": 5.00, "tip_unit": "currency", "total": 33.25 }. Prices should be numbers (dollars, not cents). tax and tip can be either dollar amounts (unit: "currency") or percentages (unit: "percent") — set the unit to match what the receipt shows. If both a dollar amount and a percentage are shown, prefer the percentage. If tax or tip is not on the receipt, omit them. Do not include tax or tip as line items. If you cannot read an item, skip it.',
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
