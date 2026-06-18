# Backend Integration Guide

This guide explains how to connect your marketing dashboard frontend to your backend API.

## Quick Start

### 1. Set API Endpoint

Update `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
# or for production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Replace Mock Data with API Calls

#### Dashboard Page (`/app/page.tsx`)

Replace the hardcoded campaigns with API data:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { CampaignCard } from '@/components/CampaignCard';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch stats
        const statsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/stats`
        );
        const statsData = await statsResponse.json();
        setStats(statsData);

        // Fetch campaigns
        const campaignsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`
        );
        const campaignsData = await campaignsResponse.json();
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    // ... render dashboard with API data
  );
}
```

## API Endpoints Reference

### GET `/api/stats`
**Response:**
```json
{
  "revenue": {
    "value": 26450,
    "change": 12.5,
    "isPositive": true
  },
  "activeCampaigns": {
    "value": 12,
    "change": 3,
    "isPositive": true
  },
  "totalAudience": {
    "value": 45800,
    "change": 8.2,
    "isPositive": true
  },
  "conversionRate": {
    "value": 3.24,
    "change": 0.5,
    "isPositive": true
  }
}
```

### GET `/api/campaigns`
**Response:**
```json
{
  "campaigns": [
    {
      "id": "1",
      "name": "Summer Sale Campaign",
      "status": "active",
      "impressions": 125000,
      "clicks": 5420,
      "ctr": 4.34,
      "spend": 2500,
      "revenue": 8750
    }
  ]
}
```

### GET `/api/analytics/revenue`
**Response:**
```json
{
  "data": [
    { "name": "Jan", "value": 4000 },
    { "name": "Feb", "value": 3000 }
  ]
}
```

### GET `/api/analytics/channels`
**Response:**
```json
{
  "data": [
    { "name": "Email", "value": 2400 },
    { "name": "Social", "value": 1398 }
  ]
}
```

### GET `/api/audiences`
**Response:**
```json
{
  "stats": {
    "totalAudience": 45800,
    "segments": 12,
    "activeToday": 18300,
    "growthRate": 12.5
  },
  "audiences": [
    {
      "name": "Active Subscribers",
      "count": 12500
    }
  ]
}
```

### GET `/api/emails`
**Response:**
```json
{
  "stats": {
    "emailsSent": 136200,
    "openRate": 41.5,
    "clickRate": 7.8,
    "conversionRate": 2.4
  },
  "campaigns": [
    {
      "id": "1",
      "name": "Weekly Newsletter",
      "sent": 45200,
      "opened": 18400,
      "clicked": 4200,
      "openRate": 40.7,
      "status": "active"
    }
  ]
}
```

## Component Data Flow

### StatCard Component
```tsx
<StatCard
  label="Total Revenue"
  value={stats.revenue.value}
  change={{
    value: stats.revenue.change,
    isPositive: stats.revenue.isPositive
  }}
  icon={DollarSign}
  color="blue"
/>
```

### CampaignCard Component
```tsx
{campaigns.map((campaign) => (
  <CampaignCard
    key={campaign.id}
    name={campaign.name}
    status={campaign.status}
    impressions={campaign.impressions}
    clicks={campaign.clicks}
    ctr={campaign.ctr}
    spend={campaign.spend}
    revenue={campaign.revenue}
  />
))}
```

### Chart Components

**For RevenueChart:**
Modify the `lineData` in `components/Charts.tsx`:
```tsx
export function RevenueChart({ data }) {
  return (
    <div className="chart-container col-span-2">
      <h3 className="text-white font-semibold mb-6">Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          {/* ... rest of chart */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## Error Handling

Add error boundaries and error states:

```tsx
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    }
  };

  fetchData();
}, []);

if (error) {
  return <div className="text-red-400">Error: {error}</div>;
}
```

## Authentication

To add authentication, update the fetch calls:

```tsx
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

Or use a middleware in `app/middleware.ts`:

```tsx
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|_next/static).*)'],
};
```

## Using SWR for Data Fetching

For better caching and revalidation, use SWR:

```bash
pnpm add swr
```

```tsx
'use client';

import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function Dashboard() {
  const { data: stats, error } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/stats`,
    fetcher
  );

  if (!stats) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return (
    // ... render with stats data
  );
}
```

## Updating Components for Dynamic Data

### Example: Update Sidebar for User Profile

```tsx
// components/Sidebar.tsx
'use client';

import { useEffect, useState } from 'react';

export function Sidebar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const userData = await response.json();
      setUser(userData);
    };

    fetchUser();
  }, []);

  // ... render sidebar with user data
}
```

## CORS Configuration

If your API is on a different domain, ensure your backend allows CORS:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Testing API Calls

Use the browser DevTools Console or a tool like Postman:

```bash
# Test API endpoint
curl http://localhost:3001/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Production Deployment

1. Update `.env.production.local` with production API URL:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

2. Build and deploy:
```bash
pnpm build
pnpm start
```

3. Verify API calls work in production

## Common Issues

### CORS Errors
- Ensure backend has proper CORS headers
- Check that `NEXT_PUBLIC_API_URL` is correct

### 401/403 Errors
- Verify authentication token is being sent
- Check token expiration and refresh logic

### Timeout Errors
- Add timeout handling to fetch calls
- Implement retry logic with exponential backoff

### Data Loading Issues
- Check Network tab in DevTools
- Verify API response format matches component expectations
- Add loading and error states

## Next Steps

1. Connect dashboard page to `/api/stats` endpoint
2. Connect campaigns page to `/api/campaigns` endpoint
3. Add authentication and user session management
4. Implement error handling and retry logic
5. Add loading states and skeletons
6. Deploy to production

---

Need help? Check the example pages in `/app` for reference implementations.
