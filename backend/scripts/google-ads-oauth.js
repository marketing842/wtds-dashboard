/**
 * Google Ads OAuth2 Setup
 *
 * Run once to get a refresh token. Steps:
 *
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a project (or pick existing one)
 * 3. Enable "Google Ads API" under APIs & Services → Library
 * 4. Create OAuth credentials: APIs & Services → Credentials → Create Credentials → OAuth client ID
 *    - Application type: Desktop app
 *    - Download the JSON — copy client_id and client_secret to .env
 * 5. Apply for Google Ads Basic Access:
 *    Google Ads → Tools → API Center → "Apply for Basic Access"
 *    (required so your developer token can query real accounts)
 * 6. Fill in .env: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET
 * 7. Run:  node scripts/google-ads-oauth.js
 * 8. Open the URL printed, approve access, paste the code back
 * 9. Copy the printed refresh_token into .env: GOOGLE_ADS_REFRESH_TOKEN
 */

import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import axios from 'axios';

const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:8765/callback';
const SCOPE         = 'https://www.googleapis.com/auth/adwords';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: Set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET in .env first');
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id',     CLIENT_ID);
authUrl.searchParams.set('redirect_uri',  REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope',         SCOPE);
authUrl.searchParams.set('access_type',   'offline');
authUrl.searchParams.set('prompt',        'consent');

console.log('\n──────────────────────────────────────────────────');
console.log('Step 1: Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\n──────────────────────────────────────────────────');
console.log('Waiting for redirect on http://localhost:8765/callback ...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8765');
  if (url.pathname !== '/callback') return;

  const code = url.searchParams.get('code');
  if (!code) {
    res.end('No code received.');
    server.close();
    return;
  }

  res.end('<h1>Success! You can close this tab.</h1>');
  server.close();

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code'
      }
    });

    console.log('──────────────────────────────────────────────────');
    console.log('SUCCESS! Add this to your .env:\n');
    console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokenRes.data.refresh_token}`);
    console.log('\n──────────────────────────────────────────────────\n');
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data ?? err.message);
  }
});

server.listen(8765);
