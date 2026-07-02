import axios from 'axios';

const BASE = 'https://graph.facebook.com/v22.0';

function parseNum(v) { return parseFloat(v ?? 0) || 0; }
function parseInt2(v) { return parseInt(v ?? 0) || 0; }

function extractActions(actions, type) {
  return parseNum(actions?.find(a => a.action_type === type)?.value);
}

function mapInsights(ins) {
  const spend = parseNum(ins.spend);
  const purchases = extractActions(ins.actions, 'purchase') || extractActions(ins.actions, 'offsite_conversion.fb_pixel_purchase');
  const purchaseValue = extractActions(ins.action_values, 'purchase') || extractActions(ins.action_values, 'offsite_conversion.fb_pixel_purchase');
  const leads = extractActions(ins.actions, 'lead')
    || extractActions(ins.actions, 'onsite_conversion.lead_grouped')
    || extractActions(ins.actions, 'offsite_conversion.fb_pixel_lead');
  const impressions = parseInt2(ins.impressions);
  const uniqueClicks = parseInt2(ins.unique_clicks);
  return {
    impressions,
    clicks: parseInt2(ins.clicks),
    spend,
    reach: parseInt2(ins.reach),
    cpc: parseNum(ins.cpc),
    ctr: parseNum(ins.ctr),
    cpm: parseNum(ins.cpm),
    frequency: parseNum(ins.frequency),
    unique_clicks: uniqueClicks,
    unique_ctr: parseNum(ins.unique_ctr) || (impressions > 0 && uniqueClicks > 0 ? (uniqueClicks / impressions) * 100 : 0),
    purchases,
    leads,
    purchase_value: purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
  };
}

/** Meta video_play_curve_actions index → time label (seconds 0–14, then buckets). */
const VIDEO_CURVE_LABELS = [
  ...Array.from({ length: 15 }, (_, i) => `${i}s`),
  '15–20s', '20–25s', '25–30s',
  '30–40s', '40–50s', '50–60s',
  '60s+',
];

function parseVideoPlayCurve(ins) {
  const raw = ins?.video_play_curve_actions?.[0]?.value;
  if (raw == null) return null;

  let points;
  if (Array.isArray(raw)) {
    points = raw.map(v => parseFloat(v)).filter(n => !Number.isNaN(n));
  } else if (typeof raw === 'string') {
    points = raw.split(/[,[\]]+/).map(s => parseFloat(s.trim())).filter(n => !Number.isNaN(n));
  } else {
    return null;
  }
  if (!points.length) return null;

  return points.slice(0, VIDEO_CURVE_LABELS.length).map((pct, i) => ({
    label: VIDEO_CURVE_LABELS[i] ?? `${i}s`,
    pct: Math.round(pct * 10) / 10,
  }));
}

const VIDEO_INSIGHT_FIELDS = 'impressions,clicks,spend,ctr,video_play_actions,video_30_sec_watched_actions,video_avg_time_watched_actions,video_play_curve_actions,actions,action_values';

function creativeRankingMode(ads) {
  const totalLeads = ads.reduce((s, a) => s + (a.leads || 0), 0);
  const totalPurchases = ads.reduce((s, a) => s + (a.purchases || 0), 0);
  if (totalLeads > 0 && totalLeads >= totalPurchases) return 'leads';
  if (totalPurchases > 0) return 'purchases';
  return 'spend';
}

