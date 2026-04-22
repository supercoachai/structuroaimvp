import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/AppProviders'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-structuro',
})

export const metadata: Metadata = {
  title: 'Structuro',
  description: 'AI-powered platform voor volwassenen met ADHD-achtige kenmerken',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Structuro',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  /** Nodig voor env(safe-area-inset-*) op notch-/home-indicator-apparaten */
  viewportFit: 'cover' as const,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#E8F0FE"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#1C2B4A"
        />
      </head>
      <body className={`${dmSans.className} min-h-[100dvh] antialiased`}>
        <div className="relative flex min-h-[100dvh] w-full min-w-0 max-w-[100vw] flex-col overflow-x-hidden bg-[var(--structuro-bg)]">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  )
}
