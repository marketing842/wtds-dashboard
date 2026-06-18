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
