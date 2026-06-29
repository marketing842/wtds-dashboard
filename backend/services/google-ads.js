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

export async function getGoogleAdsDailySeries(customerId, start, end, creds) {
  const rows = await gaqlQuery(customerId, `
    SELECT
      segments.date,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros,
      metrics.impressions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date
  `, creds);

  const byDate = new Map();
  for (const row of rows) {
    const date = row.segments?.date;
    if (!date) continue;
    const cur = byDate.get(date) ?? { date, clicks: 0, conversions: 0, cost: 0, impressions: 0 };
    cur.clicks      += Number(row.metrics.clicks ?? 0);
    cur.conversions += Number(row.metrics.conversions ?? 0);
    cur.cost        += Number(row.metrics.costMicros ?? row.metrics.cost_micros ?? 0) / 1_000_000;
    cur.impressions += Number(row.metrics.impressions ?? 0);
    byDate.set(date, cur);
  }

  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      cpa: d.conversions > 0 ? d.cost / d.conversions : 0,
    }));
}

export async function getGoogleAdsImpressionShare(customerId, start, end, creds) {
  const rows = await gaqlQuery(customerId, `
    SELECT
      metrics.impressions,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status != 'REMOVED'
      AND campaign.advertising_channel_type = 'SEARCH'
  `, creds);

  if (!rows.length) {
    return { won: 0, lost_budget: 0, lost_rank: 0 };
  }

  let totalImp = 0;
  let won = 0, lostBudget = 0, lostRank = 0;
  for (const row of rows) {
    const imp = Number(row.metrics.impressions ?? 0);
    if (imp === 0) continue;
    totalImp += imp;
    won        += imp * Number(row.metrics.searchImpressionShare ?? row.metrics.search_impression_share ?? 0);
    lostBudget += imp * Number(row.metrics.searchBudgetLostImpressionShare ?? row.metrics.search_budget_lost_impression_share ?? 0);
    lostRank   += imp * Number(row.metrics.searchRankLostImpressionShare ?? row.metrics.search_rank_lost_impression_share ?? 0);
  }

  if (totalImp === 0) return { won: 0, lost_budget: 0, lost_rank: 0 };

  return {
    won:         Math.round((won / totalImp) * 1000) / 10,
    lost_budget: Math.round((lostBudget / totalImp) * 1000) / 10,
    lost_rank:   Math.round((lostRank / totalImp) * 1000) / 10,
  };
}
