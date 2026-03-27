export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return current code
  if (req.method === 'GET') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'promo-code.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return res.status(200).json(data);
    } catch (e) {
      return res.status(200).json({ code: 'REALFAN' });
    }
  }

  // POST — update code
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, code } = req.body || {};

  if (!email || !password || email.toLowerCase() !== 'colton@powermarketing.com' || password !== 'Tapnpay2026!') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!code || code.trim().length < 2 || code.trim().length > 30) {
    return res.status(400).json({ error: 'Code must be 2-30 characters' });
  }

  const cleanCode = code.trim().toUpperCase();
  const PAT = process.env.GITHUB_PAT;
  if (!PAT) return res.status(500).json({ error: 'Server not configured. Set GITHUB_PAT environment variable in Vercel.' });
  const REPO = 'extremesportlocks-netizen/tapnpay-landing-pages';
  const FILE = 'promo-code.json';

  try {
    // Get current file SHA
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      headers: { 'Authorization': `token ${PAT}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'TapNPay-Admin' }
    });

    let sha = '';
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // Update file via GitHub API
    const newContent = JSON.stringify({ code: cleanCode, updated: new Date().toISOString() });
    const encoded = Buffer.from(newContent).toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TapNPay-Admin'
      },
      body: JSON.stringify({
        message: `Promo code updated to ${cleanCode}`,
        content: encoded,
        sha: sha || undefined,
        committer: { name: 'TapNPay+ Admin', email: 'admin@tapnpayplus.com' }
      })
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      return res.status(500).json({ error: 'Update failed', details: err });
    }

    return res.status(200).json({ success: true, code: cleanCode, message: 'Code updated! Pages will reflect the change in 2-3 minutes.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
