import { buildPaymentNote, buildChargeNote, cashAppLink, paypalLink } from './payments';

describe('buildPaymentNote', () => {
  it('formats a single item for one person', () => {
    const note = buildPaymentNote('Dinner', 'Alice', [
      { description: 'Pizza', splitCount: 1 },
    ]);
    expect(note).toBe('Dinner - Alice: Pizza');
  });

  it('formats multiple items', () => {
    const note = buildPaymentNote('Dinner', 'Alice', [
      { description: 'Pizza', splitCount: 1 },
      { description: 'Salad', splitCount: 1 },
    ]);
    expect(note).toBe('Dinner - Alice: Pizza, Salad');
  });

  it('shows split count for shared items', () => {
    const note = buildPaymentNote('Dinner', 'Alice', [
      { description: 'Nachos', splitCount: 3 },
    ]);
    expect(note).toBe('Dinner - Alice: Nachos (1/3)');
  });

  it('returns fallback for empty items', () => {
    const note = buildPaymentNote('Dinner', 'Alice', []);
    expect(note).toBe("Dinner - Alice's share");
  });
});

describe('buildChargeNote', () => {
  it('formats a single item', () => {
    const note = buildChargeNote('Dinner', 'Bob', [
      { description: 'Steak', splitCount: 1 },
    ]);
    expect(note).toBe("Bob's share of Dinner:\nSteak");
  });

  it('formats multiple items with newlines', () => {
    const note = buildChargeNote('Dinner', 'Bob', [
      { description: 'Steak', splitCount: 1 },
      { description: 'Wine', splitCount: 2 },
    ]);
    expect(note).toBe("Bob's share of Dinner:\nSteak\nWine (1/2)");
  });

  it('returns fallback for empty items', () => {
    const note = buildChargeNote('Dinner', 'Bob', []);
    expect(note).toBe("Bob's share of Dinner");
  });
});

describe('cashAppLink', () => {
  it('builds correct URL with amount', () => {
    expect(cashAppLink('alice', 12.99)).toBe('https://cash.app/$alice/12.99');
  });

  it('formats amount with two decimals', () => {
    expect(cashAppLink('bob', 5)).toBe('https://cash.app/$bob/5.00');
  });
});

describe('paypalLink', () => {
  it('builds correct URL with amount', () => {
    expect(paypalLink('alice', 12.99)).toBe('https://paypal.me/alice/12.99');
  });

  it('formats amount with two decimals', () => {
    expect(paypalLink('bob', 10)).toBe('https://paypal.me/bob/10.00');
  });
});
