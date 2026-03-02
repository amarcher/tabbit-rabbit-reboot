import type { Item, Rabbit, ItemRabbit } from '../types';
import {
  buildVoiceAssignmentPrompt,
  validateVoiceAssignmentResult,
} from '@tabbit/shared';
import type { VoiceAssignmentRequest, VoiceAssignmentResult } from '@tabbit/shared';

export type { VoiceAssignmentRequest, VoiceAssignmentResult };

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
        { role: 'user', content: buildVoiceAssignmentPrompt(req) },
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
  return validateVoiceAssignmentResult(JSON.parse(jsonStr));
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

  const data = await response.json();
  return validateVoiceAssignmentResult(data);
}
