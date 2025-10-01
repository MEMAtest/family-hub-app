import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ErrorBoundary from '@/components/common/ErrorBoundary'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Family Hub - Manage Your Family Life',
  description: 'A comprehensive family management application with calendar, budget tracking, meal planning, and more.',
  keywords: ['family', 'management', 'calendar', 'budget', 'meals', 'shopping'],
  authors: [{ name: 'Family Hub Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Family Hub',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Family Hub',
    title: 'Family Hub - Manage Your Family Life',
    description: 'A comprehensive family management application',
  },
  twitter: {
    card: 'summary',
    title: 'Family Hub',
    description: 'A comprehensive family management application',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}