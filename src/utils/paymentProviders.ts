// Payment provider registry — web version
// KEEP IN SYNC with mobile/src/utils/paymentProviders.ts

import type { PaymentProviderId, PaymentHandle } from '../types';

export type { PaymentProviderId, PaymentHandle };

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
    buildPayUrl: (username) =>
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
  {
    id: 'upi',
    name: 'UPI',
    placeholder: 'UPI ID (e.g. name@upi)',
    color: '#5F259F',
    variant: 'secondary',
    regions: ['IN'],
    buildPayUrl: (upiId, amount, note) =>
      `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(note)}`,
  },
  {
    id: 'paypay',
    name: 'PayPay',
    placeholder: 'PayPay link ID',
    color: '#FF0033',
    variant: 'danger',
    regions: ['JP'],
    buildPayUrl: (linkId) =>
      `https://qr.paypay.ne.jp/${linkId}`,
  },
  {
    id: 'satispay',
    name: 'Satispay',
    placeholder: 'Satispay tag',
    color: '#E5383B',
    variant: 'danger',
    regions: ['IT'],
    buildPayUrl: (tag) =>
      `https://tag.satispay.com/${tag}`,
  },
  {
    id: 'momo',
    name: 'MoMo',
    placeholder: 'phone number',
    color: '#AE2070',
    variant: 'secondary',
    regions: ['VN'],
    buildPayUrl: (phone) =>
      `https://me.momo.vn/${phone}`,
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    placeholder: 'link or alias',
    color: '#009EE3',
    variant: 'info',
    regions: ['BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY'],
    buildPayUrl: (alias) =>
      `https://mpago.la/${alias}`,
  },
  {
    id: 'lydia',
    name: 'Lydia',
    placeholder: 'phone or username',
    color: '#0070F0',
    variant: 'primary',
    regions: ['FR'],
    buildPayUrl: (username) =>
      `https://lydia-app.com/collect/ext/${username}`,
  },
  {
    id: 'toss',
    name: 'Toss',
    placeholder: 'Toss ID',
    color: '#0064FF',
    variant: 'primary',
    regions: ['KR'],
    buildPayUrl: (tossId) =>
      `https://toss.me/${tossId}`,
  },
];

export function getProviderById(id: PaymentProviderId): PaymentProviderConfig | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}

/**
 * Convert legacy profile fields to PaymentHandle array.
 * Reads from payment_handles first, falls back to legacy fields.
 */
export function profileToHandles(profile: {
  payment_handles?: PaymentHandle[];
  venmo_username?: string | null;
  cashapp_cashtag?: string | null;
  paypal_username?: string | null;
}): PaymentHandle[] {
  if (profile.payment_handles && profile.payment_handles.length > 0) {
    return profile.payment_handles;
  }
  const handles: PaymentHandle[] = [];
  if (profile.venmo_username) handles.push({ provider: 'venmo', username: profile.venmo_username });
  if (profile.cashapp_cashtag) handles.push({ provider: 'cashapp', username: profile.cashapp_cashtag });
  if (profile.paypal_username) handles.push({ provider: 'paypal', username: profile.paypal_username });
  return handles;
}

/**
 * Convert PaymentHandle array back to legacy profile fields (for backward compat).
 */
export function handlesToLegacyFields(handles: PaymentHandle[]): {
  venmo_username: string | null;
  cashapp_cashtag: string | null;
  paypal_username: string | null;
} {
  return {
    venmo_username: handles.find((h) => h.provider === 'venmo')?.username || null,
    cashapp_cashtag: handles.find((h) => h.provider === 'cashapp')?.username || null,
    paypal_username: handles.find((h) => h.provider === 'paypal')?.username || null,
  };
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
    VND: 'VN', CLP: 'CL', COP: 'CO', PEN: 'PE', ARS: 'AR', UYU: 'UY',
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
