import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../types';
import { detectCurrencyFromLocale } from '../utils/currency';

const PROFILE_KEY = '@profile';

export interface LocalProfile extends Profile {
  email: string | null;
}

function migrateProfile(raw: LocalProfile): LocalProfile {
  if (!raw.currency_code) {
    return { ...raw, currency_code: detectCurrencyFromLocale() };
  }
  return raw;
}

export function useAuth() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
      if (raw) {
        const parsed = migrateProfile(JSON.parse(raw));
        setProfile(parsed);
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
      }
      setLoading(false);
    });
  }, []);

  const updateProfile = useCallback(async (updates: Partial<LocalProfile>) => {
    setProfile((prev) => {
      const base: LocalProfile = prev || {
        id: Date.now().toString(),
        username: '',
        display_name: null,
        email: null,
        venmo_username: null,
        cashapp_cashtag: null,
        paypal_username: null,
        currency_code: detectCurrencyFromLocale(),
        created_at: new Date().toISOString(),
      };
      const updated = { ...base, ...updates };
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    profile,
    loading,
    updateProfile,
  };
}
