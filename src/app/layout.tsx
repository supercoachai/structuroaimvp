import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/AppProviders'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Structuro',
  description: 'AI-powered platform voor volwassenen met ADHD-achtige kenmerken',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={`${inter.className} min-h-full bg-gray-50 text-gray-900 antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
