import axios from 'axios';

const BASE = 'https://a.klaviyo.com/api';
const REVISION = '2024-10-15';
const CONVERSION_METRIC = 'VVw3HB';

const STATS = [
  'opens', 'open_rate', 'opens_unique',
  'clicks', 'click_rate', 'click_to_open_rate', 'clicks_unique',
  'unsubscribes', 'unsubscribe_rate',
  'delivered', 'delivery_rate', 'recipients'
];

function headers(creds) {
  return {
    Authorization: `Klaviyo-API-Key ${creds.api_key}`,
    revision: REVISION,
    'content-type': 'application/json',
    accept: 'application/json'
  };
}

async function withRetry(fn, retries = 4) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 && i < retries) {
        const retryAfterHeader = err.response?.headers?.['retry-after'];
        const detail = err.response?.data?.errors?.[0]?.detail ?? '';
        const match = detail.match(/(\d+) second/);
        const seconds = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : match ? parseInt(match[1], 10) : 2 ** i;
        const wait = Math.min(seconds * 1000 + 500, 65000);
        console.log(`[klaviyo] 429 throttled — waiting ${Math.round(wait / 1000)}s (attempt ${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

function reportBody(type, start, end) {
  return {
    data: {
      type,
      attributes: {
        timeframe: { start: `${start}T00:00:00`, end: `${end}T23:59:59` },
        conversion_metric_id: CONVERSION_METRIC,
        statistics: STATS
      }
    }
  };
}

// In-flight deduplication: if two callers request the same report simultaneously,
// only one HTTP request is made to Klaviyo — both callers share the same promise.
const _inFlight = new Map();

function dedupe(key, fn) {
  if (_inFlight.has(key)) return _inFlight.get(key);
  const p = fn().finally(() => _inFlight.delete(key));
  _inFlight.set(key, p);
  return p;
}

async function fetchFlowReport(start, end, creds) {
  return dedupe(`flow_${creds.api_key}_${start}_${end}`, async () => {
    const res = await withRetry(() => axios.post(
      `${BASE}/flow-values-reports/`,
      reportBody('flow-values-report', start, end),
      { headers: headers(creds) }
    ));
    return res.data?.data?.attributes?.results ?? [];
  });
}

async function fetchCampaignReport(start, end, creds) {
  return dedupe(`campaign_${creds.api_key}_${start}_${end}`, async () => {
    const res = await withRetry(() => axios.post(
      `${BASE}/campaign-values-reports/`,
      reportBody('campaign-values-report', start, end),
      { headers: headers(creds) }
    ));
    return res.data?.data?.attributes?.results ?? [];
  });
}

async function fetchFlowList(creds) {
  const res = await withRetry(() => axios.get(`${BASE}/flows/`, {
    headers: headers(creds),
    params: { 'fields[flow]': 'name,status', 'page[size]': 50 }
  }));
  return res.data?.data ?? [];
}

async function fetchCampaignList(creds) {
  const url = `${BASE}/campaigns/?filter=equals(messages.channel,'email')&fields[campaign]=name,status,send_time`;
  const res = await withRetry(() => axios.get(url, { headers: headers(creds) }));
  return res.data?.data ?? [];
}

function getFlowId(item) {
  return item.flow_id ?? item.groupings?.flow_id ?? null;
}

function getCampaignId(item) {
  return item.campaign_id ?? item.groupings?.campaign_id ?? null;
}

function aggregateResults(results, idFn, nameMap) {
  const byId = {};
  for (const item of results) {
    const id = idFn(item);
    if (!id) continue;
    if (!byId[id]) {
      byId[id] = { id, name: nameMap[id] ?? id, delivered: 0, recipients: 0, opens: 0, clicks: 0, unsubscribes: 0 };
    }
    const s = item.statistics ?? {};
    byId[id].delivered    += s.delivered      ?? 0;
    byId[id].recipients   += s.recipients     ?? 0;
    byId[id].opens        += s.opens_unique   ?? s.opens  ?? 0;
    byId[id].clicks       += s.clicks_unique  ?? s.clicks ?? 0;
    byId[id].unsubscribes += s.unsubscribes   ?? 0;
  }
  return Object.values(byId).map(f => {
    const d = f.delivered || 1;
    return {
      ...f,
      open_rate:  (f.opens / d) * 100,
      click_rate: (f.clicks / d) * 100,
      ctor:       f.opens ? (f.clicks / f.opens) * 100 : 0,
      unsub_rate: (f.unsubscribes / d) * 100
    };
  });
}

function sumAll(items) {
  return items.reduce((acc, f) => ({
    delivered:    acc.delivered    + f.delivered,
    recipients:   acc.recipients   + f.recipients,
    opens:        acc.opens        + f.opens,
    clicks:       acc.clicks       + f.clicks,
    unsubscribes: acc.unsubscribes + f.unsubscribes
  }), { delivered: 0, recipients: 0, opens: 0, clicks: 0, unsubscribes: 0 });
}

function withRates(totals) {
  const d = totals.delivered || 1;
  return {
    ...totals,
    open_rate:  (totals.opens / d) * 100,
    click_rate: (totals.clicks / d) * 100,
    ctor:       totals.opens ? (totals.clicks / totals.opens) * 100 : 0,
    unsub_rate: (totals.unsubscribes / d) * 100
  };
}

export async function getKlaviyoSummary(start, end, compareStart, compareEnd, creds) {
  const [flowResults, campaignResults] = await Promise.all([
    fetchFlowReport(start, end, creds),
    fetchCampaignReport(start, end, creds)
  ]);

  const allItems = [...flowResults, ...campaignResults];
  const current = withRates(sumAll(
    aggregateResults(allItems, item => item.flow_id ?? item.campaign_id ?? item.groupings?.flow_id ?? item.groupings?.campaign_id, {})
  ));

  let prev = null;
  if (compareStart && compareEnd) {
    const [pFlow, pCampaign] = await Promise.all([
      fetchFlowReport(compareStart, compareEnd, creds),
      fetchCampaignReport(compareStart, compareEnd, creds)
    ]);
    const pAll = [...pFlow, ...pCampaign];
    prev = withRates(sumAll(
      aggregateResults(pAll, item => item.flow_id ?? item.campaign_id ?? item.groupings?.flow_id ?? item.groupings?.campaign_id, {})
    ));
  }

  return { current, prev };
}

export async function getKlaviyoFlows(start, end, creds) {
  const [results, flowList] = await Promise.all([
    fetchFlowReport(start, end, creds),
    fetchFlowList(creds)
  ]);

  const nameMap = {};
  for (const f of flowList) {
    nameMap[f.id] = f.attributes?.name ?? f.id;
  }

  return aggregateResults(results, getFlowId, nameMap);
}

// Per-client lists cache
const _listsCache = new Map();
const LISTS_TTL = 5 * 60 * 1000;

export async function getKlaviyoLists(creds) {
  const key = creds.clientId;
  const cached = _listsCache.get(key);
  if (cached && Date.now() - cached.at < LISTS_TTL) return cached.data;

  const [listsRes, segmentsRes] = await Promise.allSettled([
    withRetry(() => axios.get(`${BASE}/lists`, { headers: headers(creds) })),
    withRetry(() => axios.get(`${BASE}/segments`, { headers: headers(creds) })),
  ]);

  if (listsRes.status === 'rejected') {
    const detail = listsRes.reason?.response?.data ?? listsRes.reason?.message;
    console.error('[klaviyo/lists] error:', JSON.stringify(detail, null, 2));
    throw listsRes.reason;
  }

  const rawLists = listsRes.value.data.data ?? [];

  const lists = [];
  for (const l of rawLists) {
    let profile_count = null;
    try {
      const r = await withRetry(() => axios.get(`${BASE}/lists/${l.id}`, {
        headers: headers(creds),
        params: { 'additional-fields[list]': 'profile_count' }
      }));
      profile_count = r.data?.data?.attributes?.profile_count ?? null;
    } catch { /* not available */ }
    lists.push({
      id: l.id,
      name: l.attributes.name ?? l.attributes.list_name ?? l.id,
      profile_count,
      created: l.attributes.created ?? l.attributes.created_at ?? null,
      updated: l.attributes.updated ?? l.attributes.updated_at ?? null,
    });
  }

  const segments = segmentsRes.status === 'fulfilled'
    ? (segmentsRes.value.data.data ?? []).map(s => ({
        id: s.id,
        name: s.attributes.name ?? s.id,
        created: s.attributes.created ?? s.attributes.created_at ?? null,
        updated: s.attributes.updated ?? s.attributes.updated_at ?? null,
      }))
    : [];

  const data = { lists, segments };
  _listsCache.set(key, { data, at: Date.now() });
  return data;
}

export async function getKlaviyoCampaigns(start, end, creds) {
  const [results, campaignList] = await Promise.all([
    fetchCampaignReport(start, end, creds),
    fetchCampaignList(creds)
  ]);

  const nameMap = {};
  for (const c of campaignList) {
    nameMap[c.id] = c.attributes?.name ?? c.id;
  }

  return aggregateResults(results, getCampaignId, nameMap);
}
