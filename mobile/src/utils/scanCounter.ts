import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_SCAN_LIMIT = 10;

const STORAGE_KEY = '@scanCounter';

interface ScanData {
  month: string;
  count: number;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getScanData(): Promise<ScanData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: ScanData = JSON.parse(raw);
      if (data.month === currentMonth()) return data;
    }
  } catch {}
  return { month: currentMonth(), count: 0 };
}

export async function getScanCount(): Promise<number> {
  return (await getScanData()).count;
}

export async function canScanFree(): Promise<boolean> {
  return (await getScanData()).count < FREE_SCAN_LIMIT;
}

export async function incrementScanCount(): Promise<number> {
  const data = await getScanData();
  data.count += 1;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data.count;
}

export async function remainingFreeScans(): Promise<number> {
  return Math.max(0, FREE_SCAN_LIMIT - (await getScanData()).count);
}
