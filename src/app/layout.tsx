import type { Metadata } from 'next'
import { ThemeRegistry } from '@/components/ThemeRegistry'
import '@/index.css'

export const metadata: Metadata = {
  title: 'FreshTomatoes — Movie Analytics',
  description:
    'FreshTomatoes — Netflix-inspired movie analytics dashboard with box office data, trending titles, and audience scores powered by TMDB.',
  other: {
    'theme-color': '#0d0d0d',
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
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}
