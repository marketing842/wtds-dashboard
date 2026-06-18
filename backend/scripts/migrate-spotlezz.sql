-- ============================================================
-- ONE-TIME MIGRATION: Move Spotlezz from .env to Supabase DB
-- Run in Supabase → SQL Editor
-- Fill in the actual values from your .env file
-- ============================================================

-- 1. Insert client
INSERT INTO public.clients (name, slug, initial)
VALUES ('Spotlezz', 'spotlezz', 'S')
ON CONFLICT (slug) DO NOTHING;

-- 2. After running the above, note the client id:
-- SELECT id FROM public.clients WHERE slug = 'spotlezz';

-- 3. Insert credentials (replace <CLIENT_ID> with the UUID from step 2)
INSERT INTO public.client_credentials (client_id, provider, credentials)
VALUES
  ('<CLIENT_ID>', 'google_ads', '{
    "developer_token": "PASTE_FROM_ENV_GOOGLE_ADS_DEVELOPER_TOKEN",
    "oauth_client_id": "PASTE_FROM_ENV_GOOGLE_ADS_CLIENT_ID",
    "oauth_client_secret": "PASTE_FROM_ENV_GOOGLE_ADS_CLIENT_SECRET",
    "refresh_token": "PASTE_FROM_ENV_GOOGLE_ADS_REFRESH_TOKEN",
    "mcc_id": "PASTE_FROM_ENV_GOOGLE_ADS_MCC_ID",
    "customer_id": "PASTE_FROM_ENV_GOOGLE_ADS_DEFAULT_CUSTOMER_ID"
  }'),
  ('<CLIENT_ID>', 'meta', '{
    "access_token": "PASTE_FROM_ENV_META_ACCESS_TOKEN",
    "ad_account_id": "PASTE_FROM_ENV_META_AD_ACCOUNT_ID"
  }'),
  ('<CLIENT_ID>', 'ga4', '{
    "property_id": "PASTE_FROM_ENV_GOOGLE_GA4_PROPERTY_ID",
    "oauth_client_id": "PASTE_FROM_ENV_GOOGLE_ADS_CLIENT_ID",
    "oauth_client_secret": "PASTE_FROM_ENV_GOOGLE_ADS_CLIENT_SECRET",
    "refresh_token": "PASTE_FROM_ENV_GOOGLE_GA4_REFRESH_TOKEN"
  }'),
  ('<CLIENT_ID>', 'search_console', '{
    "site_url": "https://spotlezz.nl/",
    "oauth_client_id": "PASTE_FROM_ENV_GOOGLE_ADS_CLIENT_ID",
    "oauth_client_secret": "PASTE_FROM_ENV_GOOGLE_ADS_CLIENT_SECRET",
    "refresh_token": "PASTE_FROM_ENV_GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN"
  }'),
  ('<CLIENT_ID>', 'klaviyo', '{
    "api_key": "PASTE_FROM_ENV_KLAVIYO_API_KEY"
  }')
ON CONFLICT (client_id, provider) DO UPDATE SET
  credentials = EXCLUDED.credentials,
  updated_at = now();

-- 4. Create the Supabase Auth user via dashboard or admin API
--    Then link them:
-- INSERT INTO public.client_users (user_id, client_id, role)
-- VALUES ('<AUTH_USER_UUID>', '<CLIENT_ID>', 'admin');
-- (use 'admin' for yourself, 'viewer' for client-only access)
