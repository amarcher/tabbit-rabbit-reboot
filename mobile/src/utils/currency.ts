export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function parseDollars(dollars: string): number {
  const cleaned = dollars.replace(/[^0-9.]/g, '');
  return Math.round(parseFloat(cleaned) * 100) || 0;
}
