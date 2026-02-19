'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import type { AppMode } from '@/types'

const routes: { mode: AppMode; path: string }[] = [
  { mode: 'theater', path: '/theater' },
  { mode: 'streaming', path: '/streaming' },
]

function pathToMode(pathname: string): AppMode {
  if (pathname.startsWith('/streaming')) return 'streaming'
  return 'theater'
}

export function ModeSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const current = pathToMode(pathname)

  // Only show tabs on theater or streaming pages
  const shouldShowTabs = pathname.startsWith('/theater') || pathname.startsWith('/streaming')

  if (!shouldShowTabs) {
    return null
  }

  return (
    <ToggleButtonGroup
      value={current}
      exclusive
      onChange={(_, v: AppMode | null) => {
        if (v == null) return
        const route = routes.find((r) => r.mode === v)
        if (route) router.push(route.path)
      }}
      fullWidth
      sx={{
        display: 'flex',
        borderRadius: 0,
        '& .MuiToggleButtonGroup-grouped': { border: 0 },
        '& .MuiToggleButton-root': {
          py: 1.5,
          px: 3,
          color: 'text.secondary',
          borderBottom: '2px solid transparent',
          borderRadius: 0,
          '&.Mui-selected': {
            color: 'primary.main',
            borderBottomColor: 'primary.main',
            bgcolor: 'rgba(229,9,20,0.06)',
            '&:hover': { bgcolor: 'rgba(229,9,20,0.1)' },
          },
          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
        },
      }}
    >
      <ToggleButton value="theater">
        <MovieIcon sx={{ mr: 1, fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight={600}>
          Theater
        </Typography>
      </ToggleButton>
      <ToggleButton value="streaming">
        <LiveTvIcon sx={{ mr: 1, fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight={600}>
          Streaming
        </Typography>
      </ToggleButton>
    </ToggleButtonGroup>
  )
}
