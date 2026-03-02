const { buildVoiceAssignmentPrompt, validateVoiceAssignmentResult } = require('@tabbit/shared');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  try {
    const { transcript, items, rabbits, existing_assignments } = req.body;

    if (!transcript || !items || !rabbits) {
      return res.status(400).json({ error: 'transcript, items, and rabbits are required' });
    }

    const prompt = buildVoiceAssignmentPrompt({
      transcript,
      items,
      rabbits,
      existing_assignments: existing_assignments || [],
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: 'Anthropic API error', details: data });
    }

    const content = data.content && data.content[0] && data.content[0].text;
    if (!content) {
      return res.status(500).json({ error: 'No response from model', details: data });
    }

    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    const validated = validateVoiceAssignmentResult(parsed);

    return res.status(200).json(validated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
