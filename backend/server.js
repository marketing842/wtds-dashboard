import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { loadCredentials, invalidateCredentials } from './services/credential-loader.js';
import {
  getKlaviyoSummary,
  getKlaviyoFlows,
  getKlaviyoCampaigns,
  getKlaviyoLists,
} from './services/klaviyo.js';
import {
  getGoogleAdsSummary,
  getGoogleAdsCampaigns,
  getGoogleAdsKeywords
} from './services/google-ads.js';
import {
  getMetaSummary,
  getMetaCampaigns,
  getMetaAdCreatives,
} from './services/meta.js';
import {
  getSearchConsoleSummary,
  getTopQueries,
  getTopPages,
} from './services/search-console.js';
import {
  getInstagramSummary,
  getInstagramPosts,
} from './services/instagram.js';
import {
  getGA4Summary,
  getGA4TopPages,
  getGA4Sources,
} from './services/analytics.js';

const app = express();

// Allow frontend origins — set FRONTEND_URL in Railway (comma-separated for multiple)
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL ?? 'http://localhost:3001')
  .split(',').map(s => s.trim())

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── In-memory cache ───────────────────────────────────────────
const _cache = new Map();
function getCached(key) {
  const e = _cache.get(key);
  if (e && Date.now() - e.t < e.ttl) return e.data;
  return null;
}
function setCached(key, data, ttl = 10 * 60 * 1000) {
  _cache.set(key, { data, t: Date.now(), ttl });
}
async function cached(key, fn, ttl) {
  const hit = getCached(key);
  if (hit) return hit;
  const data = await fn();
  setCached(key, data, ttl);
  return data;
}

// ── Health (public) ───────────────────────────────────────────

app.get('/health', (_, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// ── Login (public) ────────────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  // Admin check — credentials come from .env
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, role: 'admin' });
  }

  // Client check — credentials stored in clients table
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, initial, login_email, login_password_hash')
    .eq('login_email', email)
    .single();

  if (client?.login_password_hash) {
    const valid = await bcrypt.compare(password, client.login_password_hash);
    if (valid) {
      const token = jwt.sign(
        { role: 'viewer', clientId: client.id, email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ token, role: 'viewer', clientId: client.id });
    }
  }

  return res.status(401).json({ error: 'Invalid email or password' });
});

// ── All API routes require auth ───────────────────────────────
app.use('/api', requireAuth);

// ── Current user / client info ───────────────────────────────
app.get('/api/me', async (req, res) => {
  try {
    if (req.client.role === 'admin') {
      return res.json({ role: 'admin', clientId: null, clientName: 'Admin', initial: 'A' });
    }

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, initial')
      .eq('id', req.client.id)
      .single();

    res.json({
      role:       'viewer',
      clientId:   client?.id ?? null,
      clientName: client?.name ?? '',
      initial:    client?.initial ?? '',
    });
  } catch (err) {
    console.error('[me]', err.message);
    res.status(500).json({ error: 'Failed to load client info' });
  }
});

// ── Klaviyo ──────────────────────────────────────────────────

app.get('/api/klaviyo/summary', async (req, res) => {
  try {
    const { start, end, compare_start, compare_end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.klaviyo) return res.status(422).json({ error: 'Klaviyo credentials not configured for this client' });
    const key = `ks_${req.client.id}_${start}_${end}_${compare_start}_${compare_end}`;
    const data = await cached(key, () => getKlaviyoSummary(start, end, compare_start, compare_end, creds.klaviyo));
    res.json(data);
  } catch (err) {
    const detail = err.response?.data ?? err.message;
    console.error('[klaviyo/summary]', detail);
    res.status(err.response?.status ?? 500).json({ error: err.message, detail });
  }
});

app.get('/api/klaviyo/flows', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.klaviyo) return res.status(422).json({ error: 'Klaviyo credentials not configured for this client' });
    const data = await cached(`kf_${req.client.id}_${start}_${end}`, () => getKlaviyoFlows(start, end, creds.klaviyo));
    res.json(data);
  } catch (err) {
    const detail = err.response?.data ?? err.message;
    console.error('[klaviyo/flows]', detail);
    res.status(err.response?.status ?? 500).json({ error: err.message, detail });
  }
});

app.get('/api/klaviyo/campaigns', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.klaviyo) return res.status(422).json({ error: 'Klaviyo credentials not configured for this client' });
    const data = await cached(`kc_${req.client.id}_${start}_${end}`, () => getKlaviyoCampaigns(start, end, creds.klaviyo));
    res.json(data);
  } catch (err) {
    const detail = err.response?.data ?? err.message;
    console.error('[klaviyo/campaigns]', detail);
    res.status(err.response?.status ?? 500).json({ error: err.message, detail });
  }
});

