import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cache credentials per client for 5 minutes
const _cache = new Map();
const TTL = 5 * 60 * 1000;

export async function loadCredentials(clientId) {
  const cached = _cache.get(clientId);
  if (cached && Date.now() - cached.at < TTL) return cached.data;

  const { data, error } = await supabase
    .from('client_credentials')
    .select('provider, credentials')
    .eq('client_id', clientId);

  if (error) throw new Error(`Failed to load credentials: ${error.message}`);

  const creds = { clientId };
  for (const row of (data ?? [])) {
    creds[row.provider] = row.credentials;
  }

  _cache.set(clientId, { data: creds, at: Date.now() });
  return creds;
}

export function invalidateCredentials(clientId) {
  _cache.delete(clientId);
}
