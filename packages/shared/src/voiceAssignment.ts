export interface VoiceAssignmentRequest {
  transcript: string;
  items: { id: string; description: string; price_cents: number }[];
  rabbits: { id: string; name: string }[];
  existing_assignments: { item_id: string; rabbit_id: string; share?: number }[];
}

export interface VoiceAssignmentResult {
  assignments: { item_id: string; rabbit_id: string; share: number }[];
  warnings: string[];
}

export function buildVoiceAssignmentPrompt(req: VoiceAssignmentRequest): string {
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

export function validateVoiceAssignmentResult(raw: unknown): VoiceAssignmentResult {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid response structure');
  const obj = raw as Record<string, unknown>;
  const assignments = Array.isArray(obj.assignments) ? obj.assignments : [];
  const warnings = Array.isArray(obj.warnings)
    ? obj.warnings.filter((w): w is string => typeof w === 'string')
    : [];

  return {
    assignments: assignments
      .filter((a: any) => typeof a?.item_id === 'string' && typeof a?.rabbit_id === 'string')
      .map((a: any) => ({
        item_id: a.item_id,
        rabbit_id: a.rabbit_id,
        share: typeof a.share === 'number' && a.share > 0 ? Math.max(1, Math.round(a.share)) : 1,
      })),
    warnings,
  };
}
