/**
 * Google Search Console OAuth2 Setup
 *
 * Run once to get a refresh token for Search Console.
 * Uses the same OAuth app (CLIENT_ID / CLIENT_SECRET) as Google Ads.
 *
 * Steps:
 * 1. Make sure GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET are in .env
 * 2. Run:  node scripts/search-console-oauth.js
 * 3. Open the URL printed in the browser
 * 4. Log in with the Google account that has access to Search Console for spotlezz.nl
 * 5. The refresh token is printed — it is also auto-written to .env
 */

import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL, fileURLToPath } from 'url';
import axios from 'axios';

const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:8765/callback';
const SCOPE         = 'https://www.googleapis.com/auth/webmasters.readonly';

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
console.log('Log in with the Google account that owns Search Console for spotlezz.nl');
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

  res.end('<h1>Success! You can close this tab and check the terminal.</h1>');
  server.close();

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      },
    });

    const refreshToken = tokenRes.data.refresh_token;

    // Auto-append to .env
    const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=')) {
      fs.writeFileSync(envPath, envContent.replace(
        /GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=.*/,
        `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${refreshToken}`
      ));
    } else {
      fs.appendFileSync(envPath, `\nGOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${refreshToken}\n`);
    }

    console.log('──────────────────────────────────────────────────');
    console.log('SUCCESS! Token saved to .env automatically.\n');
    console.log(`GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=${refreshToken}`);
    console.log('\nRestart the backend (node server.js) and the Search Console page will load.\n');
    console.log('──────────────────────────────────────────────────\n');
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data ?? err.message);
  }
});

server.listen(8765);
