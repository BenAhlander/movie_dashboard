'use client'

import { ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import type { AppMode } from '@/types'

interface ModeSwitcherProps {
  value: AppMode
  onChange: (mode: AppMode) => void
}

export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v: AppMode | null) => v != null && onChange(v)}
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
