'use client'

import { Box } from '@mui/material'
import { Header } from './Header'
import { ModeSwitcher } from './ModeSwitcher'
import { DetailDrawer } from './DetailDrawer'
import {
  DetailDrawerProvider,
  useDetailDrawer,
} from './DetailDrawerContext'

function LayoutShellInner({ children }: { children: React.ReactNode }) {
  const { selectedMovieId, setSelectedMovieId, detailMovie, detailLoading } =
    useDetailDrawer()

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      <Header />
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

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <DetailDrawerProvider>
      <LayoutShellInner>{children}</LayoutShellInner>
    </DetailDrawerProvider>
  )
}
