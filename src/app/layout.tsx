import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/AppProviders'
import { getLocaleBootstrapScript } from '@/lib/i18n/clientLocale'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal'],
  variable: '--font-newsreader',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Structuro',
  description: 'Platform voor volwassenen met ADHD-achtige kenmerken',
  manifest: '/manifest.json',
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
    <html
      lang="nl"
      translate="no"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${newsreader.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getLocaleBootstrapScript(),
          }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#FDFBF4"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#1A2340"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div
          className="flex h-dvh min-h-dvh w-full flex-col overflow-hidden"
          style={{ backgroundColor: "var(--surface, #FDFBF4)" }}
        >
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  )
}
