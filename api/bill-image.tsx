import { ImageResponse } from '@vercel/og';
import { decompressFromEncodedURIComponent } from 'lz-string';

export const config = {
  runtime: 'edge',
};

const COLOR_ORDER = ['success', 'info', 'warning', 'danger', 'primary', 'secondary'];
const COLOR_HEX: Record<string, string> = {
  success: '#d1e7dd',
  info: '#cff4fc',
  warning: '#fff3cd',
  danger: '#f8d7da',
  primary: '#cfe2ff',
  secondary: '#e2e3e5',
};

function decodeBill(encoded: string) {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const compact = JSON.parse(json);

    const items = compact.i.map(([desc, cents]: [string, number], idx: number) => ({
      id: `item-${idx}`,
      description: desc,
      price_cents: cents,
    }));

    const rabbits = compact.r.map(([name, colorIdx]: [string, number], idx: number) => ({
      id: `rabbit-${idx}`,
      name,
      color: COLOR_ORDER[colorIdx] || 'secondary',
    }));

    const assignments = compact.a.map(([itemIdx, rabbitIdx]: [number, number]) => ({
      item_id: `item-${itemIdx}`,
      rabbit_id: `rabbit-${rabbitIdx}`,
    }));

    return {
      tab: { name: compact.n, tax_percent: compact.x, tip_percent: compact.p },
      items,
      rabbits,
      assignments,
      ownerProfile: {
        display_name: compact.o.d,
      },
    };
  } catch {
    return null;
  }
}

function formatCents(cents: number) {
  return '$' + (Math.round(cents) / 100).toFixed(2);
}

export default function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const encoded = searchParams.get('data');

  if (!encoded) {
    return new Response('Missing data', { status: 400 });
  }

  const data = decodeBill(encoded);
  if (!data) {
    return new Response('Invalid data', { status: 400 });
  }

  const { tab, items, rabbits, assignments } = data;
  const subtotalCents = items.reduce((sum: number, i: { price_cents: number }) => sum + i.price_cents, 0);
  const taxAmount = Math.round(subtotalCents * (tab.tax_percent / 100));
  const tipAmount = Math.round(subtotalCents * (tab.tip_percent / 100));
  const grandTotal = subtotalCents + taxAmount + tipAmount;

  // Build per-person totals
  const personTotals = rabbits.map((rabbit: { id: string; name: string; color: string }) => {
    const rabbitItemIds = assignments
      .filter((a: { rabbit_id: string }) => a.rabbit_id === rabbit.id)
      .map((a: { item_id: string }) => a.item_id);

    let total = 0;
    for (const itemId of rabbitItemIds) {
      const item = items.find((i: { id: string }) => i.id === itemId);
      if (!item) continue;
      const splitCount = assignments.filter((a: { item_id: string }) => a.item_id === itemId).length;
      total += item.price_cents / splitCount;
    }

    const withTaxTip = total * (1 + tab.tax_percent / 100 + tab.tip_percent / 100);
    return {
      name: rabbit.name,
      total: Math.round(withTaxTip),
      color: COLOR_HEX[rabbit.color] || '#e2e3e5',
    };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8f9fa',
          padding: 60,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#333' }}>
              {tab.name}
            </div>
            {data.ownerProfile.display_name && (
              <div style={{ fontSize: 24, color: '#666', marginTop: 8 }}>
                by {data.ownerProfile.display_name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 20, color: '#666' }}>Grand Total</div>
            <div style={{ fontSize: 56, fontWeight: 700, color: '#333' }}>
              {formatCents(grandTotal)}
            </div>
          </div>
        </div>

        {/* Per-person breakdown */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, flex: 1 }}>
          {personTotals.slice(0, 6).map((person: { name: string; total: number; color: string }, idx: number) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: person.color,
                borderRadius: 12,
                padding: '16px 24px',
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
                {person.name}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#333' }}>
                {formatCents(person.total)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
          <div style={{ fontSize: 20, color: '#999' }}>
            {items.length} items | {rabbits.length} people
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffc107' }}>
            Tabbit Rabbit
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
