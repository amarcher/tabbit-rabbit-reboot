import { useCallback, useEffect, useState } from 'react';
import type { SavedRabbit } from '../types';
import {
  getSavedRabbits,
  addSavedRabbit,
  removeSavedRabbit,
  updateSavedRabbit,
} from '../utils/savedRabbits';

export function useSavedRabbits() {
  const [savedRabbits, setSavedRabbits] = useState<SavedRabbit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await getSavedRabbits();
    setSavedRabbits(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSaved = useCallback(async (rabbit: SavedRabbit) => {
    await addSavedRabbit(rabbit);
    setSavedRabbits((prev) => [...prev, rabbit]);
  }, []);

  const removeSaved = useCallback(async (id: string) => {
    await removeSavedRabbit(id);
    setSavedRabbits((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateSaved = useCallback(
    async (id: string, updates: Partial<SavedRabbit>) => {
      await updateSavedRabbit(id, updates);
      setSavedRabbits((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  return { savedRabbits, loading, refresh, addSaved, removeSaved, updateSaved };
}
