interface NoteItem {
  description: string;
  splitCount: number;
}

export function buildPaymentNote(tabName: string, rabbitName: string, items: NoteItem[]): string {
  if (items.length === 0) return `${tabName} - ${rabbitName}'s share`;

  const itemParts = items.map((item) =>
    item.splitCount > 1 ? `${item.description} (1/${item.splitCount})` : item.description
  );

  return `${tabName} - ${rabbitName}: ${itemParts.join(', ')}`;
}

export function venmoLink(
  username: string,
  amount: number,
  note: string
): string {
  return `venmo://paycharge?txn=pay&recipients=${username}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
}

export function venmoChargeLink(username: string, amount: number, note: string): string {
  return `venmo://paycharge?txn=charge&recipients=${username}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
}

export function buildChargeNote(tabName: string, rabbitName: string, items: NoteItem[]): string {
  if (items.length === 0) return `${rabbitName}'s share of ${tabName}`;
  const itemParts = items.map((item) =>
    item.splitCount > 1 ? `${item.description} (1/${item.splitCount})` : item.description
  );
  return `${rabbitName}'s share of ${tabName}:\n${itemParts.join('\n')}`;
}

export function cashAppLink(cashtag: string, amount: number): string {
  return `https://cash.app/$${cashtag}/${amount.toFixed(2)}`;
}

export function paypalLink(username: string, amount: number): string {
  return `https://paypal.me/${username}/${amount.toFixed(2)}`;
}
