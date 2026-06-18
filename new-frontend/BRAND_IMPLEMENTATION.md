# What The *DS - Marketing Dashboard
## Brand Implementation Guide

---

## Overview

Your marketing dashboard has been completely redesigned to match the **What The *DS** brand guidelines and visual identity. This document outlines the implementation and theming system.

---

## Brand Color Palette

### Core Colors

| Color | Hex Code | Usage | Light Mode | Dark Mode |
|-------|----------|-------|-----------|-----------|
| **Oranje** | `#FF4D00` | Primary CTA, accents, highlights | Primary button, badges | Primary button, highlights |
| **Zwart** | `#0A0A0A` | Background (primary) | Light text on light BG | Dark background |
| **Grafiet** | `#1C1C1C` | Card backgrounds | Light gray surfaces | Dark surfaces |
| **Wit** | `#FAFAFA` | Text (primary), light backgrounds | White backgrounds | Primary text |

### Secondary Colors

- **Gray Light**: `#BBBBBB` - Muted text, borders
- **Gray Mid**: `#777777` - Secondary text
- **Emerald**: `#55FF55` - Success status
- **Amber**: For warnings and paused states

---

## Typography

### Font Stack

```css
Heading Font: 'Barlow Condensed' (900 weight - Bold, all caps)
Body Font: 'Barlow' (400/500/600/700 weights)
```

### Typography Scale

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| h1 / .h1 | 3.75rem (60px) | 900 | Page titles |
| h2 / .h2 | 3.5rem (56px) | 900 | Section headers |
| h3 / .h3 | 2rem (32px) | 900 | Card titles |
| h4 / .h4 | 1.5rem (24px) | 900 | Subsection headers |
| .label | 0.75rem (12px) | 600 | Labels, badges, captions |
| body / p | 1rem (16px) | 400 | Default text |

---

## Theme System

### Dark Mode (Default - Brand Primary)

The dashboard defaults to dark mode, featuring:
- **Background**: `#0A0A0A` (Pure black)
- **Cards**: `#1C1C1C` (Dark gray)
- **Text**: `#FAFAFA` (Off-white)
- **Accents**: `#FF4D00` (Bright orange)
- **Borders**: `rgba(255, 255, 255, 0.08)` (Subtle white transparency)

#### Implementation

Add `.dark` class to `<html>` element to enable dark mode:

```html
<html class="dark">
  <!-- Content -->
</html>
```

### Light Mode (Brand Secondary)

Optional light theme for daytime use:
- **Background**: `#FAFAFA` (Off-white)
- **Cards**: `#FFFFFF` (Pure white)
- **Text**: `#0A0A0A` (Pure black)
- **Accents**: `#FF4D00` (Same orange)
- **Borders**: `rgba(0, 0, 0, 0.14)` (Subtle black transparency)

---

## Component Styling

### Cards

```css
.card {
  background: var(--card);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.dark .card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.card-accent {
  border-top: 4px solid #FF4D00; /* Orange accent stripe */
}
```

### Stat Cards

Stat values are displayed in large, bold condensed font:

```css
.stat-value {
  font-family: 'Barlow Condensed';
  font-size: 2.25rem;
  font-weight: 900;
  color: #FF4D00;
  text-transform: uppercase;
}
```

### Buttons

#### Primary Button
- **Light**: Orange background (`#FF4D00`)
- **Dark**: Orange background (`#FF4D00`)
- **Hover**: Darker orange (`#E54200`)
- **Text**: White in both modes

```css
.btn-primary {
  background: #FF4D00;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.75rem 1.5rem;
  border-radius: 0.25rem;
}
```

#### Secondary Button
- Border: 2px gray or slate
- Text: Gray, turns orange on hover
- No fill background

#### Ghost Button
- Transparent
- Gray text, turns orange on hover
- Subtle background on hover

### Status Indicators

```css
.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.status-dot.active { background: #55FF55; }
.status-dot.paused { background: #FF4D00; }
.status-dot.completed { background: gray; }
```

---

## Day/Night Mode Switching

### Using next-themes

The project includes `next-themes` for seamless theme switching:

```tsx
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
    </button>
  )
}
```

### CSS Custom Properties

Theme variables are available in CSS:

```css
html {
  --color-oranje: #FF4D00;
  --color-zwart: #0A0A0A;
  --color-wit: #FAFAFA;
}

.dark {
  --bg: #0A0A0A;
  --fg: #FAFAFA;
  --card: #1C1C1C;
}
```

---

## Layout & Spacing

