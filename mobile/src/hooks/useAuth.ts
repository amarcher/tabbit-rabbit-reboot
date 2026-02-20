import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../types';

const PROFILE_KEY = '@profile';

export interface LocalProfile extends Profile {
  email: string | null;
}

export function useAuth() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
      if (raw) {
        setProfile(JSON.parse(raw));
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
