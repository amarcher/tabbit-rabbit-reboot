import {
  buildVoiceAssignmentPrompt,
  validateVoiceAssignmentResult,
} from '@tabbit/shared';
import type { VoiceAssignmentRequest } from '@tabbit/shared';

const baseRequest: VoiceAssignmentRequest = {
  transcript: 'Alice had the soup, Bob had the sandwich',
  items: [
    { id: 'i1', description: 'Tomato Soup', price_cents: 899 },
    { id: 'i2', description: 'Turkey Club Sandwich', price_cents: 1299 },
  ],
  rabbits: [
    { id: 'r1', name: 'Alice' },
    { id: 'r2', name: 'Bob' },
  ],
  existing_assignments: [],
};

describe('buildVoiceAssignmentPrompt', () => {
  it('includes all item IDs and descriptions', () => {
    const prompt = buildVoiceAssignmentPrompt(baseRequest);
    expect(prompt).toContain('id="i1"');
    expect(prompt).toContain('id="i2"');
    expect(prompt).toContain('Tomato Soup');
    expect(prompt).toContain('Turkey Club Sandwich');
  });

  it('includes all rabbit IDs and names', () => {
    const prompt = buildVoiceAssignmentPrompt(baseRequest);
    expect(prompt).toContain('id="r1"');
    expect(prompt).toContain('id="r2"');
    expect(prompt).toContain('"Alice"');
    expect(prompt).toContain('"Bob"');
  });

  it('formats item prices as dollars', () => {
    const prompt = buildVoiceAssignmentPrompt(baseRequest);
    expect(prompt).toContain('$8.99');
    expect(prompt).toContain('$12.99');
  });

  it('shows "(none)" when no existing assignments', () => {
    const prompt = buildVoiceAssignmentPrompt(baseRequest);
    expect(prompt).toContain('(none)');
  });

  it('formats existing assignments with share values', () => {
    const req: VoiceAssignmentRequest = {
      ...baseRequest,
      existing_assignments: [
        { item_id: 'i1', rabbit_id: 'r1', share: 2 },
      ],
    };
    const prompt = buildVoiceAssignmentPrompt(req);
    expect(prompt).toContain('item="i1"');
    expect(prompt).toContain('rabbit="r1"');
    expect(prompt).toContain('share=2');
    expect(prompt).not.toContain('(none)');
  });

  it('defaults share to 1 for existing assignments without share', () => {
    const req: VoiceAssignmentRequest = {
      ...baseRequest,
      existing_assignments: [
        { item_id: 'i1', rabbit_id: 'r1' },
      ],
    };
    const prompt = buildVoiceAssignmentPrompt(req);
    expect(prompt).toContain('share=1');
  });

  it('embeds transcript in USER SAID section', () => {
    const prompt = buildVoiceAssignmentPrompt(baseRequest);
    expect(prompt).toContain('USER SAID: "Alice had the soup, Bob had the sandwich"');
  });
});

describe('validateVoiceAssignmentResult', () => {
  it('returns valid assignments and warnings as-is', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1', share: 1 }],
      warnings: ['Could not match "fries"'],
    });
    expect(result.assignments).toEqual([{ item_id: 'i1', rabbit_id: 'r1', share: 1 }]);
    expect(result.warnings).toEqual(['Could not match "fries"']);
  });

  it('filters out assignments with missing item_id', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [
        { item_id: 'i1', rabbit_id: 'r1', share: 1 },
        { rabbit_id: 'r2', share: 1 },
      ],
      warnings: [],
    });
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].item_id).toBe('i1');
  });

  it('filters out assignments with missing rabbit_id', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [
        { item_id: 'i1', share: 1 },
        { item_id: 'i2', rabbit_id: 'r2', share: 1 },
      ],
      warnings: [],
    });
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].rabbit_id).toBe('r2');
  });

  it('clamps decimal share 0.5 to 1', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1', share: 0.5 }],
      warnings: [],
    });
    expect(result.assignments[0].share).toBe(1);
  });

  it('clamps decimal share 0.33 to 1', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1', share: 0.33 }],
      warnings: [],
    });
    expect(result.assignments[0].share).toBe(1);
  });

  it('rounds fractional share 1.7 to 2', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1', share: 1.7 }],
      warnings: [],
    });
    expect(result.assignments[0].share).toBe(2);
  });

  it('rounds fractional share 2.3 to 2', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1', share: 2.3 }],
      warnings: [],
    });
    expect(result.assignments[0].share).toBe(2);
  });

  it('ensures share is always >= 1', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1', share: 0.1 }],
      warnings: [],
    });
    expect(result.assignments[0].share).toBeGreaterThanOrEqual(1);
  });

  it('defaults missing share to 1', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1' }],
      warnings: [],
    });
    expect(result.assignments[0].share).toBe(1);
  });

  it('filters non-string warnings', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [],
      warnings: ['valid warning', 42, null, undefined, 'another warning'],
    });
    expect(result.warnings).toEqual(['valid warning', 'another warning']);
  });

  it('returns empty arrays when assignments/warnings are missing', () => {
    const result = validateVoiceAssignmentResult({});
    expect(result.assignments).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('throws on null input', () => {
    expect(() => validateVoiceAssignmentResult(null)).toThrow('Invalid response structure');
  });

  it('throws on string input', () => {
    expect(() => validateVoiceAssignmentResult('bad')).toThrow();
  });

  it('throws on undefined input', () => {
    expect(() => validateVoiceAssignmentResult(undefined)).toThrow('Invalid response structure');
  });

  it('handles negative share by defaulting to 1', () => {
    const result = validateVoiceAssignmentResult({
      assignments: [{ item_id: 'i1', rabbit_id: 'r1', share: -3 }],
      warnings: [],
    });
    expect(result.assignments[0].share).toBe(1);
  });
});