### Sidebar Navigation
- **Width**: 16rem (256px)
- **Position**: Fixed left
- **Logo**: "WHAT THE *DS" with orange asterisk
- **Items**: Uppercase labels with icons
- **Active State**: Left border + orange text + darker background

### Header
- **Position**: Fixed, sticky top
- **Background**: Card background
- **Content**: Page title, description, search, notifications, user profile
- **Logo**: "*" symbol in orange in user avatar

### Main Content
- **Grid**: Responsive 1-4 columns for stat cards
- **Charts**: 2/3 width revenue chart, 1/3 width traffic chart
- **Campaign Cards**: 1-3 columns depending on breakpoint
- **Gaps**: 1.5rem (24px) consistent spacing

---

## Assets & Brand Elements

### Logo Variations

1. **Stacked (Dark)**: White text + orange asterisk (primary)
2. **Stacked (Light)**: Black text + orange asterisk
3. **Horizontal (Dark)**: White "WHAT THE" + orange "*" + orange "DS"
4. **Horizontal (Light)**: Black text + orange accents
5. **Icon**: Orange asterisk only (favicon, avatar)

### Color Swatches

```
Zwart:  #0A0A0A (Primary background - dark mode)
Oranje: #FF4D00 (Primary accent - both modes)
Grafiet: #1C1C1C (Secondary background - dark mode)
Wit:    #FAFAFA (Primary text - dark mode)
```

---

## Usage Notes

### When to Use Each Color

| Scenario | Color | Notes |
|----------|-------|-------|
| Primary buttons | Orange (#FF4D00) | Use sparingly for key CTAs |
| Active navigation | Orange (#FF4D00) | Highlight current page |
| Card accents | Orange top border | Subtle highlight on important cards |
| Success status | Emerald green | For positive metrics |
| Backgrounds (dark) | Zwart/Grafiet | Use Zwart for html, Grafiet for cards |
| Text (dark mode) | Wit (#FAFAFA) | High contrast on dark backgrounds |
| Muted text | Gray colors | For labels, secondary text |
| Borders | Gray with transparency | Subtle, non-intrusive |

### Best Practices

1. **Maintain high contrast**: Always ensure text is readable
2. **Consistent spacing**: Use 6px, 8px, 12px, 16px, 24px, 32px increments
3. **Typography hierarchy**: Use Barlow Condensed for headlines only
4. **Orange accent**: Use sparingly for key interactive elements
5. **Dark mode default**: Always default to dark theme
6. **Responsive**: Test across desktop, tablet, mobile
7. **Accessibility**: Ensure all interactive elements have clear hover states

---

## CSS Custom Classes

### Utility Classes

```css
.card              /* Card container with borders */
.card-accent       /* Orange top border accent */
.stat-value        /* Large, bold stat text in orange */
.status-dot        /* Small circular status indicator */
.btn-primary       /* Orange button - primary CTA */
.btn-secondary     /* Outlined button */
.btn-ghost         /* Transparent button */
.label             /* Small uppercase label text */
.input-field       /* Form input with brand styling */
```

---

## File Structure

```
/app
  /layout.tsx          # Root layout with theme provider
  /globals.css         # Brand design system (this file)
  /page.tsx            # Dashboard homepage
  /campaigns           # Campaigns page
  /analytics           # Analytics page
  /audiences           # Audiences page
  /email               # Email campaigns page

/components
  /ThemeProvider.tsx   # next-themes wrapper
  /Sidebar.tsx         # Brand sidebar navigation
  /Header.tsx          # Page header with branding
  /StatCard.tsx        # KPI stat cards
  /CampaignCard.tsx    # Campaign metric cards
  /Charts.tsx          # Revenue and traffic charts
```

---

## Implementation Checklist

- [x] Brand colors defined (Oranje, Zwart, Grafiet, Wit)
- [x] Typography system (Barlow family)
- [x] Dark mode as default theme
- [x] Light mode support
- [x] Component styling aligned with brand
- [x] Sidebar with brand logo
- [x] Orange accents on CTAs
- [x] Status indicators
- [x] Responsive layout
- [x] Accessibility considerations
- [x] Day/night mode support

---

## Customization

To modify brand colors, update the CSS variables in `app/globals.css`:

```css
:root {
  --color-zwart: #0A0A0A;
  --color-oranje: #FF4D00;
  --color-grafiet: #1C1C1C;
  --color-wit: #FAFAFA;
}

.dark {
  /* Dark mode specific colors */
}
```

Then reference them in components using Tailwind or inline styles.

---

## Support

For questions about brand implementation, refer to the brand guidelines or contact the design team.

**Created**: June 11, 2025  
**Version**: 1.0.0  
**Framework**: Next.js 16 + React 19 + Tailwind CSS v4
