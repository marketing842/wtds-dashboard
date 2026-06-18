import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { DateRangeProvider } from '@/lib/date-range-context'
import { ClientProvider } from '@/lib/client-context'

export const metadata: Metadata = {
  title: 'What The *DS - Marketing Dashboard',
  description: 'Full-service marketing bureau dashboard',
  generator: 'v0.app',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <ClientProvider>
            <DateRangeProvider>
              {children}
            </DateRangeProvider>
          </ClientProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
