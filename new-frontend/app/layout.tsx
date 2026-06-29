import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { DateRangeProvider } from '@/lib/date-range-context'
import { ClientProvider } from '@/lib/client-context'
import { LanguageProvider } from '@/lib/language-context'

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
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <ClientProvider>
              <DateRangeProvider>
                {children}
              </DateRangeProvider>
            </ClientProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
