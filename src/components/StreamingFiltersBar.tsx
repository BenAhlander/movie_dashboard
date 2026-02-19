'use client'

import { Box, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, ToggleButtonGroup, ToggleButton, Collapse } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useState, useEffect, useRef } from 'react'
import type { StreamingFilters, StreamingSort, StreamingTypeFilter, SortDirection } from '@/types'

interface StreamingFiltersBarProps {
  filters: StreamingFilters
  onChange: (next: Partial<StreamingFilters>) => void
}

export function StreamingFiltersBar({ filters, onChange }: StreamingFiltersBarProps) {
  const [showMore, setShowMore] = useState(false)
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
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Sort</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort"
            onChange={(e) => onChange({ sortBy: e.target.value as StreamingSort })}
          >
            <MenuItem value="trending">Trending</MenuItem>
            <MenuItem value="score">Rating</MenuItem>
          </Select>
        </FormControl>
        <Box
          component="button"
          type="button"
          onClick={() => setShowMore(!showMore)}
          aria-label="Toggle filters"
          aria-expanded={showMore}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            border: 0,
            background: 'none',
            color: 'text.secondary',
            cursor: 'pointer',
            fontSize: '0.875rem',
            '&:hover': { color: 'text.primary' },
          }}
        >
          {showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          More
        </Box>
      </Box>
      <Collapse in={showMore}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Min score</span>
            <input
              type="range"
              min={0}
              max={100}
              value={filters.minScore}
              onChange={(e) => onChange({ minScore: Number(e.target.value) })}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: '0.75rem' }}>{filters.minScore}%</span>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {(['desc', 'asc'] as SortDirection[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ sortDir: d })}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  border: `1px solid ${filters.sortDir === d ? '#e50914' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: 4,
                  background: filters.sortDir === d ? 'rgba(229,9,20,0.15)' : 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {d === 'desc' ? 'Desc' : 'Asc'}
              </button>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}
