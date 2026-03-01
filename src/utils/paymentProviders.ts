// Payment provider registry — web version
// KEEP IN SYNC with mobile/src/utils/paymentProviders.ts

export type PaymentProviderId = 'venmo' | 'cashapp' | 'paypal' | 'revolut' | 'wise';

export interface PaymentProviderConfig {
  id: PaymentProviderId;
  name: string;
  placeholder: string;
  prefix?: string;
  color: string;
  variant: string; // Bootstrap variant
  regions: string[]; // ISO country codes; empty = universal
  buildPayUrl: (username: string, amount: number, note: string) => string;
  buildChargeUrl?: (username: string, amount: number, note: string) => string;
}

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export const PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
  {
    id: 'venmo',
    name: 'Venmo',
    placeholder: 'username',
    prefix: '@',
    color: '#3D95CE',
    variant: 'primary',
    regions: ['US'],
    buildPayUrl: (username, amount, note) =>
      isMobile()
        ? `venmo://paycharge?txn=pay&recipients=${username}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`
        : `https://venmo.com/${username}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
    buildChargeUrl: (username, amount, note) =>
      isMobile()
        ? `venmo://paycharge?txn=charge&recipients=${username}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`
        : `https://venmo.com/${username}?txn=charge&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
  },
  {
    id: 'cashapp',
    name: 'Cash App',
    placeholder: 'cashtag',
    prefix: '$',
    color: '#00D632',
    variant: 'success',
    regions: ['US', 'GB'],
    buildPayUrl: (cashtag, amount) =>
      `https://cash.app/$${cashtag}/${amount.toFixed(2)}`,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    placeholder: 'username',
    color: '#0070BA',
    variant: 'info',
    regions: [], // universal
    buildPayUrl: (username, amount) =>
      `https://paypal.me/${username}/${amount.toFixed(2)}`,
  },
  {
    id: 'revolut',
    name: 'Revolut',
    placeholder: 'username',
    prefix: '@',
    color: '#0075EB',
    variant: 'primary',
    regions: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'AT', 'BE', 'IE', 'AU', 'SE', 'NO', 'DK', 'CH', 'FI'],
    buildPayUrl: (username, amount, note) =>
      `https://revolut.me/${username}`,
  },
  {
    id: 'wise',
    name: 'Wise',
    placeholder: 'email or username',
    color: '#9FE870',
    variant: 'success',
    regions: [], // universal
    buildPayUrl: (username) =>
      `https://wise.com/pay#email=${encodeURIComponent(username)}`,
  },
];

export function getProviderById(id: PaymentProviderId): PaymentProviderConfig | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}

/**
 * Map from legacy profile fields to provider IDs.
 */
export interface PaymentHandle {
  provider: PaymentProviderId;
  username: string;
}

/**
 * Extract payment handles from legacy profile fields.
 */
export function profileToHandles(profile: {
  venmo_username?: string | null;
  cashapp_cashtag?: string | null;
  paypal_username?: string | null;
}): PaymentHandle[] {
  const handles: PaymentHandle[] = [];
  if (profile.venmo_username) handles.push({ provider: 'venmo', username: profile.venmo_username });
  if (profile.cashapp_cashtag) handles.push({ provider: 'cashapp', username: profile.cashapp_cashtag });
  if (profile.paypal_username) handles.push({ provider: 'paypal', username: profile.paypal_username });
  return handles;
}

/**
 * Get the region from a currency code (approximate mapping).
 */
export function regionFromCurrency(currencyCode: string): string | null {
  const map: Record<string, string> = {
    USD: 'US', GBP: 'GB', CAD: 'CA', AUD: 'AU', NZD: 'NZ',
    JPY: 'JP', KRW: 'KR', CNY: 'CN', INR: 'IN', MXN: 'MX',
    BRL: 'BR', CHF: 'CH', SEK: 'SE', NOK: 'NO', DKK: 'DK',
    SGD: 'SG', HKD: 'HK', TWD: 'TW', THB: 'TH',
    EUR: 'DE', // Default EU region
  };
  return map[currencyCode.toUpperCase()] || null;
}

/**
 * Filter providers relevant to a given region. Universal providers (empty regions) always included.
 */
export function providersForRegion(region: string | null): PaymentProviderConfig[] {
  if (!region) return PAYMENT_PROVIDERS;
  return PAYMENT_PROVIDERS.filter(
    (p) => p.regions.length === 0 || p.regions.includes(region)
  );
}
