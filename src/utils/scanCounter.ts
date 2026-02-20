export const FREE_SCAN_LIMIT = 10;

const STORAGE_KEY = 'tabbitrabbit:scanCounter';

interface ScanData {
  month: string;
  count: number;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getScanData(): ScanData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: ScanData = JSON.parse(raw);
      if (data.month === currentMonth()) return data;
    }
  } catch {}
  return { month: currentMonth(), count: 0 };
}

export function getScanCount(): number {
  return getScanData().count;
}

export function canScanFree(): boolean {
  return getScanData().count < FREE_SCAN_LIMIT;
}

export function incrementScanCount(): number {
  const data = getScanData();
  data.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data.count;
}

export function remainingFreeScans(): number {
  return Math.max(0, FREE_SCAN_LIMIT - getScanData().count);
}
