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

function rankCreatives(ads) {
  return [...ads].sort((a, b) => {
    if (b.spend !== a.spend) return b.spend - a.spend;
    const aResults = (a.leads || 0) + (a.purchases || 0);
    const bResults = (b.leads || 0) + (b.purchases || 0);
    if (bResults !== aResults) return bResults - aResults;
    const aCpr = aResults > 0 ? a.spend / aResults : Infinity;
    const bCpr = bResults > 0 ? b.spend / bResults : Infinity;
    if (aCpr !== bCpr) return aCpr - bCpr;
    const aSoft = (a.hold_rate ?? 0) + (a.thumbstop_rate ?? 0);
    const bSoft = (b.hold_rate ?? 0) + (b.thumbstop_rate ?? 0);
    return bSoft - aSoft;
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
      fields: `id,name,effective_status,adset{id,name},insights.time_range({"since":"${start}","until":"${end}"}){impressions,clicks,spend,ctr,video_play_actions,video_30_sec_watched_actions,video_avg_time_watched_actions,actions,action_values}`,
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
