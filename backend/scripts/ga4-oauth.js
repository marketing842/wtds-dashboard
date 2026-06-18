/**
 * Google Analytics 4 OAuth2 Setup
 *
 * Run once to get a GA4 refresh token. Steps:
 * 1. Make sure GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET are in .env
 * 2. Run: node scripts/ga4-oauth.js
 * 3. Open the URL printed in the browser
 * 4. Log in with the Google account that has access to the Spotlezz GA4 property
 * 5. Approve access — token is auto-saved to .env
 * 6. Restart backend
 */

import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:8765/callback';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET must be in .env');
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n──────────────────────────────────────────────────');
console.log('GA4 OAuth Setup — open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\n──────────────────────────────────────────────────');
console.log('Waiting for Google to redirect to http://localhost:8765/callback …\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8765');
  if (url.pathname !== '/callback') return;

  const code = url.searchParams.get('code');
  if (!code) {
    res.end('No code received. Try again.');
    server.close();
    return;
  }

  res.end('<h1>Success! You can close this tab and return to the terminal.</h1>');
  server.close();

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }
    });

    const refreshToken = tokenRes.data.refresh_token;

    // Auto-write to .env
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('GOOGLE_GA4_REFRESH_TOKEN=')) {
      envContent = envContent.replace(
        /GOOGLE_GA4_REFRESH_TOKEN=.*/,
        `GOOGLE_GA4_REFRESH_TOKEN=${refreshToken}`
      );
    } else {
      envContent += `\nGOOGLE_GA4_REFRESH_TOKEN=${refreshToken}\n`;
    }
    fs.writeFileSync(envPath, envContent);

    console.log('──────────────────────────────────────────────────');
    console.log('SUCCESS! GOOGLE_GA4_REFRESH_TOKEN saved to .env');
    console.log('Restart the backend now: node server.js\n');
    console.log('──────────────────────────────────────────────────\n');
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data ?? err.message);
  }
});

server.listen(8765);
