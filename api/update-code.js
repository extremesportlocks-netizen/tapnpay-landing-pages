export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const REPO = 'extremesportlocks-netizen/tapnpay-landing-pages';
  const FILE = 'promo-code.json';
  const DEFAULTS = { athletes: 'REALFAN', fans: 'REALFAN', parentrallyfans: 'REALFAN', parentrallyparents: 'REALFAN' };

  // GET — return current codes
  if (req.method === 'GET') {
    try {
      const PAT = process.env.GITHUB_PAT;
      const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
        headers: { 'Authorization': `token ${PAT}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'TapNPay-Admin' }
      });
      if (getRes.ok) {
        const file = await getRes.json();
        return res.status(200).json(JSON.parse(Buffer.from(file.content, 'base64').toString()));
      }
      return res.status(200).json(DEFAULTS);
    } catch (e) {
      return res.status(200).json(DEFAULTS);
    }
  }

  // POST — update codes
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, code, pages } = req.body || {};

  if (!email || !password || email.toLowerCase() !== 'colton@powermarketing.com' || password !== 'Tapnpay2026!') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!code || code.trim().length < 2 || code.trim().length > 30) {
    return res.status(400).json({ error: 'Code must be 2-30 characters' });
  }

  const cleanCode = code.trim().toUpperCase();
  const validPages = ['athletes', 'fans', 'parentrallyfans', 'parentrallyparents'];
  const selectedPages = Array.isArray(pages) ? pages.filter(p => validPages.includes(p)) : validPages;

  if (selectedPages.length === 0) {
    return res.status(400).json({ error: 'Select at least one page' });
  }

  const PAT = process.env.GITHUB_PAT;
  if (!PAT) return res.status(500).json({ error: 'Server not configured. Set GITHUB_PAT in Vercel.' });

  try {
    // Get current file + SHA
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      headers: { 'Authorization': `token ${PAT}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'TapNPay-Admin' }
    });

    let currentData = Object.assign({}, DEFAULTS);
    let sha = '';

    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
      currentData = JSON.parse(Buffer.from(file.content, 'base64').toString());
    }

    // Update only selected pages
    selectedPages.forEach(function(p) { currentData[p] = cleanCode; });
    currentData.updated = new Date().toISOString();

    // Write back
    const encoded = Buffer.from(JSON.stringify(currentData)).toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TapNPay-Admin'
      },
      body: JSON.stringify({
        message: 'Promo code: ' + cleanCode + ' → ' + selectedPages.join(', '),
        content: encoded,
        sha: sha || undefined,
        committer: { name: 'TapNPay+ Admin', email: 'admin@tapnpayplus.com' }
      })
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      return res.status(500).json({ error: 'Update failed', details: err });
    }

    return res.status(200).json({
      success: true,
      code: cleanCode,
      pages: selectedPages,
      allCodes: currentData,
      message: 'Code "' + cleanCode + '" pushed to ' + selectedPages.length + ' page(s). Updates in 2-3 minutes.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
