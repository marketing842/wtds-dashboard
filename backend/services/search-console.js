import axios from 'axios';

const BASE = 'https://searchconsole.googleapis.com/webmasters/v3';

const _tokenCache = new Map();

async function getAccessToken(creds) {
  const key = creds.clientId;
  const cached = _tokenCache.get(key);
  if (cached && Date.now() < cached.expiry - 60_000) return cached.token;

  const res = await axios.post('https://oauth2.googleapis.com/token', null, {
    params: {
      client_id:     creds.oauth_client_id,
      client_secret: creds.oauth_client_secret,
      refresh_token: creds.refresh_token,
      grant_type:    'refresh_token',
    },
  });
  _tokenCache.set(key, { token: res.data.access_token, expiry: Date.now() + res.data.expires_in * 1000 });
  return res.data.access_token;
}

async function query(body, creds) {
  const token = await getAccessToken(creds);
  const encodedSite = encodeURIComponent(creds.site_url);
  const res = await axios.post(
    `${BASE}/sites/${encodedSite}/searchAnalytics/query`,
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.rows ?? [];
}

export async function getSearchConsoleSummary(start, end, creds) {
  const rows = await query({ startDate: start, endDate: end, dimensions: [] }, creds);
  const r = rows[0] ?? {};
  return {
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: (r.ctr ?? 0) * 100,
    position: r.position ?? 0,
  };
}

export async function getTopQueries(start, end, creds, limit = 20) {
  const rows = await query({
    startDate: start,
    endDate: end,
    dimensions: ['query'],
    rowLimit: limit,
    orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
  }, creds);
  return rows.map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr * 100,
    position: r.position,
  }));
}

export async function getTopPages(start, end, creds, limit = 10) {
  const rows = await query({
    startDate: start,
    endDate: end,
    dimensions: ['page'],
    rowLimit: limit,
    orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
  }, creds);
  return rows.map(r => ({
    page: r.keys[0].replace(creds.site_url, '/'),
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr * 100,
    position: r.position,
  }));
}

function resolveBrandTerms(creds) {
  const raw = creds.brand_terms;
  if (Array.isArray(raw)) return raw.map(t => String(t).toLowerCase()).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function isBrandedQuery(query, terms) {
  const q = query.toLowerCase();
  return terms.some(t => q.includes(t));
}

export async function getBrandedSearchSummary(start, end, creds, compareStart, compareEnd) {
  const terms = resolveBrandTerms(creds);
  if (!terms.length) {
    return { configured: false, terms: [], clicks: 0, impressions: 0, growth_pct: null, prev_clicks: 0 };
  }

  const [curRows, prevRows] = await Promise.all([
    query({
      startDate: start,
      endDate: end,
      dimensions: ['query'],
      rowLimit: 25000,
    }, creds),
    compareStart && compareEnd
      ? query({
          startDate: compareStart,
          endDate: compareEnd,
          dimensions: ['query'],
          rowLimit: 25000,
        }, creds)
      : Promise.resolve([]),
  ]);

  const sumBranded = rows => rows
    .filter(r => isBrandedQuery(r.keys[0], terms))
    .reduce((acc, r) => ({
      clicks: acc.clicks + (r.clicks ?? 0),
      impressions: acc.impressions + (r.impressions ?? 0),
    }), { clicks: 0, impressions: 0 });

  const cur = sumBranded(curRows);
  const prev = sumBranded(prevRows);
  const growth = prev.clicks > 0 ? ((cur.clicks - prev.clicks) / prev.clicks) * 100 : null;

  return {
    configured: true,
    terms,
    clicks: cur.clicks,
    impressions: cur.impressions,
    ctr: cur.impressions > 0 ? (cur.clicks / cur.impressions) * 100 : 0,
    prev_clicks: prev.clicks,
    growth_pct: growth,
  };
}

export async function getBrandedSearchTrend(start, end, creds) {
  const terms = resolveBrandTerms(creds);
  if (!terms.length) return [];

  const rows = await query({
    startDate: start,
    endDate: end,
    dimensions: ['date', 'query'],
    rowLimit: 25000,
  }, creds);

  const byDate = new Map();
  for (const r of rows) {
    if (!isBrandedQuery(r.keys[1], terms)) continue;
    const date = r.keys[0];
    const cur = byDate.get(date) ?? { date, clicks: 0, impressions: 0 };
    cur.clicks += r.clicks ?? 0;
    cur.impressions += r.impressions ?? 0;
    byDate.set(date, cur);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getPositionTrend(start, end, creds) {
  const rows = await query({
    startDate: start,
    endDate: end,
    dimensions: ['date'],
    rowLimit: 25000,
  }, creds);

  return rows
    .map(r => ({
      date: r.keys[0],
      position: Math.round((r.position ?? 0) * 10) / 10,
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
