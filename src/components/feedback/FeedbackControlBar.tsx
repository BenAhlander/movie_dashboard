'use client'

import { Box, ToggleButton, ToggleButtonGroup, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { FeedbackFilters, FeedbackSort, FeedbackCategory } from '@/types'

interface FeedbackControlBarProps {
  filters: FeedbackFilters
  onChange: (next: Partial<FeedbackFilters>) => void
  onNewPost: () => void
}

export function FeedbackControlBar({
  filters,
  onChange,
  onNewPost,
}: FeedbackControlBarProps) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <ToggleButtonGroup
          value={filters.sortBy}
          exclusive
          onChange={(_, v: FeedbackSort | null) =>
            v != null && onChange({ sortBy: v })
          }
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 1.5,
              color: 'text.secondary',
              borderColor: 'divider',
              '&.Mui-selected': {
                color: 'primary.main',
                borderColor: 'primary.main',
                bgcolor: 'rgba(229,9,20,0.08)',
              },
            },
          }}
        >
          <ToggleButton value="hot">Hot</ToggleButton>
          <ToggleButton value="new">New</ToggleButton>
          <ToggleButton value="top">Top</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={filters.category}
          exclusive
          onChange={(_, v: FeedbackCategory | 'all' | null) =>
            v != null && onChange({ category: v })
          }
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 1.5,
              color: 'text.secondary',
              borderColor: 'divider',
              '&.Mui-selected': {
                color: 'primary.main',
                borderColor: 'primary.main',
                bgcolor: 'rgba(229,9,20,0.08)',
              },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="bug">Bugs</ToggleButton>
          <ToggleButton value="feature">Features</ToggleButton>
          <ToggleButton value="general">General</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNewPost}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          New Post
        </Button>
      </Box>
    </Box>
  )
}
