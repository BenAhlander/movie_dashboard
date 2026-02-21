'use client'

import { Box, ToggleButton, ToggleButtonGroup, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { PollFilters, PollSort, PollStatus } from '@/types'

interface PollsControlBarProps {
  filters: PollFilters
  onChange: (next: Partial<PollFilters>) => void
  onNewPoll: () => void
}

const toggleGroupSx = {
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
}

export function PollsControlBar({
  filters,
  onChange,
  onNewPoll,
}: PollsControlBarProps) {
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
          onChange={(_, v: PollSort | null) =>
            v != null && onChange({ sortBy: v })
          }
          size="small"
          sx={toggleGroupSx}
        >
          <ToggleButton value="new">New</ToggleButton>
          <ToggleButton value="popular">Popular</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={filters.status}
          exclusive
          onChange={(_, v: PollStatus | 'all' | null) =>
            v != null && onChange({ status: v })
          }
          size="small"
          sx={toggleGroupSx}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="open">Open</ToggleButton>
          <ToggleButton value="closed">Closed</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNewPoll}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Create Poll
        </Button>
      </Box>
    </Box>
  )
}
