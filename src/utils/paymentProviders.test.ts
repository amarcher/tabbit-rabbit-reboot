import {
  getProviderById,
  profileToHandles,
  regionFromCurrency,
  providersForRegion,
  PAYMENT_PROVIDERS,
} from './paymentProviders';

describe('getProviderById', () => {
  it('returns Venmo for "venmo"', () => {
    const provider = getProviderById('venmo');
    expect(provider).toBeDefined();
    expect(provider!.name).toBe('Venmo');
  });

  it('returns Cash App for "cashapp"', () => {
    const provider = getProviderById('cashapp');
    expect(provider).toBeDefined();
    expect(provider!.name).toBe('Cash App');
  });

  it('returns undefined for unknown id', () => {
    expect(getProviderById('zelle' as any)).toBeUndefined();
  });
});

describe('profileToHandles', () => {
  it('extracts all handles from legacy profile', () => {
    const handles = profileToHandles({
      venmo_username: 'alice',
      cashapp_cashtag: 'alice123',
      paypal_username: 'alice@email.com',
    });
    expect(handles).toHaveLength(3);
    expect(handles[0]).toEqual({ provider: 'venmo', username: 'alice' });
    expect(handles[1]).toEqual({ provider: 'cashapp', username: 'alice123' });
    expect(handles[2]).toEqual({ provider: 'paypal', username: 'alice@email.com' });
  });

  it('skips null fields', () => {
    const handles = profileToHandles({
      venmo_username: 'alice',
      cashapp_cashtag: null,
      paypal_username: null,
    });
    expect(handles).toHaveLength(1);
    expect(handles[0].provider).toBe('venmo');
  });

  it('skips empty string fields', () => {
    const handles = profileToHandles({
      venmo_username: '',
      cashapp_cashtag: 'bob',
    });
    expect(handles).toHaveLength(1);
    expect(handles[0].provider).toBe('cashapp');
  });

  it('returns empty array for empty profile', () => {
    expect(profileToHandles({})).toEqual([]);
  });
});

describe('regionFromCurrency', () => {
  it('maps USD to US', () => {
    expect(regionFromCurrency('USD')).toBe('US');
  });

  it('maps GBP to GB', () => {
    expect(regionFromCurrency('GBP')).toBe('GB');
  });

  it('maps EUR to DE', () => {
    expect(regionFromCurrency('EUR')).toBe('DE');
  });

  it('returns null for unknown currency', () => {
    expect(regionFromCurrency('XYZ')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(regionFromCurrency('usd')).toBe('US');
  });
});

describe('providersForRegion', () => {
  it('includes Venmo for US region', () => {
    const providers = providersForRegion('US');
    expect(providers.find(p => p.id === 'venmo')).toBeDefined();
  });

  it('excludes Revolut for US region', () => {
    const providers = providersForRegion('US');
    expect(providers.find(p => p.id === 'revolut')).toBeUndefined();
  });

  it('includes Cash App and Revolut for GB', () => {
    const providers = providersForRegion('GB');
    expect(providers.find(p => p.id === 'cashapp')).toBeDefined();
    expect(providers.find(p => p.id === 'revolut')).toBeDefined();
  });

  it('always includes universal providers (PayPal, Wise)', () => {
    const usProviders = providersForRegion('US');
    expect(usProviders.find(p => p.id === 'paypal')).toBeDefined();
    expect(usProviders.find(p => p.id === 'wise')).toBeDefined();

    const gbProviders = providersForRegion('GB');
    expect(gbProviders.find(p => p.id === 'paypal')).toBeDefined();
    expect(gbProviders.find(p => p.id === 'wise')).toBeDefined();
  });

  it('returns all providers when region is null', () => {
    const providers = providersForRegion(null);
    expect(providers).toEqual(PAYMENT_PROVIDERS);
  });
});
