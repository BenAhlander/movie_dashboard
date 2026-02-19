import { Box, Typography } from '@mui/material'
import { type ReactNode } from 'react'

interface BucketRowProps {
  title: string
  children: ReactNode
}

export function BucketRow({ title, children }: BucketRowProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
        {title}
      </Typography>
      <Box
        role="region"
        aria-label={title}
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 1,
          scrollSnapType: 'x mandatory',
          '& > *': { scrollSnapAlign: 'start', flexShrink: 0 },
          scrollbarWidth: 'thin',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
