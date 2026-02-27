// Payment provider registry — mobile version
// KEEP IN SYNC with src/utils/paymentProviders.ts

import { Linking } from 'react-native';

export type PaymentProviderId = 'venmo' | 'cashapp' | 'paypal' | 'revolut' | 'wise';

export interface PaymentProviderConfig {
  id: PaymentProviderId;
  name: string;
  placeholder: string;
  prefix?: string;
  color: string;
  regions: string[]; // ISO country codes; empty = universal
  buildPayUrl: (username: string, amount: number, note: string) => string;
  buildChargeUrl?: (username: string, amount: number, note: string) => string;
}

export const PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
  {
    id: 'venmo',
    name: 'Venmo',
    placeholder: 'username',
    prefix: '@',
    color: '#3D95CE',
    regions: ['US'],
    buildPayUrl: (username, amount, note) =>
      `venmo://paycharge?txn=pay&recipients=${username}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
    buildChargeUrl: (username, amount, note) =>
      `venmo://paycharge?txn=charge&recipients=${username}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
  },
  {
    id: 'cashapp',
    name: 'Cash App',
    placeholder: 'cashtag',
    prefix: '$',
    color: '#00D632',
    regions: ['US', 'GB'],
    buildPayUrl: (cashtag, amount) =>
      `https://cash.app/$${cashtag}/${amount.toFixed(2)}`,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    placeholder: 'username',
    color: '#0070BA',
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
    regions: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'AT', 'BE', 'IE', 'AU', 'SE', 'NO', 'DK', 'CH', 'FI'],
    buildPayUrl: (username) =>
      `https://revolut.me/${username}`,
  },
  {
    id: 'wise',
    name: 'Wise',
    placeholder: 'email or username',
    color: '#9FE870',
    regions: [], // universal
    buildPayUrl: (username) =>
      `https://wise.com/pay#email=${encodeURIComponent(username)}`,
  },
];

export function getProviderById(id: PaymentProviderId): PaymentProviderConfig | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}

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

export function regionFromCurrency(currencyCode: string): string | null {
  const map: Record<string, string> = {
    USD: 'US', GBP: 'GB', CAD: 'CA', AUD: 'AU', NZD: 'NZ',
    JPY: 'JP', KRW: 'KR', CNY: 'CN', INR: 'IN', MXN: 'MX',
    BRL: 'BR', CHF: 'CH', SEK: 'SE', NOK: 'NO', DKK: 'DK',
    SGD: 'SG', HKD: 'HK', TWD: 'TW', THB: 'TH',
    EUR: 'DE',
  };
  return map[currencyCode.toUpperCase()] || null;
}

export function providersForRegion(region: string | null): PaymentProviderConfig[] {
  if (!region) return PAYMENT_PROVIDERS;
  return PAYMENT_PROVIDERS.filter(
    (p) => p.regions.length === 0 || p.regions.includes(region)
  );
}

/**
 * Open a payment URL. Tries deep link first, falls back to web URL.
 */
export async function openPaymentUrl(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // If deep link fails, try HTTPS fallback
    const httpsUrl = url.replace(/^venmo:\/\/paycharge/, 'https://venmo.com');
    await Linking.openURL(httpsUrl);
  }
}
