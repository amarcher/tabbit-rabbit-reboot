import type { SavedRabbit } from '../types';

const STORAGE_KEY = 'tabbitrabbit:savedRabbits';

export function getSavedRabbits(): SavedRabbit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSavedRabbit(rabbit: SavedRabbit): void {
  const list = getSavedRabbits();
  list.push(rabbit);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function removeSavedRabbit(id: string): void {
  const list = getSavedRabbits();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(list.filter((r) => r.id !== id))
  );
}

export function updateSavedRabbit(
  id: string,
  updates: Partial<SavedRabbit>
): void {
  const list = getSavedRabbits();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
