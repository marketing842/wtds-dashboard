/**
 * Diagnose Klaviyo flow reporting. Run from backend/:
 *   node scripts/test-klaviyo-flows.js [start] [end]
 * Uses KLAVIYO_API_KEY from .env — never commit output with keys.
 */
import 'dotenv/config';
import axios from 'axios';
import { getKlaviyoFlows, getKlaviyoSummary } from '../services/klaviyo.js';

const creds = { api_key: process.env.KLAVIYO_API_KEY };
if (!creds.api_key) {
  console.error('Set KLAVIYO_API_KEY in backend/.env');
  process.exit(1);
}

const end = process.argv[3] ?? new Date().toISOString().slice(0, 10);
const start = process.argv[2] ?? (() => {
  const d = new Date(end);
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
})();

console.log('Testing Klaviyo flows', start, '→', end);

try {
  const flows = await getKlaviyoFlows(start, end, creds);
  console.log('Flows returned:', flows.length);
  flows.slice(0, 5).forEach(f =>
    console.log(` - ${f.name}: delivered=${f.delivered}${f.no_activity ? ' (no activity)' : ''}`),
  );

  const summary = await getKlaviyoSummary(start, end, null, null, creds);
  console.log('Summary delivered:', summary.current?.delivered);
} catch (err) {
  console.error('FAILED:', err.response?.status, err.response?.data?.errors?.[0] ?? err.message);
  process.exit(1);
}
