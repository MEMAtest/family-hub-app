import type { Metadata } from 'next'
import { Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/common/AppProviders'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  preload: false
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif',
  preload: false
})

export const metadata: Metadata = {
  title: 'Omosanya Home',
  description: 'A family command centre for plans, money, meals, shopping, goals, and household moments.',
  keywords: ['family', 'management', 'calendar', 'budget', 'meals', 'shopping', 'goals', 'PWA', 'mobile'],
  authors: [{ name: 'Omosanya Home Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Omosanya Home',
    startupImage: [
      {
        url: '/apple-splash-1170x2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)'
      },
      {
        url: '/apple-splash-1284x2778.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)'
      },
      {
        url: '/apple-splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)'
      },
      {
        url: '/apple-splash-828x1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/apple-splash-1242x2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)'
      },
      {
        url: '/apple-splash-1536x2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/apple-splash-1668x2224.png',
        media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/apple-splash-1668x2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/apple-splash-2048x2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)'
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
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/icon-180x180.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/icon.svg', color: '#147C72' }
    ]
  },
  openGraph: {
    type: 'website',
    siteName: 'Omosanya Home',
    title: 'Omosanya Home',
    description: 'A comprehensive family management application with calendar, budget, meals, and more',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Omosanya Home'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omosanya Home',
    description: 'A comprehensive family management application for the Omosanya family',
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
    { media: '(prefers-color-scheme: light)', color: '#147C72' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1215' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${instrumentSerif.variable} bg-[#f5f7f1] dark:bg-[#0d1215]`}>
      <body className={`${plusJakarta.className} antialiased bg-[#f5f7f1] dark:bg-[#0d1215] text-[#18221f] dark:text-slate-100 transition-colors`}>
        <AppProviders>
          {children}
        </AppProviders>
        <Analytics />
        <Script
          src="https://owned-portfolio-analytics.mema-consultants.workers.dev/tracker.js"
          data-project="family-hub-app"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
