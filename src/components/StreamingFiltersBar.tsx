'use client'

import { Box, TextField, InputAdornment, ToggleButtonGroup, ToggleButton } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useState, useEffect, useRef } from 'react'
import type { StreamingFilters, StreamingTypeFilter } from '@/types'

interface StreamingFiltersBarProps {
  filters: StreamingFilters
  onChange: (next: Partial<StreamingFilters>) => void
}

export function StreamingFiltersBar({ filters, onChange }: StreamingFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (searchInput === filters.search) return
    debounceRef.current = setTimeout(() => {
      onChange({ search: searchInput })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  return (
    <Box sx={{ py: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 180,
            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 },
          }}
        />
        <ToggleButtonGroup
          value={filters.typeFilter}
          exclusive
          onChange={(_, v: StreamingTypeFilter | null) => v != null && onChange({ typeFilter: v })}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 1.5,
              color: 'text.secondary',
              borderColor: 'divider',
              '&.Mui-selected': { color: 'primary.main', borderColor: 'primary.main', bgcolor: 'rgba(229,9,20,0.08)' },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="movie">Movie</ToggleButton>
          <ToggleButton value="tv">TV</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  )
}
