import axios from 'axios';

const BASE = 'https://graph.facebook.com/v22.0';

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

  const accountRes = await axios.get(`${BASE}/${igId}`, {
    params: { fields: 'followers_count,media_count,name,username', access_token: creds.access_token }
  });

  // Fetch daily metric and sum over period — each metric fetched separately so one failure doesn't block others
  async function fetchMetricSum(metric) {
    try {
      const res = await axios.get(`${BASE}/${igId}/insights`, {
        params: {
          metric,
          period: 'day',
          since: sinceUnix,
          until: untilUnix,
          access_token: creds.access_token,
        }
      });
      return (res.data.data?.[0]?.values ?? []).reduce((sum, v) => sum + (v.value ?? 0), 0);
    } catch (err) {
      console.error(`[instagram/insights] ${metric} failed:`, err.response?.data?.error?.message ?? err.message);
      return 0;
    }
  }

  const [reach, new_followers, profile_views] = await Promise.all([
    fetchMetricSum('reach'),
    fetchMetricSum('follower_count'),
    fetchMetricSum('profile_views'),
  ]);

  return {
    username: accountRes.data.username ?? '',
    name: accountRes.data.name ?? '',
    followers: accountRes.data.followers_count ?? 0,
    media_count: accountRes.data.media_count ?? 0,
    reach,
    new_followers,
    profile_views,
  };
}

export async function getInstagramPosts(start, end, creds) {
  const igId = await getIgUserId(creds);
  const res = await axios.get(`${BASE}/${igId}/media`, {
    params: {
      fields: 'id,caption,media_type,timestamp,like_count,comments_count',
      limit: 50,
      access_token: creds.access_token,
    }
  });

  const startDate = new Date(start);
  const endDate = new Date(end + 'T23:59:59');

  const postsInPeriod = (res.data.data ?? [])
    .filter(post => {
      const d = new Date(post.timestamp);
      return d >= startDate && d <= endDate;
    })
    .slice(0, 20);

  // Enrich each post with per-post insights (reach, shares, saved)
  const postsWithInsights = await Promise.all(
    postsInPeriod.map(async (post) => {
      let shares = 0, saved = 0, reach = 0;
      try {
        const insRes = await axios.get(`${BASE}/${post.id}/insights`, {
          params: {
            metric: 'reach,saved,shares',
            access_token: creds.access_token,
          }
        });
        for (const m of (insRes.data.data ?? [])) {
          const val = m.values?.[0]?.value ?? m.value ?? 0;
          if (m.name === 'reach') reach = val;
          else if (m.name === 'saved') saved = val;
          else if (m.name === 'shares') shares = val;
        }
      } catch (err) {
        console.error(`[instagram/post-insights] ${post.id}:`, err.response?.data?.error?.message ?? err.message);
      }

      const likes = post.like_count ?? 0;
      const comments = post.comments_count ?? 0;
      const engagement = likes + comments + shares + saved;
      const engagement_rate = reach > 0 ? (engagement / reach) * 100 : 0;

      return {
        id: post.id,
        caption: post.caption
          ? post.caption.slice(0, 100) + (post.caption.length > 100 ? '…' : '')
          : '(no caption)',
        type: post.media_type ?? 'IMAGE',
        timestamp: post.timestamp,
        likes,
        comments,
        shares,
        saved,
        reach,
        engagement_rate,
      };
    })
  );

  return postsWithInsights;
}
