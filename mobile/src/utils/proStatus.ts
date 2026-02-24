import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tabbitPro';

export async function isProUser(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setProStatus(isPro: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(isPro));
}
