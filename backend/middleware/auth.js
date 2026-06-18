import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { loadCredentials } from '../services/credential-loader.js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role === 'admin') {
      req.user  = { email: payload.email, role: 'admin' };
      req.client = { id: null, role: 'admin', creds: {} };
      return next();
    }

    // Client viewer
    const creds = await loadCredentials(payload.clientId);
    req.user  = { email: payload.email, role: 'viewer' };
    req.client = { id: payload.clientId, role: 'viewer', creds };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.client.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
