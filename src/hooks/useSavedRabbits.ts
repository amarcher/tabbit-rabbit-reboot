import { useCallback, useState } from 'react';
import type { SavedRabbit } from '../types';
import {
  getSavedRabbits,
  addSavedRabbit,
  removeSavedRabbit,
  updateSavedRabbit,
} from '../utils/savedRabbits';

export function useSavedRabbits() {
  const [savedRabbits, setSavedRabbits] = useState<SavedRabbit[]>(getSavedRabbits);

  const addSaved = useCallback((rabbit: SavedRabbit) => {
    addSavedRabbit(rabbit);
    setSavedRabbits((prev) => [...prev, rabbit]);
  }, []);

  const removeSaved = useCallback((id: string) => {
    removeSavedRabbit(id);
    setSavedRabbits((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateSaved = useCallback(
    (id: string, updates: Partial<SavedRabbit>) => {
      updateSavedRabbit(id, updates);
      setSavedRabbits((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  return { savedRabbits, addSaved, removeSaved, updateSaved };
}