function rankCreatives(ads) {
  const mode = creativeRankingMode(ads);
  return [...ads].sort((a, b) => {
    if (mode === 'leads') {
      const aLeads = a.leads || 0;
      const bLeads = b.leads || 0;
      if (bLeads !== aLeads) return bLeads - aLeads;
      if (aLeads > 0 && bLeads > 0) {
        const aCpl = a.spend / aLeads;
        const bCpl = b.spend / bLeads;
        if (aCpl !== bCpl) return aCpl - bCpl;
      }
    } else if (mode === 'purchases') {
      const aPurchases = a.purchases || 0;
      const bPurchases = b.purchases || 0;
      if (bPurchases !== aPurchases) return bPurchases - aPurchases;
      if (aPurchases > 0 && bPurchases > 0) {
        const aCpp = a.spend / aPurchases;
        const bCpp = b.spend / bPurchases;
        if (aCpp !== bCpp) return aCpp - bCpp;
      }
      const aRoas = a.roas ?? 0;
      const bRoas = b.roas ?? 0;
      if (bRoas !== aRoas) return bRoas - aRoas;
    } else if (b.spend !== a.spend) {
      return b.spend - a.spend;
    }

    const aSoft = (a.hold_rate ?? 0) + (a.thumbstop_rate ?? 0);
    const bSoft = (b.hold_rate ?? 0) + (b.thumbstop_rate ?? 0);
    if (bSoft !== aSoft) return bSoft - aSoft;
    return b.spend - a.spend;
  });
}

export async function getMetaSummary(start, end, creds) {
  const res = await axios.get(`${BASE}/${creds.ad_account_id}/insights`, {
    params: {
      access_token: creds.access_token,
      fields: 'impressions,clicks,spend,reach,cpc,ctr,cpm,frequency,unique_clicks,unique_ctr,actions,action_values',
      time_range: JSON.stringify({ since: start, until: end }),
      level: 'account',
    },
  });
  const d = res.data.data?.[0];
  if (!d) {
    return {
      impressions: 0, clicks: 0, spend: 0, reach: 0, cpc: 0, ctr: 0,
      cpm: 0, frequency: 0, unique_clicks: 0, unique_ctr: 0,
      purchases: 0, leads: 0, purchase_value: 0, roas: 0,
    };
  }
  return mapInsights(d);
}

export async function getMetaAdCreatives(start, end, creds) {
  const res = await axios.get(`${BASE}/${creds.ad_account_id}/ads`, {
    params: {
      access_token: creds.access_token,
      fields: `id,name,effective_status,adset{id,name},insights.time_range({"since":"${start}","until":"${end}"}){${VIDEO_INSIGHT_FIELDS}}`,
      limit: 50,
    },
  });

  const mapped = (res.data.data ?? [])
    .map(ad => {
      const ins = ad.insights?.data?.[0];
      if (!ins) return null;
      const impressions = parseInt2(ins.impressions);
      const spend = parseNum(ins.spend);
      if (impressions === 0 && spend === 0) return null;

      const videoPlays  = parseNum(ins.video_play_actions?.[0]?.value);
      const video30sec  = parseNum(ins.video_30_sec_watched_actions?.[0]?.value);
      const avgWatchSec = parseNum(ins.video_avg_time_watched_actions?.[0]?.value);
      const purchases   = extractActions(ins.actions, 'purchase') || extractActions(ins.actions, 'offsite_conversion.fb_pixel_purchase');
      const purchaseVal = extractActions(ins.action_values, 'purchase') || extractActions(ins.action_values, 'offsite_conversion.fb_pixel_purchase');
      const leads       = extractActions(ins.actions, 'lead') || extractActions(ins.actions, 'onsite_conversion.lead_grouped') || extractActions(ins.actions, 'offsite_conversion.fb_pixel_lead');
      const isVideo     = videoPlays > 0;

      return {
        id: ad.id,
        name: ad.name,
        status: ad.effective_status,
        adset_id: ad.adset?.id ?? null,
        adset_name: ad.adset?.name ?? null,
        impressions,
        clicks: parseInt2(ins.clicks),
        spend,
        ctr: parseNum(ins.ctr),
        purchases,
        leads,
        roas: spend > 0 ? purchaseVal / spend : 0,
        is_video: isVideo,
        is_static: !isVideo,
        thumbstop_rate: impressions > 0 && videoPlays > 0 ? (videoPlays / impressions) * 100 : null,
        hold_rate: videoPlays > 0 && video30sec > 0 ? (video30sec / videoPlays) * 100 : null,
        avg_watch_sec: avgWatchSec > 0 ? avgWatchSec : null,
      };
    })
    .filter(Boolean);

  return rankCreatives(mapped).slice(0, 3);
}

