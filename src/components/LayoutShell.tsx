'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Box } from '@mui/material'
import { Auth0Provider } from '@auth0/nextjs-auth0/client'
import { Header } from './Header'
import { ModeSwitcher } from './ModeSwitcher'
import { DetailDrawer } from './DetailDrawer'
import {
  DetailDrawerProvider,
  useDetailDrawer,
} from './DetailDrawerContext'
import { FavoritesProvider } from './FavoritesContext'

interface LayoutShellProps {
  children: React.ReactNode
  authEnabled?: boolean
}

function ScrollToTop() {
  const pathname = usePathname()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function LayoutShellInner({
  children,
  authEnabled,
}: {
  children: React.ReactNode
  authEnabled?: boolean
}) {
  const { selectedMovieId, setSelectedMovieId, detailMovie, detailLoading } =
    useDetailDrawer()

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      <ScrollToTop />
      <Header authEnabled={authEnabled} />
      <ModeSwitcher />
      {children}
      <DetailDrawer
        open={selectedMovieId != null}
        onClose={() => setSelectedMovieId(null)}
        movie={detailMovie ?? null}
        loading={selectedMovieId != null && detailLoading}
      />
    </Box>
  )
}

export function LayoutShell({ children, authEnabled }: LayoutShellProps) {
  const inner = (
    <DetailDrawerProvider>
      <FavoritesProvider>
        <LayoutShellInner authEnabled={authEnabled}>
          {children}
        </LayoutShellInner>
      </FavoritesProvider>
    </DetailDrawerProvider>
  )

  if (authEnabled) {
    return <Auth0Provider>{inner}</Auth0Provider>
  }

  return inner
}
