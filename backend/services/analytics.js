import axios from 'axios';

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
    }
  });
  _tokenCache.set(key, { token: res.data.access_token, expiry: Date.now() + res.data.expires_in * 1000 });
  return res.data.access_token;
}

async function runReport(body, creds) {
  const token = await getAccessToken(creds);
  const res = await axios.post(
    `https://analyticsdata.googleapis.com/v1beta/properties/${creds.property_id}:runReport`,
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function getGA4Summary(start, end, creds) {
  const data = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'newUsers' },
    ],
    metricAggregations: ['TOTAL'],
  }, creds);

  const t = (data.totals?.[0]?.metricValues ?? data.rows?.[0]?.metricValues ?? []);
  return {
    users: Math.round(Number(t[0]?.value ?? 0)),
    sessions: Math.round(Number(t[1]?.value ?? 0)),
    pageviews: Math.round(Number(t[2]?.value ?? 0)),
    bounce_rate: parseFloat(((Number(t[3]?.value ?? 0)) * 100).toFixed(1)),
    avg_session: Math.round(Number(t[4]?.value ?? 0)),
    new_users: Math.round(Number(t[5]?.value ?? 0)),
  };
}

export async function getGA4TopPages(start, end, creds) {
  const data = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10,
  }, creds);

  return (data.rows ?? []).map(row => ({
    page: row.dimensionValues[0].value,
    pageviews: Number(row.metricValues[0].value),
    users: Number(row.metricValues[1].value),
    avg_session: Math.round(Number(row.metricValues[2].value)),
    bounce_rate: parseFloat((Number(row.metricValues[3].value) * 100).toFixed(1)),
  }));
}

export async function getGA4Sources(start, end, creds) {
  const data = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 8,
  }, creds);

  return (data.rows ?? []).map(row => ({
    source: row.dimensionValues[0].value,
    sessions: Number(row.metricValues[0].value),
    users: Number(row.metricValues[1].value),
  }));
}
