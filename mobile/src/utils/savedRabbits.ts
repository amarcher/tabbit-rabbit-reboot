import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedRabbit } from '../types';

const STORAGE_KEY = '@savedRabbits';

export async function getSavedRabbits(): Promise<SavedRabbit[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addSavedRabbit(rabbit: SavedRabbit): Promise<void> {
  const list = await getSavedRabbits();
  list.push(rabbit);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function removeSavedRabbit(id: string): Promise<void> {
  const list = await getSavedRabbits();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(list.filter((r) => r.id !== id))
  );
}

export async function updateSavedRabbit(
  id: string,
  updates: Partial<SavedRabbit>
): Promise<void> {
  const list = await getSavedRabbits();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...updates };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
