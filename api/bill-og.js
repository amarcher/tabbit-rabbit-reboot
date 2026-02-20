const { decompressFromEncodedURIComponent } = require('lz-string');

const COLOR_ORDER = ['success', 'info', 'warning', 'danger', 'primary', 'secondary'];

const CRAWLER_UA = /facebookexternalhit|Twitterbot|WhatsApp|Slackbot|LinkedInBot|Discordbot|TelegramBot/i;

function decodeBill(encoded) {
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

function formatCents(cents) {
  return '$' + (Math.round(cents) / 100).toFixed(2);
}

module.exports = function handler(req, res) {
  const ua = req.headers['user-agent'] || '';

  // Only intercept crawler requests
  if (!CRAWLER_UA.test(ua)) {
    // Serve the SPA for regular browsers
    return res.redirect(307, req.url);
  }

  // Extract encoded bill from URL path
  const pathMatch = req.url.match(/\/bill\/(.+)/);
  if (!pathMatch) {
    return res.status(404).send('Not found');
  }

  const encoded = pathMatch[1];
  const data = decodeBill(encoded);

  if (!data) {
    return res.status(404).send('Invalid bill');
  }

  const { tab, items, rabbits, assignments } = data;
  const subtotalCents = items.reduce((sum, i) => sum + i.price_cents, 0);
  const taxAmount = Math.round(subtotalCents * (tab.tax_percent / 100));
  const tipAmount = Math.round(subtotalCents * (tab.tip_percent / 100));
  const grandTotal = subtotalCents + taxAmount + tipAmount;

  // Build per-person breakdown for description
  const breakdown = rabbits.map((rabbit) => {
    const rabbitItemIds = assignments
      .filter((a) => a.rabbit_id === rabbit.id)
      .map((a) => a.item_id);

    let total = 0;
    for (const itemId of rabbitItemIds) {
      const item = items.find((i) => i.id === itemId);
      if (!item) continue;
      const splitCount = assignments.filter((a) => a.item_id === itemId).length;
      total += item.price_cents / splitCount;
    }

    const withTaxTip = total * (1 + tab.tax_percent / 100 + tab.tip_percent / 100);
    return `${rabbit.name}: ${formatCents(Math.round(withTaxTip))}`;
  });

  const title = `${tab.name} - ${formatCents(grandTotal)}`;
  const description = breakdown.join(' | ') || `${items.length} items`;
  const ogImageUrl = `https://tabbitrabbit.com/api/bill-image?data=${encodeURIComponent(encoded)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} | Tabbit Rabbit</title>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
</head>
<body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
