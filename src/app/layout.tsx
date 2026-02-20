import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeRegistry } from '@/components/ThemeRegistry'
import { LayoutShell } from '@/components/LayoutShell'
import { hasAuthEnabled } from '@/lib/hasAuth'
import '@/index.css'

export const metadata: Metadata = {
  title: 'FreshTomatoes — Movie Analytics Dashboard',
  description:
    'Explore box office hits, trending movies & TV, audience scores, and community feedback — all in one cinematic dashboard powered by TMDB.',
  metadataBase: new URL(
    process.env.APP_BASE_URL || 'https://freshtomatoes.vercel.app'
  ),
  openGraph: {
    title: 'FreshTomatoes — Movie Analytics Dashboard',
    description:
      'Box office data, trending titles, audience scores, and community feedback. Your cinematic command center.',
    siteName: 'FreshTomatoes',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreshTomatoes — Movie Analytics Dashboard',
    description:
      'Box office data, trending titles, audience scores, and community feedback. Your cinematic command center.',
    images: ['/og-image.png'],
  },
  other: {
    'theme-color': '#0d0d0d',
  },
  icons: {
    icon: '/freshtomatoes-icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.themoviedb.org" />
        <link rel="preconnect" href="https://image.tmdb.org" />
      </head>
      <body>
        <ThemeRegistry>
          <LayoutShell authEnabled={hasAuthEnabled()}>{children}</LayoutShell>
        </ThemeRegistry>
        <Analytics />
      </body>
    </html>
  )
}
