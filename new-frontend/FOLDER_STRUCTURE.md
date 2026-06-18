# Frontend Folder Structure

## Complete Project Layout

```
frontend/
│
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout with metadata
│   ├── globals.css                # Global styles & design tokens
│   ├── page.tsx                   # Dashboard home page
│   ├── middleware.ts              # Optional: Auth middleware
│   │
│   ├── campaigns/
│   │   └── page.tsx               # Campaigns management page
│   │
│   ├── analytics/
│   │   └── page.tsx               # Analytics & insights page
│   │
│   ├── audiences/
│   │   └── page.tsx               # Audience segments page
│   │
│   └── email/
│       └── page.tsx               # Email campaigns page
│
├── components/                    # Reusable React Components
│   ├── Sidebar.tsx                # Navigation sidebar
│   ├── Header.tsx                 # Page header with search
│   ├── StatCard.tsx               # KPI stat card component
│   ├── CampaignCard.tsx           # Campaign card component
│   ├── Charts.tsx                 # Recharts visualizations
│   │
│   └── ui/                        # shadcn UI components (optional)
│       └── button.tsx             # Button component
│
├── lib/                           # Utility Functions
│   └── utils.ts                   # Tailwind classname helper
│
├── public/                        # Static Assets
│   ├── icon-light-32x32.png
│   ├── icon-dark-32x32.png
│   ├── icon.svg
│   └── apple-icon.png
│
├── .env.local                     # Local environment variables
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
│
├── next.config.mjs                # Next.js configuration
├── postcss.config.mjs             # PostCSS/Tailwind config
├── tailwind.config.ts             # Tailwind CSS v4 config
├── tsconfig.json                  # TypeScript configuration
│
├── package.json                   # Dependencies & scripts
├── pnpm-lock.yaml                 # Dependency lock file
│
├── README.md                      # Project documentation
├── INTEGRATION_GUIDE.md           # Backend integration guide
└── FOLDER_STRUCTURE.md            # This file
```

## Directory Details

### `/app` - Next.js App Router

The application's pages and layouts using Next.js 16 App Router.

**Key Files:**
- `layout.tsx` - Root layout wrapping all pages
- `globals.css` - Global styles and Tailwind configuration
- `page.tsx` - Main dashboard page

**Page Routes:**
- `/` → `page.tsx` (Dashboard)
- `/campaigns` → `campaigns/page.tsx`
- `/analytics` → `analytics/page.tsx`
- `/audiences` → `audiences/page.tsx`
- `/email` → `email/page.tsx`

### `/components` - React Components

Reusable, composable components for the dashboard.

**Core Components:**

1. **Sidebar.tsx** (68 lines)
   - Navigation menu with active route highlighting
   - Logo and branding
   - Settings and logout buttons
   - Responsive mobile support

2. **Header.tsx** (46 lines)
   - Top header bar with page title
   - Search bar (hidden on mobile)
   - Notification bell
   - User profile dropdown

3. **StatCard.tsx** (52 lines)
   - KPI display card
   - Icon support with color variants
   - Change percentage indicator
   - Hover effects

4. **CampaignCard.tsx** (74 lines)
   - Campaign performance display
   - Status badge (active/paused/completed)
   - Metrics grid (impressions, clicks, CTR)
   - ROI calculation and display

5. **Charts.tsx** (77 lines)
   - RevenueChart: Line chart for revenue trends
   - ChannelChart: Bar chart for traffic sources
   - Configured with dark theme styling

### `/lib` - Utility Functions

**utils.ts**
- `cn()` function for conditional Tailwind classes
- Helper utilities for styling

### `/public` - Static Assets

Favicon and icon files served directly by Next.js.

## Component Dependencies

```
Sidebar
  ├── lucide-react (icons)
  └── next/navigation (routing)

Header
  ├── lucide-react (icons)
  └── CSS variables

StatCard
  ├── lucide-react (icons)
  └── TypeScript interfaces

CampaignCard
  ├── lucide-react (icons)
  └── TypeScript interfaces

Charts
  ├── recharts (visualization)
  ├── data formatting
  └── CSS styling

Pages (page.tsx)
  ├── Sidebar
  ├── Header
  ├── StatCard
  ├── CampaignCard
  ├── Charts
  ├── TypeScript types
  └── Mock data / API calls
```