export async function getMetaAdCreativesChart(start, end, creds, limit = 8) {
  const res = await axios.get(`${BASE}/${creds.ad_account_id}/ads`, {
    params: {
      access_token: creds.access_token,
      fields: `id,name,effective_status,insights.time_range({"since":"${start}","until":"${end}"}){${VIDEO_INSIGHT_FIELDS}}`,
      limit: 50,
    },
  });

  const mapped = (res.data.data ?? [])
    .map(ad => {
      const ins = ad.insights?.data?.[0];
      if (!ins) return null;
      const impressions = parseInt2(ins.impressions);
      const spend = parseNum(ins.spend);
      if (impressions === 0 && spend === 0) return null;

      const videoPlays = parseNum(ins.video_play_actions?.[0]?.value);
      const video30sec = parseNum(ins.video_30_sec_watched_actions?.[0]?.value);
      const isVideo = videoPlays > 0;

      return {
        id: ad.id,
        name: ad.name,
        is_video: isVideo,
        thumbstop_rate: impressions > 0 && videoPlays > 0 ? (videoPlays / impressions) * 100 : null,
        hold_rate: videoPlays > 0 && video30sec > 0 ? (video30sec / videoPlays) * 100 : null,
        spend,
        leads: extractActions(ins.actions, 'lead')
          || extractActions(ins.actions, 'onsite_conversion.lead_grouped')
          || extractActions(ins.actions, 'offsite_conversion.fb_pixel_lead'),
      };
    })
    .filter(Boolean);

  return rankCreatives(mapped).slice(0, limit);
}

export async function getMetaRetentionCurves(start, end, creds, limit = 3) {
  const res = await axios.get(`${BASE}/${creds.ad_account_id}/ads`, {
    params: {
      access_token: creds.access_token,
      fields: `id,name,effective_status,insights.time_range({"since":"${start}","until":"${end}"}){${VIDEO_INSIGHT_FIELDS}}`,
      limit: 50,
    },
  });

  const mapped = (res.data.data ?? [])
    .map(ad => {
      const ins = ad.insights?.data?.[0];
      if (!ins) return null;
      const impressions = parseInt2(ins.impressions);
      const spend = parseNum(ins.spend);
      if (impressions === 0 && spend === 0) return null;

      const videoPlays = parseNum(ins.video_play_actions?.[0]?.value);
      const curve = parseVideoPlayCurve(ins);
      if (!videoPlays || !curve?.length) return null;

      return {
        id: ad.id,
        name: ad.name,
        spend,
        impressions,
        thumbstop_rate: impressions > 0 ? (videoPlays / impressions) * 100 : null,
        retention_curve: curve,
      };
    })
    .filter(Boolean);

  return rankCreatives(mapped).slice(0, limit);
}

