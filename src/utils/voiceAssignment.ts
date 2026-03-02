import type { Item, Rabbit, ItemRabbit } from '../types';

export interface VoiceAssignmentResult {
  assignments: { item_id: string; rabbit_id: string; share: number }[];
  warnings: string[];
}

interface VoiceAssignmentRequest {
  transcript: string;
  items: { id: string; description: string; price_cents: number }[];
  rabbits: { id: string; name: string }[];
  existing_assignments: { item_id: string; rabbit_id: string; share?: number }[];
}

// KEEP IN SYNC with api/parse-voice-assignment.js buildPrompt()
function buildPrompt(req: VoiceAssignmentRequest): string {
  const itemList = req.items
    .map((item) => `  - id="${item.id}" "${item.description}" ($${(item.price_cents / 100).toFixed(2)})`)
    .join('\n');

  const rabbitList = req.rabbits
    .map((r) => `  - id="${r.id}" "${r.name}"`)
    .join('\n');

  const existingList = req.existing_assignments.length > 0
    ? req.existing_assignments
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

USER SAID: "${req.transcript}"

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

/** BYOK: Direct Anthropic API call from browser */
export async function parseVoiceAssignmentDirect(
  apiKey: string,
  transcript: string,
  items: Item[],
  rabbits: Rabbit[],
  assignments: ItemRabbit[],
): Promise<VoiceAssignmentResult> {
  const req: VoiceAssignmentRequest = {
    transcript,
    items: items.map((i) => ({ id: i.id, description: i.description, price_cents: i.price_cents })),
    rabbits: rabbits.map((r) => ({ id: r.id, name: r.name })),
    existing_assignments: assignments,
  };

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
        { role: 'user', content: buildPrompt(req) },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `API error (${response.status})`);
  }

  const content = data.content?.[0]?.text;
  if (!content) throw new Error('No response from model');

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

/** Free tier: POST to Vercel serverless proxy */
export async function parseVoiceAssignmentFree(
  transcript: string,
  items: Item[],
  rabbits: Rabbit[],
  assignments: ItemRabbit[],
): Promise<VoiceAssignmentResult> {
  const response = await fetch('/api/parse-voice-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      items: items.map((i) => ({ id: i.id, description: i.description, price_cents: i.price_cents })),
      rabbits: rabbits.map((r) => ({ id: r.id, name: r.name })),
      existing_assignments: assignments,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error (${response.status})`);
  }

  return response.json();
}
