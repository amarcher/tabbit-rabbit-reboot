const crypto = require('crypto');
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bill = req.body;

    if (!bill || !bill.tab || !bill.items) {
      return res.status(400).json({ error: 'Invalid bill data' });
    }

    const token = crypto.randomBytes(6).toString('base64url');
    await kv.set(`bill:${token}`, bill, { ex: 90 * 24 * 60 * 60 });

    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
