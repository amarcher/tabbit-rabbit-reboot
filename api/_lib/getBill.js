const { kv } = require('@vercel/kv');
const { decompressFromEncodedURIComponent } = require('lz-string');

const COLOR_ORDER = ['success', 'info', 'warning', 'danger', 'primary', 'secondary'];

function isLegacyToken(token) {
  return token.length > 20;
}

function decodeLegacyBill(encoded) {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const compact = JSON.parse(json);

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
      tab: { name: compact.n, tax_percent: compact.x, tip_percent: compact.p },
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

async function getBill(token) {
  if (isLegacyToken(token)) {
    return decodeLegacyBill(token);
  }
  return await kv.get(`bill:${token}`);
}

module.exports = { getBill, isLegacyToken };