app.get('/api/klaviyo/lists', async (req, res) => {
  try {
    const { creds } = req.client;
    if (!creds.klaviyo) return res.status(422).json({ error: 'Klaviyo credentials not configured for this client' });
    const data = await getKlaviyoLists({ ...creds.klaviyo, clientId: req.client.id });
    res.json(data);
  } catch (err) {
    const detail = err.response?.data ?? err.message;
    console.error('[klaviyo/lists]', detail);
    res.status(err.response?.status ?? 500).json({ error: err.message, detail });
  }
});

// ── Google Ads ───────────────────────────────────────────────

app.get('/api/google-ads/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.google_ads) return res.status(422).json({ error: 'Google Ads credentials not configured for this client' });
    const gCreds = { ...creds.google_ads, clientId: req.client.id };
    const cid = creds.google_ads.customer_id;
    const data = await cached(`gas_${req.client.id}_${start}_${end}`, () => getGoogleAdsSummary(cid, start, end, gCreds), 5 * 60 * 1000);
    res.json(data);
  } catch (err) {
    console.error('[google-ads/summary]', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/google-ads/campaigns', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.google_ads) return res.status(422).json({ error: 'Google Ads credentials not configured for this client' });
    const gCreds = { ...creds.google_ads, clientId: req.client.id };
    const cid = creds.google_ads.customer_id;
    const data = await cached(`gac_${req.client.id}_${start}_${end}`, () => getGoogleAdsCampaigns(cid, start, end, gCreds), 5 * 60 * 1000);
    res.json(data);
  } catch (err) {
    console.error('[google-ads/campaigns]', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/google-ads/keywords', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.google_ads) return res.status(422).json({ error: 'Google Ads credentials not configured for this client' });
    const gCreds = { ...creds.google_ads, clientId: req.client.id };
    const cid = creds.google_ads.customer_id;
    const data = await cached(`gak_${req.client.id}_${start}_${end}`, () => getGoogleAdsKeywords(cid, start, end, gCreds), 5 * 60 * 1000);
    res.json(data);
  } catch (err) {
    console.error('[google-ads/keywords]', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Meta Ads ─────────────────────────────────────────────────

app.get('/api/meta/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.meta) return res.status(422).json({ error: 'Meta credentials not configured for this client' });
    const data = await cached(`ms_${req.client.id}_${start}_${end}`, () => getMetaSummary(start, end, creds.meta), 5 * 60 * 1000);
    res.json(data);
  } catch (err) {
    const fb = err.response?.data?.error;
    const msg = fb?.message ?? err.message;
    console.error('[meta/summary]', fb ?? err.message);
    res.status(500).json({ error: msg, code: fb?.code, detail: err.response?.data });
  }
});

app.get('/api/meta/campaigns', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.meta) return res.status(422).json({ error: 'Meta credentials not configured for this client' });
    const data = await cached(`mc_${req.client.id}_${start}_${end}`, () => getMetaCampaigns(start, end, creds.meta), 5 * 60 * 1000);
    res.json(data);
  } catch (err) {
    const fb = err.response?.data?.error;
    const msg = fb?.message ?? err.message;
    console.error('[meta/campaigns]', fb ?? err.message);
    res.status(500).json({ error: msg, code: fb?.code, detail: err.response?.data });
  }
});

app.get('/api/meta/creatives', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.meta) return res.status(422).json({ error: 'Meta credentials not configured for this client' });
    const data = await cached(`mcr_${req.client.id}_${start}_${end}`, () => getMetaAdCreatives(start, end, creds.meta), 5 * 60 * 1000);
    res.json(data);
  } catch (err) {
    const fb = err.response?.data?.error;
    const msg = fb?.message ?? err.message;
    console.error('[meta/creatives]', fb ?? err.message);
    res.status(500).json({ error: msg, code: fb?.code, detail: err.response?.data });
  }
});

// ── Google Search Console ────────────────────────────────────

