import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SharedTabData } from './useSharedTab';

const CACHE_INDEX_KEY = '@billCache:index';
const CACHE_PREFIX = '@billCache:bill:';

interface CachedBillEntry {
  shareToken: string;
  tabName: string;
  ownerName: string | null;
  totalCents: number;
  currencyCode: string;
  viewedAt: string;
}

export interface CachedBill extends CachedBillEntry {
  data: SharedTabData;
}

export function useBillCache() {
  const [cachedBills, setCachedBills] = useState<CachedBillEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIndex = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      const entries: CachedBillEntry[] = raw ? JSON.parse(raw) : [];
      entries.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
      setCachedBills(entries);
    } catch {
      setCachedBills([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  const cacheBill = useCallback(async (shareToken: string, data: SharedTabData) => {
    const subtotal = data.items.reduce((sum, i) => sum + i.price_cents, 0);
    const taxAmount = Math.round(subtotal * (data.tab.tax_percent / 100));
    const tipAmount = Math.round(subtotal * (data.tab.tip_percent / 100));

    const entry: CachedBillEntry = {
      shareToken,
      tabName: data.tab.name,
      ownerName: data.ownerProfile.display_name,
      totalCents: subtotal + taxAmount + tipAmount,
      currencyCode: data.tab.currency_code || 'USD',
      viewedAt: new Date().toISOString(),
    };

    // Store full data
    await AsyncStorage.setItem(CACHE_PREFIX + shareToken, JSON.stringify(data));

    // Update index
    const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    let entries: CachedBillEntry[] = raw ? JSON.parse(raw) : [];
    entries = entries.filter((e) => e.shareToken !== shareToken);
    entries.unshift(entry);
    // Keep max 50 cached bills
    if (entries.length > 50) {
      const removed = entries.splice(50);
      for (const r of removed) {
        await AsyncStorage.removeItem(CACHE_PREFIX + r.shareToken);
      }
    }
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
    setCachedBills(entries);
  }, []);

  const getCachedBill = useCallback(async (shareToken: string): Promise<SharedTabData | null> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + shareToken);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  return { cachedBills, loading, cacheBill, getCachedBill, refresh: loadIndex };
}
