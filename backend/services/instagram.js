import axios from 'axios';

const BASE = 'https://graph.facebook.com/v20.0';

// Per-client IG user ID cache
const _igCache = new Map();

async function getIgUserId(creds) {
  const key = creds.clientId;
  if (_igCache.has(key)) return _igCache.get(key);

  // Method 1: pages assigned to the system user
  try {
    const res = await axios.get(`${BASE}/me/accounts`, {
      params: { fields: 'id,name,instagram_business_account', access_token: creds.access_token }
    });
    for (const page of (res.data.data ?? [])) {
      if (page.instagram_business_account?.id) {
        _igCache.set(key, page.instagram_business_account.id);
        return page.instagram_business_account.id;
      }
    }
  } catch (_) { /* fall through */ }

  // Method 2: Business Portfolio owned pages
  const adAccRes = await axios.get(`${BASE}/${creds.ad_account_id}`, {
    params: { fields: 'business', access_token: creds.access_token }
  });
  const businessId = adAccRes.data.business?.id;
  if (!businessId) throw new Error('Cannot find Business Portfolio ID from ad account.');

  try {
    const pagesRes = await axios.get(`${BASE}/${businessId}/owned_pages`, {
      params: { fields: 'id,name,instagram_business_account', access_token: creds.access_token }
    });
    for (const page of (pagesRes.data.data ?? [])) {
      if (page.instagram_business_account?.id) {
        _igCache.set(key, page.instagram_business_account.id);
        return page.instagram_business_account.id;
      }
    }
  } catch (_) { /* fall through */ }

  // Method 3: Business instagram_accounts endpoint
  const igRes = await axios.get(`${BASE}/${businessId}/instagram_accounts`, {
    params: { fields: 'id,username', access_token: creds.access_token }
  });
  const first = igRes.data.data?.[0];
  if (first?.id) {
    _igCache.set(key, first.id);
    return first.id;
  }

  throw new Error('No Instagram Business Account found. Ensure the Instagram account is linked to the Facebook Page in Meta Business Manager.');
}

export async function getInstagramSummary(start, end, creds) {
  const igId = await getIgUserId(creds);
  const sinceUnix = Math.floor(new Date(start).getTime() / 1000);
  const untilUnix = Math.floor(new Date(end + 'T23:59:59').getTime() / 1000);

  const [accountRes, insightsRes] = await Promise.all([
    axios.get(`${BASE}/${igId}`, {
      params: { fields: 'followers_count,media_count,name,username', access_token: creds.access_token }
    }),
    axios.get(`${BASE}/${igId}/insights`, {
      params: {
        metric: 'reach,impressions,profile_views',
        period: 'total_value',
        since: sinceUnix,
        until: untilUnix,
        access_token: creds.access_token,
      }
    }).catch(() => ({ data: { data: [] } }))
  ]);

  const insights = {};
  for (const item of (insightsRes.data.data ?? [])) {
    insights[item.name] = item.total_value?.value ?? 0;
  }

  return {
    username: accountRes.data.username ?? '',
    name: accountRes.data.name ?? '',
    followers: accountRes.data.followers_count ?? 0,
    media_count: accountRes.data.media_count ?? 0,
    reach: insights.reach ?? 0,
    impressions: insights.impressions ?? 0,
    profile_views: insights.profile_views ?? 0,
  };
}

export async function getInstagramPosts(start, end, creds) {
  const igId = await getIgUserId(creds);
  const res = await axios.get(`${BASE}/${igId}/media`, {
    params: {
      fields: 'id,caption,media_type,timestamp,like_count,comments_count',
      limit: 30,
      access_token: creds.access_token,
    }
  });

  const startDate = new Date(start);
  const endDate = new Date(end + 'T23:59:59');

  return (res.data.data ?? [])
    .filter(post => {
      const d = new Date(post.timestamp);
      return d >= startDate && d <= endDate;
    })
    .slice(0, 12)
    .map(post => ({
      id: post.id,
      caption: post.caption
        ? post.caption.slice(0, 100) + (post.caption.length > 100 ? '…' : '')
        : '(no caption)',
      type: post.media_type ?? 'IMAGE',
      timestamp: post.timestamp,
      likes: post.like_count ?? 0,
      comments: post.comments_count ?? 0,
    }));
}