## Configuration Files

### `next.config.mjs`
- Next.js 16 configuration
- Build optimization settings
- API routes configuration

### `postcss.config.mjs`
- PostCSS plugins
- Tailwind CSS v4 integration

### `tailwind.config.ts`
- Tailwind CSS v4 configuration
- Custom theme extensions
- Plugin configuration

### `tsconfig.json`
- TypeScript compiler options
- Path aliases (`@/*`)
- Strict mode enabled

### `package.json`
**Scripts:**
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

**Dependencies:**
- next@16.2.9
- react@19.2.4
- react-dom@19.2.4
- recharts@3.8.1
- lucide-react@1.17.0
- tailwindcss@4
- typescript@5

## File Organization Principles

### By Type (Current Structure)
```
components/     - All React components
app/           - All pages and layouts
lib/           - Utilities and helpers
public/        - Static assets
```

### Alternative: By Feature
If you prefer feature-based organization:
```
features/
  ├── dashboard/
  │   ├── components/
  │   ├── hooks/
  │   └── page.tsx
  ├── campaigns/
  │   ├── components/
  │   └── page.tsx
  └── analytics/
      ├── components/
      └── page.tsx
```

## Adding New Pages

To add a new page (e.g., `/reports`):

1. Create folder: `app/reports/`
2. Create file: `app/reports/page.tsx`
3. Import base components:
   ```tsx
   import { Sidebar } from '@/components/Sidebar';
   import { Header } from '@/components/Header';
   ```
4. Add route to sidebar:
   ```tsx
   // In Sidebar.tsx
   { href: '/reports', label: 'Reports', icon: FileText }
   ```

## Adding New Components

Template for new components:

```tsx
// components/NewComponent.tsx
import { LucideIcon } from 'lucide-react';

interface NewComponentProps {
  title: string;
  // ... other props
}

export function NewComponent({ title }: NewComponentProps) {
  return (
    <div className="stat-card">
      {/* Component JSX */}
    </div>
  );
}
```

## Styling Organization

### Global Styles
- `app/globals.css` - All global CSS
  - Tailwind directives
  - Custom component classes
  - Animation definitions
  - Design token variables

### Component Styles
- Inline Tailwind classes in JSX
- Custom classes from globals.css
- CSS modules (optional)

### Theme Variables
Update in `app/globals.css`:
```css
:root {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... more variables */
}
```

## Performance Considerations

### Code Splitting
- Pages are automatically code-split by Next.js
- Shared components are bundled together
- Chart library loads on demand

### Asset Optimization
- Icons: Lucide React (SVG)
- Images: Use Next.js Image component when adding
- CSS: Tailwind purges unused styles

### Bundle Size
```
Main bundle: ~150KB
Charts: ~200KB (lazy loaded)
Icons: ~5KB
```

## Environment Configuration

### Local Development
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production
Set in deployment platform:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Git Integration

Recommended `.gitignore` entries:
```
node_modules/
.next/
.env.local
.env.*.local
dist/
build/
*.log
```

## Deployment Structure

Files needed for deployment:
```
├── .next/              (Generated by build)
├── public/
├── node_modules/       (Installed by pnpm)
├── package.json
├── next.config.mjs
├── postcss.config.mjs
└── tsconfig.json
```

## Integration Checklist

When integrating with backend:

- [ ] Create `.env.local` with API URL
- [ ] Update page components with API calls
- [ ] Add error handling
- [ ] Add loading states
- [ ] Implement authentication
- [ ] Test all routes
- [ ] Update README with API docs
- [ ] Deploy and verify

---

For more details, see:
- `README.md` - Feature overview
- `INTEGRATION_GUIDE.md` - Backend integration
- Individual component files for implementation details