export async function getMetaDailyInsights(start, end, creds) {
  const res = await axios.get(`${BASE}/${creds.ad_account_id}/insights`, {
    params: {
      access_token: creds.access_token,
      fields: 'spend,impressions,clicks,actions,date_start',
      time_range: JSON.stringify({ since: start, until: end }),
      time_increment: 1,
      level: 'account',
    },
  });

  return (res.data.data ?? []).map(d => {
    const spend = parseNum(d.spend);
    const leads = extractActions(d.actions, 'lead')
      || extractActions(d.actions, 'onsite_conversion.lead_grouped')
      || extractActions(d.actions, 'offsite_conversion.fb_pixel_lead');
    const purchases = extractActions(d.actions, 'purchase')
      || extractActions(d.actions, 'offsite_conversion.fb_pixel_purchase');
    return {
      date: d.date_start,
      spend,
      clicks: parseInt2(d.clicks),
      impressions: parseInt2(d.impressions),
      leads,
      results: leads + purchases,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMetaCampaigns(start, end, creds) {
  const res = await axios.get(`${BASE}/${creds.ad_account_id}/campaigns`, {
    params: {
      access_token: creds.access_token,
      fields: `id,name,effective_status,insights.time_range({"since":"${start}","until":"${end}"}){impressions,clicks,spend,reach,cpc,ctr,cpm,frequency,unique_clicks,unique_ctr,actions,action_values}`,
      limit: 50,
    },
  });

  return (res.data.data ?? []).map(c => {
    const ins = c.insights?.data?.[0] ?? {};
    return { id: c.id, name: c.name, status: c.effective_status, ...mapInsights(ins) };
  });
}

async function countActiveAdsInRange(start, end, creds) {
  let count = 0;
  let url = `${BASE}/${creds.ad_account_id}/ads`;
  let params = {
    access_token: creds.access_token,
    fields: `id,insights.time_range({"since":"${start}","until":"${end}"}){impressions,spend}`,
    limit: 500,
  };

  while (url) {
    const res = await axios.get(url, { params });
    for (const ad of res.data.data ?? []) {
      const ins = ad.insights?.data?.[0];
      const imp = parseInt2(ins?.impressions);
      const spend = parseNum(ins?.spend);
      if (imp > 0 || spend > 0) count++;
    }
    const next = res.data.paging?.next;
    if (!next) break;
    url = next;
    params = {};
  }
  return count;
}

export async function getMetaAdCounts(start, end, compareStart, compareEnd, creds) {
  const current = await countActiveAdsInRange(start, end, creds);
  const previous = compareStart && compareEnd
    ? await countActiveAdsInRange(compareStart, compareEnd, creds)
    : null;
  return { current, previous };
}

export async function getMetaCampaignTree(start, end, creds) {
  const timeRange = JSON.stringify({ since: start, until: end });
  const insightFields = 'impressions,clicks,spend,reach,cpc,ctr,cpm,frequency,unique_clicks,unique_ctr,actions,action_values';

  const [campRes, adsetRes] = await Promise.all([
    axios.get(`${BASE}/${creds.ad_account_id}/campaigns`, {
      params: {
        access_token: creds.access_token,
        fields: `id,name,effective_status,insights.time_range(${timeRange}){${insightFields}}`,
        limit: 50,
      },
    }),
    axios.get(`${BASE}/${creds.ad_account_id}/adsets`, {
      params: {
        access_token: creds.access_token,
        fields: `id,name,effective_status,campaign{id,name},insights.time_range(${timeRange}){${insightFields}}`,
        limit: 100,
      },
    }),
  ]);

  const campaigns = (campRes.data.data ?? []).map(c => {
    const ins = c.insights?.data?.[0] ?? {};
    return { id: c.id, name: c.name, status: c.effective_status, ...mapInsights(ins) };
  });

  const adsetsByCampaign = new Map();
  for (const a of adsetRes.data.data ?? []) {
    const cid = a.campaign?.id;
    if (!cid) continue;
    const ins = a.insights?.data?.[0] ?? {};
    const row = { id: a.id, name: a.name, status: a.effective_status, ...mapInsights(ins) };
    if (!adsetsByCampaign.has(cid)) adsetsByCampaign.set(cid, []);
    adsetsByCampaign.get(cid).push(row);
  }

  return campaigns
    .map(c => ({ ...c, adsets: adsetsByCampaign.get(c.id) ?? [] }))
    .filter(c => c.impressions > 0 || c.spend > 0 || c.adsets.length > 0)
    .sort((a, b) => b.spend - a.spend);
}

export async function getMetaDemographics(start, end, creds) {
  const res = await axios.get(`${BASE}/${creds.ad_account_id}/insights`, {
    params: {
      access_token: creds.access_token,
      fields: 'impressions,clicks,spend,actions',
      time_range: JSON.stringify({ since: start, until: end }),
      level: 'account',
      breakdowns: 'age',
    },
  });

  const ages = (res.data.data ?? []).map(row => {
    const impressions = parseInt2(row.impressions);
    const clicks = parseInt2(row.clicks);
    const spend = parseNum(row.spend);
    const leads = extractActions(row.actions, 'lead')
      || extractActions(row.actions, 'onsite_conversion.lead_grouped')
      || extractActions(row.actions, 'offsite_conversion.fb_pixel_lead');
    return {
      age: row.age ?? 'unknown',
      impressions,
      clicks,
      spend,
      leads,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    };
  }).filter(r => r.impressions > 0 || r.spend > 0);

  return { ages: ages.sort((a, b) => b.impressions - a.impressions) };
}