app.get('/api/search-console/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.search_console) return res.status(422).json({ error: 'Search Console credentials not configured for this client' });
    const scCreds = { ...creds.search_console, clientId: req.client.id };
    const data = await cached(`gss_${req.client.id}_${start}_${end}`, () => getSearchConsoleSummary(start, end, scCreds));
    res.json(data);
  } catch (err) {
    console.error('[search-console/summary]', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search-console/queries', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.search_console) return res.status(422).json({ error: 'Search Console credentials not configured for this client' });
    const scCreds = { ...creds.search_console, clientId: req.client.id };
    const data = await cached(`gsq_${req.client.id}_${start}_${end}`, () => getTopQueries(start, end, scCreds));
    res.json(data);
  } catch (err) {
    console.error('[search-console/queries]', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search-console/pages', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.search_console) return res.status(422).json({ error: 'Search Console credentials not configured for this client' });
    const scCreds = { ...creds.search_console, clientId: req.client.id };
    const data = await cached(`gsp_${req.client.id}_${start}_${end}`, () => getTopPages(start, end, scCreds));
    res.json(data);
  } catch (err) {
    console.error('[search-console/pages]', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Instagram Organic ────────────────────────────────────────

app.get('/api/instagram/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.meta) return res.status(422).json({ error: 'Meta/Instagram credentials not configured for this client' });
    const data = await cached(`is_${req.client.id}_${start}_${end}`, () => getInstagramSummary(start, end, creds.meta));
    res.json(data);
  } catch (err) {
    console.error('[instagram/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/instagram/posts', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.meta) return res.status(422).json({ error: 'Meta/Instagram credentials not configured for this client' });
    const data = await cached(`ip_${req.client.id}_${start}_${end}`, () => getInstagramPosts(start, end, creds.meta));
    res.json(data);
  } catch (err) {
    console.error('[instagram/posts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Google Analytics 4 ───────────────────────────────────────

app.get('/api/analytics/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.ga4) return res.status(422).json({ error: 'GA4 credentials not configured for this client' });
    const ga4Creds = { ...creds.ga4, clientId: req.client.id };
    const data = await cached(`as_${req.client.id}_${start}_${end}`, () => getGA4Summary(start, end, ga4Creds));
    res.json(data);
  } catch (err) {
    console.error('[analytics/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/pages', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.ga4) return res.status(422).json({ error: 'GA4 credentials not configured for this client' });
    const ga4Creds = { ...creds.ga4, clientId: req.client.id };
    const data = await cached(`ap_${req.client.id}_${start}_${end}`, () => getGA4TopPages(start, end, ga4Creds));
    res.json(data);
  } catch (err) {
    console.error('[analytics/pages]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/sources', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
    const { creds } = req.client;
    if (!creds.ga4) return res.status(422).json({ error: 'GA4 credentials not configured for this client' });
    const ga4Creds = { ...creds.ga4, clientId: req.client.id };
    const data = await cached(`aso_${req.client.id}_${start}_${end}`, () => getGA4Sources(start, end, ga4Creds));
    res.json(data);
  } catch (err) {
    console.error('[analytics/sources]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Routes ─────────────────────────────────────────────

// Shared (agency-wide) credential defaults — pulled from any existing client
app.get('/api/admin/defaults', requireAdmin, async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('client_credentials')
      .select('provider, credentials')
      .in('provider', ['google_ads', 'ga4', 'search_console'])
      .limit(10);

    const pick = (creds, keys) =>
      Object.fromEntries(keys.filter(k => creds?.[k]).map(k => [k, creds[k]]));

    const ga   = data?.find(r => r.provider === 'google_ads')?.credentials;
    const ga4  = data?.find(r => r.provider === 'ga4')?.credentials;
    const sc   = data?.find(r => r.provider === 'search_console')?.credentials;

    res.json({
      google_ads:     pick(ga,  ['developer_token', 'oauth_client_id', 'oauth_client_secret', 'mcc_id']),
      ga4:            pick(ga4, ['oauth_client_id', 'oauth_client_secret']),
      search_console: pick(sc,  ['oauth_client_id', 'oauth_client_secret']),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/clients', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('id, name, slug, initial, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/clients', requireAdmin, async (req, res) => {
  try {
    const { name, slug, initial, email, password } = req.body;
    if (!name || !slug || !email || !password) return res.status(400).json({ error: 'name, slug, email, password required' });

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .insert({
        name,
        slug,
        initial: initial || name[0].toUpperCase(),
        login_email: email,
        login_password_hash: passwordHash,
      })
      .select()
      .single();
    if (clientErr) throw clientErr;

    res.status(201).json({ id: client.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('id, name, slug, initial')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/clients/:id/credentials', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('client_credentials')
      .select('provider, credentials')
      .eq('client_id', req.params.id);
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/clients/:id/credentials/:provider', requireAdmin, async (req, res) => {
  try {
    const { id, provider } = req.params;
    const { error } = await supabaseAdmin
      .from('client_credentials')
      .upsert(
        { client_id: id, provider, credentials: req.body, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,provider' }
      );
    if (error) throw error;
    invalidateCredentials(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client info (name, slug, initial)
app.put('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  try {
    const { name, slug, initial } = req.body;
    if (!name || !slug || !initial) return res.status(400).json({ error: 'name, slug and initial required' });
    const { error } = await supabaseAdmin
      .from('clients')
      .update({ name, slug, initial })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client and all their credentials
app.delete('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Delete credentials first (FK constraint)
    await supabaseAdmin.from('client_credentials').delete().eq('client_id', id);
    const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);
    if (error) throw error;
    invalidateCredentials(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get client login email (no password returned)
app.get('/api/admin/clients/:id/login', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('login_email')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ email: data?.login_email ?? '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set or update client login credentials
app.put('/api/admin/clients/:id/login', requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const passwordHash = await bcrypt.hash(password, 10);
    const { error } = await supabaseAdmin
      .from('clients')
      .update({ login_email: email, login_password_hash: passwordHash })
      .eq('id', req.params.id);
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`WTA Dashboard API → http://localhost:${PORT}`)
);
