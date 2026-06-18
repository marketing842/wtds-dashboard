import axios from 'axios';

const BASE = 'https://googleads.googleapis.com/v22';

// Cache keyed by clientId + oauth_client_id so credential changes invalidate automatically
const _tokenCache = new Map();

async function getAccessToken(creds) {
  const key = `${creds.clientId}_${creds.oauth_client_id}`;
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

async function gaqlQuery(customerId, query, creds) {
  const token = await getAccessToken(creds);
  const cid = customerId.replace(/-/g, '');
  const res = await axios.post(
    `${BASE}/customers/${cid}/googleAds:searchStream`,
    { query },
    {
      headers: {
        Authorization:       `Bearer ${token}`,
        'developer-token':   creds.developer_token,
        'login-customer-id': creds.mcc_id,
        'Content-Type':      'application/json',
      }
    }
  );
  return res.data.flatMap(batch => batch.results ?? []);
}

export async function getGoogleAdsSummary(customerId, start, end, creds) {
  const rows = await gaqlQuery(customerId, `
    SELECT
      campaign.id,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status != 'REMOVED'
  `, creds);

  if (!rows.length) return { impressions: 0, clicks: 0, cost: 0, conversions: 0, ctr: 0, avg_cpc: 0, cpa: 0 };

  let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
  for (const row of rows) {
    impressions += Number(row.metrics.impressions ?? 0);
    clicks      += Number(row.metrics.clicks      ?? 0);
    costMicros  += Number(row.metrics.costMicros  ?? row.metrics.cost_micros ?? 0);
    conversions += Number(row.metrics.conversions ?? 0);
  }
  const cost = costMicros / 1_000_000;
  return {
    impressions,
    clicks,
    cost,
    conversions,
    ctr:     impressions > 0 ? (clicks / impressions) * 100 : 0,
    avg_cpc: clicks > 0 ? cost / clicks : 0,
    cpa:     conversions > 0 ? cost / conversions : 0,
  };
}

export async function getGoogleAdsCampaigns(customerId, start, end, creds) {
  const rows = await gaqlQuery(customerId, `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `, creds);

  return rows.map(r => {
    const cost        = (Number(r.metrics.costMicros ?? r.metrics.cost_micros ?? 0)) / 1_000_000;
    const conversions = Number(r.metrics.conversions ?? 0);
    return {
      id:          r.campaign.id,
      name:        r.campaign.name,
      status:      r.campaign.status,
      impressions: Number(r.metrics.impressions ?? 0),
      clicks:      Number(r.metrics.clicks ?? 0),
      cost,
      conversions,
      ctr:         Number(r.metrics.ctr ?? 0) * 100,
      avg_cpc:     (Number(r.metrics.averageCpc ?? r.metrics.average_cpc ?? 0)) / 1_000_000,
      cpa:         conversions > 0 ? cost / conversions : 0
    };
  });
}

export async function getGoogleAdsKeywords(customerId, start, end, creds) {
  const rows = await gaqlQuery(customerId, `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM keyword_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 100
  `, creds);

  return rows.map(r => ({
    text:        r.adGroupCriterion?.keyword?.text ?? r.ad_group_criterion?.keyword?.text,
    match_type:  r.adGroupCriterion?.keyword?.matchType ?? r.ad_group_criterion?.keyword?.match_type,
    impressions: Number(r.metrics.impressions ?? 0),
    clicks:      Number(r.metrics.clicks ?? 0),
    cost:        (Number(r.metrics.costMicros ?? r.metrics.cost_micros ?? 0)) / 1_000_000,
    conversions: Number(r.metrics.conversions ?? 0),
    ctr:         Number(r.metrics.ctr ?? 0) * 100,
    avg_cpc:     (Number(r.metrics.averageCpc ?? r.metrics.average_cpc ?? 0)) / 1_000_000
  }));
}
