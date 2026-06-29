import { getGoogleAdsSummary } from './google-ads.js';
import { getMetaSummary } from './meta.js';
import { getKlaviyoSummary } from './klaviyo.js';
import { getSearchConsoleSummary } from './search-console.js';

const DEAL_VALUE = Number(process.env.PIPELINE_DEAL_VALUE ?? 2000);

function monthRanges(count = 6) {
  const ranges = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    ranges.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      start: d.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });
  }
  return ranges;
}

function metaLeads(m) {
  return (m?.leads ?? 0) || (m?.purchases ?? 0);
}

function growthPct(current, prev) {
  return prev > 0 ? ((current - prev) / prev) * 100 : null;
}

export async function getOverviewExtended(creds, start, end, compareStart, compareEnd) {
  const clientId = creds.clientId;
  const months = monthRanges(6);
  const gCreds = creds.google_ads ? { ...creds.google_ads, clientId } : null;
  const mCreds = creds.meta ?? null;
  const kCreds = creds.klaviyo ? { ...creds.klaviyo, clientId } : null;
  const scCreds = creds.search_console ? { ...creds.search_console, clientId } : null;

  const monthly = await Promise.all(
    months.map(async ({ key, start: ms, end: me }) => {
      const [g, m] = await Promise.all([
        gCreds?.customer_id
          ? getGoogleAdsSummary(gCreds.customer_id, ms, me, gCreds).catch(() => null)
          : Promise.resolve(null),
        mCreds
          ? getMetaSummary(ms, me, mCreds).catch(() => null)
          : Promise.resolve(null),
      ]);
      const gLeads = g?.conversions ?? 0;
      const mLeads = metaLeads(m);
      return { month: key, gAds: gLeads, meta: mLeads, total: gLeads + mLeads };
    }),
  );

  const [gCur, gPrev, mCur, mPrev, kSummary, scCur, scPrev] = await Promise.all([
    gCreds?.customer_id && start && end
      ? getGoogleAdsSummary(gCreds.customer_id, start, end, gCreds).catch(() => null)
      : Promise.resolve(null),
    gCreds?.customer_id && compareStart && compareEnd
      ? getGoogleAdsSummary(gCreds.customer_id, compareStart, compareEnd, gCreds).catch(() => null)
      : Promise.resolve(null),
    mCreds && start && end
      ? getMetaSummary(start, end, mCreds).catch(() => null)
      : Promise.resolve(null),
    mCreds && compareStart && compareEnd
      ? getMetaSummary(compareStart, compareEnd, mCreds).catch(() => null)
      : Promise.resolve(null),
    kCreds && start && end
      ? getKlaviyoSummary(start, end, compareStart, compareEnd, kCreds).catch(() => null)
      : Promise.resolve(null),
    scCreds && start && end
      ? getSearchConsoleSummary(start, end, scCreds).catch(() => null)
      : Promise.resolve(null),
    scCreds && compareStart && compareEnd
      ? getSearchConsoleSummary(compareStart, compareEnd, scCreds).catch(() => null)
      : Promise.resolve(null),
  ]);

  const channels = [
    { id: 'gAds', current: gCur?.conversions ?? 0, prev: gPrev?.conversions ?? 0 },
    { id: 'meta', current: metaLeads(mCur), prev: metaLeads(mPrev) },
    { id: 'klaviyo', current: kSummary?.current?.delivered ?? 0, prev: kSummary?.prev?.delivered ?? 0 },
    { id: 'gsc', current: scCur?.clicks ?? 0, prev: scPrev?.clicks ?? 0 },
  ].map(ch => ({
    ...ch,
    growth_pct: growthPct(ch.current, ch.prev),
  }));

  const paidLeads = (gCur?.conversions ?? 0) + metaLeads(mCur);
  const pipeline = {
    deal_value: DEAL_VALUE,
    total_leads: paidLeads,
    estimated_value: paidLeads * DEAL_VALUE,
    by_channel: [
      { id: 'gAds', leads: gCur?.conversions ?? 0, value: (gCur?.conversions ?? 0) * DEAL_VALUE },
      { id: 'meta', leads: metaLeads(mCur), value: metaLeads(mCur) * DEAL_VALUE },
    ],
  };

  return { monthly, mom: channels, pipeline };
}
