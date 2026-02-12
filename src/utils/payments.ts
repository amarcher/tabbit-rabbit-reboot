export function venmoLink(
  username: string,
  amount: number,
  note: string
): string {
  return `https://venmo.com/${username}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
}

export function cashAppLink(cashtag: string, amount: number): string {
  return `https://cash.app/$${cashtag}/${amount.toFixed(2)}`;
}

export function paypalLink(username: string, amount: number): string {
  return `https://paypal.me/${username}/${amount.toFixed(2)}`;
}
