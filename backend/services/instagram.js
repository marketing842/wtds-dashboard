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

function parseInsightRow(row) {
  if (!row) return { sum: 0, daily: [] };

  if (Array.isArray(row.values) && row.values.length > 0) {
    const daily = row.values
      .map(v => ({
        date: (v.end_time ?? '').slice(0, 10),
        value: typeof v.value === 'number' ? v.value : 0,
      }))
      .filter(d => d.date);
    const sum = daily.reduce((s, d) => s + d.value, 0);
    return { sum, daily };
  }

  const total = row.total_value?.value;
  if (typeof total === 'number') {
    return { sum: total, daily: [] };
  }

  if (typeof row.value === 'number') {
    return { sum: row.value, daily: [] };
  }

  return { sum: 0, daily: [] };
}

async function fetchAccountInsight(igId, metric, sinceUnix, untilUnix, creds) {
  try {
    const res = await axios.get(`${BASE}/${igId}/insights`, {
      params: {
        metric,
        period: 'day',
        metric_type: 'time_series',
        since: sinceUnix,
        until: untilUnix,
        access_token: creds.access_token,
      },
    });
    return parseInsightRow(res.data.data?.[0]);
  } catch (err) {
    console.error(`[instagram/insights] ${metric} failed:`, err.response?.data?.error?.message ?? err.message);
    return { sum: 0, daily: [] };
  }
}

export async function getInstagramSummary(start, end, creds) {
  const igId = await getIgUserId(creds);
  const sinceUnix = Math.floor(new Date(start).getTime() / 1000);
  const untilUnix = Math.floor(new Date(end + 'T23:59:59').getTime() / 1000);

  const accountRes = await axios.get(`${BASE}/${igId}`, {
    params: { fields: 'followers_count,media_count,name,username', access_token: creds.access_token }
  });

  // Fetch daily metric and sum over period — each metric fetched separately so one failure doesn't block others
  const [reachData, followersData, profileViewsData] = await Promise.all([
    fetchAccountInsight(igId, 'reach', sinceUnix, untilUnix, creds),
    fetchAccountInsight(igId, 'follower_count', sinceUnix, untilUnix, creds),
    fetchAccountInsight(igId, 'profile_views', sinceUnix, untilUnix, creds),
  ]);

  return {
    username: accountRes.data.username ?? '',
    name: accountRes.data.name ?? '',
    followers: accountRes.data.followers_count ?? 0,
    media_count: accountRes.data.media_count ?? 0,
    reach: reachData.sum,
    new_followers: followersData.sum,
    profile_views: profileViewsData.sum,
  };
}

