import { encodeBill, decodeBill, isLegacyToken } from './billEncoder';

describe('encodeBill / decodeBill roundtrip', () => {
  const tab = { name: 'Dinner', tax_percent: 8, tip_percent: 20 };
  const items = [
    { id: 'item-a', description: 'Pizza', price_cents: 1500 },
    { id: 'item-b', description: 'Salad', price_cents: 800 },
  ];
  const rabbits = [
    { id: 'rabbit-1', name: 'Alice', color: 'success' },
    { id: 'rabbit-2', name: 'Bob', color: 'info' },
  ];
  const assignments = [
    { item_id: 'item-a', rabbit_id: 'rabbit-1' },
    { item_id: 'item-b', rabbit_id: 'rabbit-2' },
  ];
  const ownerProfile = {
    display_name: 'Alice',
    venmo_username: 'alice123',
    cashapp_cashtag: null,
    paypal_username: null,
  };

  it('roundtrips basic tab data', () => {
    const encoded = encodeBill(tab, items, rabbits, assignments, ownerProfile);
    const decoded = decodeBill(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.tab.name).toBe('Dinner');
    expect(decoded!.tab.tax_percent).toBe(8);
    expect(decoded!.tab.tip_percent).toBe(20);
    expect(decoded!.items).toHaveLength(2);
    expect(decoded!.items[0].description).toBe('Pizza');
    expect(decoded!.items[0].price_cents).toBe(1500);
    expect(decoded!.rabbits).toHaveLength(2);
    expect(decoded!.rabbits[0].name).toBe('Alice');
    expect(decoded!.assignments).toHaveLength(2);
  });

  it('preserves non-USD currency code', () => {
    const jpyTab = { ...tab, currency_code: 'JPY' };
    const encoded = encodeBill(jpyTab, items, rabbits, assignments, ownerProfile);
    const decoded = decodeBill(encoded);
    expect(decoded!.tab.currency_code).toBe('JPY');
  });

  it('defaults to USD when currency_code is omitted', () => {
    const encoded = encodeBill(tab, items, rabbits, assignments, ownerProfile);
    const decoded = decodeBill(encoded);
    expect(decoded!.tab.currency_code).toBe('USD');
  });

  it('preserves share values in assignments', () => {
    const sharedAssignments = [
      { item_id: 'item-a', rabbit_id: 'rabbit-1', share: 2 },
      { item_id: 'item-a', rabbit_id: 'rabbit-2', share: 1 },
    ];
    const encoded = encodeBill(tab, items, rabbits, sharedAssignments, ownerProfile);
    const decoded = decodeBill(encoded);
    expect(decoded!.assignments).toHaveLength(2);
    expect(decoded!.assignments.find(a => a.share === 2)).toBeTruthy();
  });

  it('omits share field when share is 1', () => {
    const encoded = encodeBill(tab, items, rabbits, assignments, ownerProfile);
    const decoded = decodeBill(encoded);
    decoded!.assignments.forEach(a => {
      expect(a.share).toBeUndefined();
    });
  });

  it('preserves owner profile', () => {
    const encoded = encodeBill(tab, items, rabbits, assignments, ownerProfile);
    const decoded = decodeBill(encoded);
    expect(decoded!.ownerProfile.display_name).toBe('Alice');
    expect(decoded!.ownerProfile.venmo_username).toBe('alice123');
    expect(decoded!.ownerProfile.cashapp_cashtag).toBeNull();
  });
});

describe('decodeBill', () => {
  it('returns null for invalid encoded string', () => {
    expect(decodeBill('not-valid-lz-string')).toBeNull();
  });
});

describe('isLegacyToken', () => {
  it('returns false for short token (6 chars)', () => {
    expect(isLegacyToken('abc123')).toBe(false);
  });

  it('returns true for long token (>20 chars)', () => {
    expect(isLegacyToken('a'.repeat(25))).toBe(true);
  });

  it('returns false for exactly 20 chars', () => {
    expect(isLegacyToken('a'.repeat(20))).toBe(false);
  });
});
