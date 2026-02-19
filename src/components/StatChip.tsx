'use client'

import { Chip, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface StatChipProps {
  label: string
  value: string | number
  tooltip?: ReactNode
  color?: 'default' | 'primary'
}

export function StatChip({ label, value, tooltip, color = 'default' }: StatChipProps) {
  const content = (
    <Chip
      size="small"
      label={
        <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
          {label}: {value}
        </Typography>
      }
      color={color}
      variant="outlined"
      sx={{
        borderColor: color === 'primary' ? 'primary.main' : 'divider',
        '& .MuiChip-label': { px: 0.5 },
      }}
    />
  )
  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow placement="top">
        <span>{content}</span>
      </Tooltip>
    )
  }
  return content
}
