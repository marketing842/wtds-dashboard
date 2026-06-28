import axios from 'axios';

const BASE = 'https://a.klaviyo.com/api';
const REVISION = '2024-10-15';
const MAX_REPORT_DAYS = 364;

/** Metrics valid as conversion_metric_id for values reports (account-specific). */
const PREFERRED_CONVERSION_METRICS = [
  'Placed Order',
  'Ordered Product',
  'Checkout Started',
  'Clicked Email',
  'Opened Email',
  'Received Email',
  'Submitted Form',
  'Form submitted by profile',
];

const BASE_STATS = [
  'opens', 'open_rate', 'opens_unique',
  'clicks', 'click_rate', 'click_to_open_rate', 'clicks_unique',
  'unsubscribes', 'unsubscribe_rate',
  'delivered', 'delivery_rate', 'recipients',
];

const CONVERSION_STATS = ['conversions', 'conversion_value'];

const _metricIdCache = new Map();

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** Klaviyo custom timeframes max 1 year — split wider ranges into chunks. */
function chunkDateRange(start, end, maxDays = MAX_REPORT_DAYS) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return [{ start, end }];
  const chunks = [];
  let cur = new Date(s);
  while (cur <= e) {
    const chunkEnd = new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() + maxDays - 1);
    if (chunkEnd > e) chunkEnd.setTime(e.getTime());
    chunks.push({ start: isoDate(cur), end: isoDate(chunkEnd) });
    cur = new Date(chunkEnd);
    cur.setDate(cur.getDate() + 1);
  }
  return chunks;
}

async function resolveConversionMetric(creds) {
  if (creds.conversion_metric_id) {
    return { id: creds.conversion_metric_id, name: creds.conversion_metric_name ?? 'custom' };
  }
  const cacheKey = creds.api_key;
  const cached = _metricIdCache.get(cacheKey);
  if (cached) return cached;

  const res = await withRetry(() => axios.get(`${BASE}/metrics/`, { headers: headers(creds) }));
  const metrics = res.data?.data ?? [];
  const byName = new Map(metrics.map(m => [m.attributes?.name, m.id]));

  for (const name of PREFERRED_CONVERSION_METRICS) {
    const id = byName.get(name);
    if (id) {
      const entry = { id, name };
      _metricIdCache.set(cacheKey, entry);
      console.log(`[klaviyo] conversion metric: "${name}" (${id})`);
      return entry;
    }
  }

  throw new Error(
    'No supported Klaviyo conversion metric found. Add conversion_metric_id in admin (Klaviyo → Metrics → copy metric ID).',
  );
}

function statisticsForMetric(metricName) {
  const commerce = ['Placed Order', 'Ordered Product', 'Checkout Started'];
  if (commerce.includes(metricName)) return [...BASE_STATS, ...CONVERSION_STATS];
  return BASE_STATS;
}

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

function reportBody(type, start, end, metric) {
  return {
    data: {
      type,
      attributes: {
        timeframe: { start: `${start}T00:00:00+00:00`, end: `${end}T23:59:59+00:00` },
        conversion_metric_id: metric.id,
        statistics: statisticsForMetric(metric.name),
      },
    },
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
    const metric = await resolveConversionMetric(creds);
    const chunks = chunkDateRange(start, end);
    const all = [];
    for (const { start: cs, end: ce } of chunks) {
      const res = await withRetry(() => axios.post(
        `${BASE}/flow-values-reports/`,
        reportBody('flow-values-report', cs, ce, metric),
        { headers: headers(creds) },
      ));
      all.push(...(res.data?.data?.attributes?.results ?? []));
    }
    return all;
  });
}

