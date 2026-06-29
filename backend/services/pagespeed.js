import axios from 'axios';

export async function getPageSpeedSummary(siteUrl, strategy = 'mobile') {
  if (!siteUrl) {
    return { configured: false, error: 'No site URL configured' };
  }

  const url = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl.replace(/^\/\//, '')}`;
  const apiKey = process.env.PAGESPEED_API_KEY;

  try {
    const res = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
      params: {
        url,
        strategy,
        category: 'performance',
        ...(apiKey ? { key: apiKey } : {}),
      },
      timeout: 60_000,
    });

    const lh = res.data.lighthouseResult;
    const perf = lh?.categories?.performance?.score;
    const audits = lh?.audits ?? {};

    return {
      configured: true,
      url,
      strategy,
      score: perf != null ? Math.round(perf * 100) : null,
      lcp_ms: audits['largest-contentful-paint']?.numericValue ?? null,
      fcp_ms: audits['first-contentful-paint']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      tbt_ms: audits['total-blocking-time']?.numericValue ?? null,
    };
  } catch (err) {
    const msg = err.response?.data?.error?.message ?? err.message;
    return { configured: true, url, strategy, error: msg, score: null };
  }
}