export async function getInstagramPosts(start, end, creds) {
  const igId = await getIgUserId(creds);
  const res = await axios.get(`${BASE}/${igId}/media`, {
    params: {
      fields: 'id,caption,media_type,timestamp,like_count,comments_count,shares_count,saved_count',
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

  // Enrich each post with per-post insights (reach) + native share/save counts from media object
  const postsWithInsights = await Promise.all(
    postsInPeriod.map(async (post) => {
      let shares = post.shares_count ?? 0;
      let saved = post.saved_count ?? 0;
      let reach = 0;
      try {
        const insRes = await axios.get(`${BASE}/${post.id}/insights`, {
          params: {
            metric: 'reach',
            access_token: creds.access_token,
          }
        });
        const row = insRes.data.data?.[0];
        reach = row?.values?.[0]?.value ?? row?.total_value?.value ?? row?.value ?? 0;
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

async function getPrimaryFacebookPage(creds) {
  try {
    const res = await axios.get(`${BASE}/me/accounts`, {
      params: { fields: 'id,name,access_token,fan_count', access_token: creds.access_token, limit: 10 },
    });
    return (res.data.data ?? [])[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchReachByFollowType(igId, sinceUnix, untilUnix, creds) {
  try {
    const res = await axios.get(`${BASE}/${igId}/insights`, {
      params: {
        metric: 'reach',
        period: 'day',
        since: sinceUnix,
        until: untilUnix,
        breakdown: 'follow_type',
        access_token: creds.access_token,
      },
    });
    let followers = 0;
    let nonFollowers = 0;
    for (const metric of res.data.data ?? []) {
      for (const v of metric.values ?? []) {
        const val = v.value ?? 0;
        if (typeof val === 'object') {
          followers += val.FOLLOWER ?? val.follower ?? 0;
          nonFollowers += val.NON_FOLLOWER ?? val.non_follower ?? val.NON_FOLLOWERS ?? 0;
        }
      }
      for (const row of metric.total_value?.breakdowns?.[0]?.results ?? []) {
        const dim = row.dimension_values?.[0] ?? '';
        const val = row.value ?? 0;
        if (String(dim).toUpperCase().includes('FOLLOWER') && !String(dim).toUpperCase().includes('NON')) {
          followers += val;
        } else if (String(dim).toUpperCase().includes('NON')) {
          nonFollowers += val;
        }
      }
    }
    if (followers > 0 || nonFollowers > 0) {
      return { followers_reach: followers, non_followers_reach: nonFollowers };
    }
  } catch (err) {
    console.error('[instagram/reach-breakdown]', err.response?.data?.error?.message ?? err.message);
  }
  return null;
}

export async function getInstagramExtendedSummary(start, end, creds) {
  const base = await getInstagramSummary(start, end, creds);
  const igId = await getIgUserId(creds);
  const sinceUnix = Math.floor(new Date(start).getTime() / 1000);
  const untilUnix = Math.floor(new Date(end + 'T23:59:59').getTime() / 1000);

  const [reachSplit, facebook] = await Promise.all([
    fetchReachByFollowType(igId, sinceUnix, untilUnix, creds),
    getFacebookPageOrganic(start, end, creds),
  ]);

  return {
    instagram: {
      ...base,
      followers_reach: reachSplit?.followers_reach ?? null,
      non_followers_reach: reachSplit?.non_followers_reach ?? null,
      reach_split_available: reachSplit != null,
    },
    facebook,
  };
}

export async function getInstagramDailyInsights(start, end, creds) {
  const igId = await getIgUserId(creds);
  const sinceUnix = Math.floor(new Date(start).getTime() / 1000);
  const untilUnix = Math.floor(new Date(end + 'T23:59:59').getTime() / 1000);

  const [reachData, profileViewsData, newFollowersData] = await Promise.all([
    fetchAccountInsight(igId, 'reach', sinceUnix, untilUnix, creds),
    fetchAccountInsight(igId, 'profile_views', sinceUnix, untilUnix, creds),
    fetchAccountInsight(igId, 'follower_count', sinceUnix, untilUnix, creds),
  ]);

  const byDate = new Map();
  for (const row of reachData.daily) {
    byDate.set(row.date, { date: row.date, reach: row.value, profile_views: 0, new_followers: 0 });
  }
  for (const row of profileViewsData.daily) {
    const cur = byDate.get(row.date) ?? { date: row.date, reach: 0, profile_views: 0, new_followers: 0 };
    cur.profile_views = row.value;
    byDate.set(row.date, cur);
  }
  for (const row of newFollowersData.daily) {
    const cur = byDate.get(row.date) ?? { date: row.date, reach: 0, profile_views: 0, new_followers: 0 };
    cur.new_followers = row.value;
    byDate.set(row.date, cur);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getFacebookPageOrganic(start, end, creds) {
  const page = await getPrimaryFacebookPage(creds);
  if (!page) return { available: false };

  const sinceUnix = Math.floor(new Date(start).getTime() / 1000);
  const untilUnix = Math.floor(new Date(end + 'T23:59:59').getTime() / 1000);
  const token = page.access_token ?? creds.access_token;

  async function sumMetric(metric) {
    try {
      const res = await axios.get(`${BASE}/${page.id}/insights`, {
        params: { metric, period: 'day', since: sinceUnix, until: untilUnix, access_token: token },
      });
      return (res.data.data?.[0]?.values ?? []).reduce((s, v) => s + (v.value ?? 0), 0);
    } catch {
      return 0;
    }
  }

  const [impressions, engaged, postEngagements] = await Promise.all([
    sumMetric('page_impressions_unique'),
    sumMetric('page_engaged_users'),
    sumMetric('page_post_engagements'),
  ]);

  let posts = [];
  try {
    const postsRes = await axios.get(`${BASE}/${page.id}/posts`, {
      params: {
        fields: 'id,message,created_time,shares,likes.summary(true),comments.summary(true)',
        limit: 20,
        access_token: token,
      },
    });
    const startDate = new Date(start);
    const endDate = new Date(end + 'T23:59:59');
    posts = (postsRes.data.data ?? [])
      .filter(p => {
        const d = new Date(p.created_time);
        return d >= startDate && d <= endDate;
      })
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        message: p.message ? p.message.slice(0, 100) + (p.message.length > 100 ? '…' : '') : '(no text)',
        created_time: p.created_time,
        likes: p.likes?.summary?.total_count ?? 0,
        comments: p.comments?.summary?.total_count ?? 0,
        shares: p.shares?.count ?? 0,
      }));
  } catch (err) {
    console.error('[facebook/posts]', err.response?.data?.error?.message ?? err.message);
  }

  return {
    available: true,
    page_id: page.id,
    name: page.name,
    fans: page.fan_count ?? 0,
    impressions,
    engaged_users: engaged,
    post_engagements: postEngagements,
    posts,
  };
}
