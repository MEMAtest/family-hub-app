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
  description: 'A comprehensive family management application with calendar, budget tracking, meal planning, shopping lists, goals tracking, and family member management.',
  keywords: ['family', 'management', 'calendar', 'budget', 'meals', 'shopping', 'goals', 'PWA', 'mobile'],
  authors: [{ name: 'Family Hub Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Family Hub',
    startupImage: [
      {
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
        url: '/splash-390x844.png'
      },
      {
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
        url: '/splash-375x812.png'
      }
    ]
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ]
  },
  openGraph: {
    type: 'website',
    siteName: 'Family Hub',
    title: 'Family Hub - Manage Your Family Life',
    description: 'A comprehensive family management application with calendar, budget, meals, and more',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Family Hub App'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Family Hub',
    description: 'A comprehensive family management application',
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3B82F6' },
    { media: '(prefers-color-scheme: dark)', color: '#1E40AF' }
  ]
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