async function fetchCampaignReport(start, end, creds) {
  return dedupe(`campaign_${creds.api_key}_${start}_${end}`, async () => {
    const metric = await resolveConversionMetric(creds);
    const chunks = chunkDateRange(start, end);
    const all = [];
    for (const { start: cs, end: ce } of chunks) {
      const res = await withRetry(() => axios.post(
        `${BASE}/campaign-values-reports/`,
        reportBody('campaign-values-report', cs, ce, metric),
        { headers: headers(creds) },
      ));
      all.push(...(res.data?.data?.attributes?.results ?? []));
    }
    return all;
  });
}

async function fetchFlowList(creds) {
  const all = [];
  let url = `${BASE}/flows/`;
  let params = { 'fields[flow]': 'name,status', 'page[size]': 50 };
  while (url) {
    const res = await withRetry(() => axios.get(url, { headers: headers(creds), params }));
    all.push(...(res.data?.data ?? []));
    const next = res.data?.links?.next;
    url = next ?? null;
    params = undefined;
  }
  return all;
}

async function fetchFlowName(id, creds) {
  try {
    const res = await withRetry(() => axios.get(`${BASE}/flows/${id}/`, {
      headers: headers(creds),
      params: { 'fields[flow]': 'name' },
    }));
    return res.data?.data?.attributes?.name ?? null;
  } catch {
    return null;
  }
}

async function enrichFlowNames(items, creds, nameMap) {
  for (const item of items) {
    if (item.name && item.name !== item.id) continue;
    const cached = nameMap[item.id];
    if (cached && cached !== item.id) {
      item.name = cached;
      continue;
    }
    const fetched = await fetchFlowName(item.id, creds);
    if (fetched) {
      item.name = fetched;
      nameMap[item.id] = fetched;
    }
  }
  return items;
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
      byId[id] = { id, name: nameMap[id] ?? id, delivered: 0, recipients: 0, opens: 0, clicks: 0, unsubscribes: 0, revenue: 0, conversions: 0 };
    }
    const s = item.statistics ?? {};
    byId[id].delivered    += s.delivered      ?? 0;
    byId[id].recipients   += s.recipients     ?? 0;
    byId[id].opens        += s.opens_unique   ?? s.opens  ?? 0;
    byId[id].clicks       += s.clicks_unique  ?? s.clicks ?? 0;
    byId[id].unsubscribes += s.unsubscribes   ?? 0;
    byId[id].revenue      += s.conversion_value ?? s.revenue ?? 0;
    byId[id].conversions  += s.conversions ?? 0;
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
    unsubscribes: acc.unsubscribes + f.unsubscribes,
    revenue:      acc.revenue      + (f.revenue ?? 0),
    conversions:  acc.conversions  + (f.conversions ?? 0),
  }), { delivered: 0, recipients: 0, opens: 0, clicks: 0, unsubscribes: 0, revenue: 0, conversions: 0 });
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
    fetchFlowList(creds),
  ]);

  const nameMap = {};
  const statusMap = {};
  for (const f of flowList) {
    nameMap[f.id] = f.attributes?.name ?? f.id;
    statusMap[f.id] = f.attributes?.status ?? 'live';
  }

  const withStats = aggregateResults(results, getFlowId, nameMap);
  await enrichFlowNames(withStats, creds, nameMap);

  // Include live/draft flows even when the report period has zero sends
  if (flowList.length === 0) return withStats;

  const seen = new Set(withStats.map(f => f.id));
  for (const f of flowList) {
    if (seen.has(f.id)) continue;
    const status = statusMap[f.id];
    if (status && !['live', 'manual', 'draft'].includes(status)) continue;
    withStats.push({
      id: f.id,
      name: nameMap[f.id] ?? f.id,
      delivered: 0,
      recipients: 0,
      opens: 0,
      clicks: 0,
      unsubscribes: 0,
      revenue: 0,
      conversions: 0,
      open_rate: 0,
      click_rate: 0,
      ctor: 0,
      unsub_rate: 0,
      no_activity: true,
    });
  }

  return withStats.sort((a, b) => b.delivered - a.delivered || a.name.localeCompare(b.name));
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
