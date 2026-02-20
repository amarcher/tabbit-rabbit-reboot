import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { RabbitColor } from '../types';

// Compact bill format for URL encoding
interface CompactBill {
  n: string; // tab name
  x: number; // tax_percent
  p: number; // tip_percent
  i: [string, number][]; // items: [description, price_cents]
  r: [string, number][]; // rabbits: [name, colorIndex]
  a: [number, number][]; // assignments: [itemIdx, rabbitIdx]
  o: {
    d: string | null; // display_name
    v: string | null; // venmo_username
    c: string | null; // cashapp_cashtag
    p: string | null; // paypal_username
  };
}

const COLOR_ORDER: RabbitColor[] = [
  'success', 'info', 'warning', 'danger', 'primary', 'secondary',
];

export interface SharedTabData {
  tab: { name: string; tax_percent: number; tip_percent: number };
  items: { id: string; description: string; price_cents: number }[];
  rabbits: { id: string; name: string; color: string }[];
  assignments: { item_id: string; rabbit_id: string }[];
  ownerProfile: {
    display_name: string | null;
    venmo_username: string | null;
    cashapp_cashtag: string | null;
    paypal_username: string | null;
  };
}

export function encodeBill(
  tab: { name: string; tax_percent: number; tip_percent: number },
  items: { id: string; description: string; price_cents: number }[],
  rabbits: { id: string; name: string; color: string }[],
  assignments: { item_id: string; rabbit_id: string }[],
  ownerProfile: {
    display_name: string | null;
    venmo_username: string | null;
    cashapp_cashtag: string | null;
    paypal_username: string | null;
  }
): string {
  const itemIdToIdx = new Map(items.map((item, idx) => [item.id, idx]));
  const rabbitIdToIdx = new Map(rabbits.map((r, idx) => [r.id, idx]));

  const compact: CompactBill = {
    n: tab.name,
    x: tab.tax_percent,
    p: tab.tip_percent,
    i: items.map((item) => [item.description, item.price_cents]),
    r: rabbits.map((r) => [
      r.name,
      COLOR_ORDER.indexOf(r.color as RabbitColor),
    ]),
    a: assignments
      .map((a) => {
        const itemIdx = itemIdToIdx.get(a.item_id);
        const rabbitIdx = rabbitIdToIdx.get(a.rabbit_id);
        if (itemIdx === undefined || rabbitIdx === undefined) return null;
        return [itemIdx, rabbitIdx] as [number, number];
      })
      .filter((a): a is [number, number] => a !== null),
    o: {
      d: ownerProfile.display_name,
      v: ownerProfile.venmo_username,
      c: ownerProfile.cashapp_cashtag,
      p: ownerProfile.paypal_username,
    },
  };

  return compressToEncodedURIComponent(JSON.stringify(compact));
}

export function decodeBill(encoded: string): SharedTabData | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const compact: CompactBill = JSON.parse(json);

    const items = compact.i.map(([desc, cents], idx) => ({
      id: `item-${idx}`,
      description: desc,
      price_cents: cents,
    }));

    const rabbits = compact.r.map(([name, colorIdx], idx) => ({
      id: `rabbit-${idx}`,
      name,
      color: COLOR_ORDER[colorIdx] || 'secondary',
    }));

    const assignments = compact.a.map(([itemIdx, rabbitIdx]) => ({
      item_id: `item-${itemIdx}`,
      rabbit_id: `rabbit-${rabbitIdx}`,
    }));

    return {
      tab: {
        name: compact.n,
        tax_percent: compact.x,
        tip_percent: compact.p,
      },
      items,
      rabbits,
      assignments,
      ownerProfile: {
        display_name: compact.o.d,
        venmo_username: compact.o.v,
        cashapp_cashtag: compact.o.c,
        paypal_username: compact.o.p,
      },
    };
  } catch {
    return null;
  }
}
