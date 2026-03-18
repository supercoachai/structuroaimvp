import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SidebarProvider } from '../contexts/SidebarContext'
import { TaskProvider } from '../context/TaskContext'
import ErrorBoundary from '../components/ErrorBoundary'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Structuro',
  description: 'AI-powered platform voor volwassenen met ADHD-achtige kenmerken',
  icons: {
    icon: [
      { url: '/Logo Structuro.png', type: 'image/png' },
    ],
    apple: '/Logo Structuro.png',
    shortcut: '/Logo Structuro.png',
  },
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
      <body className={inter.className}>
        <ErrorBoundary>
          <TaskProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </TaskProvider>
        </ErrorBoundary>
        <SpeedInsights />
      </body>
    </html>
  )
}
