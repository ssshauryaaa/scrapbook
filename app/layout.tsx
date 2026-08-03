import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'

export const metadata: Metadata = {
  title: {
    default: 'Scrapbook — Your Digital Memory Wall',
    template: '%s · Scrapbook',
  },
  description:
    'Send scraps, collect testimonials, and build your personal memory wall with friends on Scrapbook — the nostalgia-meets-modern social platform.',
  keywords: ['scrapbook', 'social', 'yearbook', 'testimonials', 'friends', 'memories'],
  openGraph: {
    type: 'website',
    siteName: 'Scrapbook',
    title: 'Scrapbook — Your Digital Memory Wall',
    description: 'Send scraps, collect testimonials, and build your personal memory wall.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
