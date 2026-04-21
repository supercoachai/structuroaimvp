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
      <body
        className={`${dmSans.className} min-h-[100dvh] antialiased bg-gray-100 text-[var(--structuro-text)]`}
      >
        <div className="flex min-h-[100dvh] w-full items-stretch justify-center">
          <div className="relative flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-[var(--structuro-bg)] shadow-xl">
            <AppProviders>{children}</AppProviders>
          </div>
        </div>
      </body>
    </html>
  )
}
