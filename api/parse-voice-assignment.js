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
    const { transcript, items, rabbits, existing_assignments } = req.body;

    if (!transcript || !items || !rabbits) {
      return res.status(400).json({ error: 'transcript, items, and rabbits are required' });
    }

    const prompt = buildPrompt(transcript, items, rabbits, existing_assignments || []);

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
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: 'Anthropic API error', details: data });
    }

    const content = data.content && data.content[0] && data.content[0].text;
    if (!content) {
      return res.status(500).json({ error: 'No response from model', details: data });
    }

    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// KEEP IN SYNC with src/utils/voiceAssignment.ts buildVoiceAssignmentPrompt()
function buildPrompt(transcript, items, rabbits, existingAssignments) {
  const itemList = items
    .map((item) => `  - id="${item.id}" "${item.description}" ($${(item.price_cents / 100).toFixed(2)})`)
    .join('\n');

  const rabbitList = rabbits
    .map((r) => `  - id="${r.id}" "${r.name}"`)
    .join('\n');

  const existingList = existingAssignments.length > 0
    ? existingAssignments
        .map((a) => `  - item="${a.item_id}" → rabbit="${a.rabbit_id}" share=${a.share ?? 1}`)
        .join('\n')
    : '  (none)';

  return `You are a bill-splitting assistant. A user just spoke aloud who had what from a restaurant bill. Match their words to the items and people below.

ITEMS on the bill:
${itemList}

PEOPLE at the table:
${rabbitList}

EXISTING ASSIGNMENTS:
${existingList}

USER SAID: "${transcript}"

Return ONLY valid JSON with this exact structure:
{
  "assignments": [
    { "item_id": "abc123", "rabbit_id": "r1", "share": 1 }
  ],
  "warnings": []
}

Rules:
1. Match items by fuzzy name matching — "soup" matches "Tomato Soup", "sandwich" matches "Turkey Club Sandwich", etc.
2. Match people by fuzzy name matching — "Tav" or "Otavio" both match a person named "Otavio".
3. Parse fractional assignments: "half" = share of 1 when there are 2 people splitting, "a third" = share of 1 when 3 people splitting, "two thirds" = share of 2 when someone else has share of 1. Use the simplest integer shares that produce the right ratio.
4. If the user says someone "had" an item without specifying a fraction, use share=1 (full assignment).
5. If the user says "everyone had the appetizer" or "split the nachos", assign to ALL people with share=1 each.
6. Only return NEW assignments. Do not repeat existing assignments unless the share is changing.
7. If you cannot match an item or person, add a warning string to the "warnings" array explaining what couldn't be matched.
8. share must always be a positive integer.
9. If multiple items could match (e.g., two items with "chicken"), pick the best match. If truly ambiguous, add a warning.`;
}
