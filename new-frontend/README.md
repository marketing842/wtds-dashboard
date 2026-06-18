# Marketing Dashboard - Frontend

A modern, professional marketing dashboard built with Next.js 16, React 19, Tailwind CSS v4, and Recharts.

## Features

✨ **Modern Design**
- Clean glass-morphism UI with dark theme
- Professional color scheme (blue, purple, emerald, orange accents)
- Fully responsive and mobile-ready
- Smooth animations and transitions

📊 **Dashboard Components**
- Real-time analytics charts (Revenue Trend, Traffic by Channel)
- Key performance indicators (KPIs) with change tracking
- Campaign management cards with ROI calculations
- Responsive stat cards with color-coded icons

📱 **Pages Included**
- **Dashboard** (`/`) - Main overview with stats, charts, and campaigns
- **Campaigns** (`/campaigns`) - Full campaign management interface
- **Analytics** (`/analytics`) - Detailed performance metrics
- **Audiences** (`/audiences`) - Audience segmentation and management
- **Email** (`/email`) - Email campaign tracking and analytics

🧩 **Reusable Components**
- `Sidebar.tsx` - Navigation sidebar with active route highlighting
- `Header.tsx` - Top header with search and user profile
- `StatCard.tsx` - Configurable stat cards with icons and change indicators
- `CampaignCard.tsx` - Campaign performance cards with ROI calculation
- `Charts.tsx` - Recharts-based visualization components

## Tech Stack

- **Framework**: Next.js 16.2.9
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS v4 with custom glass-morphism effects
- **Charts**: Recharts 3.8.1 for data visualization
- **Icons**: Lucide React 1.17.0
- **Theme**: next-themes 0.4.6
- **Language**: TypeScript 5

## Project Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── globals.css             # Global styles and design tokens
│   ├── page.tsx                # Dashboard home page
│   ├── campaigns/
│   │   └── page.tsx            # Campaigns page
│   ├── analytics/
│   │   └── page.tsx            # Analytics page
│   ├── audiences/
│   │   └── page.tsx            # Audiences page
│   └── email/
│       └── page.tsx            # Email campaigns page
├── components/
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── Header.tsx              # Page header with search
│   ├── StatCard.tsx            # KPI stat cards
│   ├── CampaignCard.tsx        # Campaign performance cards
│   └── Charts.tsx              # Chart components
├── package.json
└── README.md
```

## Design System

### Colors
- **Primary**: Blue (from-blue-600 to-blue-500)
- **Secondary**: Purple (from-purple-600 to-purple-500)
- **Success**: Emerald (from-emerald-600 to-emerald-500)
- **Warning**: Orange (from-orange-600 to-orange-500)
- **Background**: Dark slate gradient (slate-950 → slate-900)

### Typography
- **Font Family**: Geist (default system font)
- **Headings**: Bold, large sizes (text-2xl, text-3xl, text-4xl)
- **Body**: Regular weight, slate-300/400 text
- **Accents**: Semi-bold for labels and highlights

### Spacing & Layout
- **Sidebar Width**: 256px (w-64)
- **Main Content Padding**: 32px (p-8)
- **Gap Between Items**: 16-24px
- **Border Radius**: 8-12px (rounded-lg, rounded-xl)

## API Integration Ready

The dashboard is fully prepared for backend integration:

### Expected API Endpoints
```
GET /api/stats - Returns KPI data
GET /api/campaigns - Returns campaign list
GET /api/analytics/revenue - Returns revenue chart data
GET /api/analytics/channels - Returns traffic channel data
GET /api/audiences - Returns audience segments
GET /api/emails - Returns email campaign data
```

### Component Props for Backend Data
All components accept data via props, making them easy to connect to your backend:

**StatCard**
```tsx
<StatCard
  label="Revenue"
  value="$26,450"
  change={{ value: 12.5, isPositive: true }}
  icon={DollarSign}
  color="blue"
/>
```

**CampaignCard**
```tsx
<CampaignCard
  name="Campaign Name"
  status="active"
  impressions={125000}
  clicks={5420}
  ctr={4.34}
  spend={2500}
  revenue={8750}
/>
```

**Charts**
```tsx
<RevenueChart /> // Accepts data from API
<ChannelChart /> // Accepts data from API
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Or with npm
npm install

# Or with yarn
yarn install
```

### Development

```bash
# Start development server
pnpm dev

# Server runs on http://localhost:3000
```

### Build for Production

```bash
# Build the project
pnpm build

# Start production server
pnpm start
```

## Customization

### Adding New Pages

1. Create a new folder in `app/` (e.g., `app/reports/`)
2. Add `page.tsx` with the page component
3. Import `Sidebar` and `Header` components
4. Add route to sidebar menu in `components/Sidebar.tsx`

### Modifying Colors

Update the color values in:
- `app/globals.css` - Background gradients
- Component color props - Individual component colors
- Tailwind classes - Inline styling

### Adding New Sidebar Items

Edit `components/Sidebar.tsx` and add to the `menuItems` array:

```tsx
const menuItems = [
  // ... existing items
  { href: '/reports', label: 'Reports', icon: FileText },
];
```

## Styling Features

### Glass Morphism Effect
Uses backdrop blur and semi-transparent backgrounds:
```css
.glass-effect {
  background: rgba(71, 85, 105, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 12px;
}
```

### Responsive Design
- **Mobile**: Single column layout
- **Tablet**: 2-column grid (md:)
- **Desktop**: 3-4 column grid (lg:)
- Sidebar collapses on mobile (hidden on sm:)

## Performance Optimizations

✅ Code splitting with Next.js dynamic imports
✅ Optimized images with Next.js Image component
✅ CSS-in-JS with Tailwind for minimal bundle
✅ Recharts lazy loading for chart components
✅ Client-side rendering where needed (marked with 'use client')

## Environment Variables

None required for frontend standalone. When connecting to backend, add:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Deploy via Vercel Dashboard or CLI
vercel
```

### Other Platforms

```bash
pnpm build
# Deploy the .next folder
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## File Manifest

**Frontend Root Files:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.mjs` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration (Tailwind)
- `tailwind.config.ts` - Tailwind CSS v4 configuration

**Key Folders:**
- `/app` - Next.js App Router pages and layout
- `/components` - Reusable React components
- `/public` - Static assets (images, icons)

## Notes for Backend Integration

1. **API Calls**: Replace mock data in pages with API calls using fetch or SWR
2. **State Management**: Components use props - no global state management required
3. **Authentication**: Add auth middleware in `app/middleware.ts` if needed
4. **Error Handling**: Add try-catch blocks in API calls
5. **Loading States**: Add loading skeletons in StatCard and CampaignCard components

## Support

For questions about components, styling, or integration, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Recharts Documentation](https://recharts.org)

---

**Version**: 1.0.0  
**Last Updated**: 2025-06-11  
**Built with**: Next.js 16, React 19, Tailwind CSS v4
