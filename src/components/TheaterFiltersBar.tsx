import { Box, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Collapse } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useState } from 'react'
import type { TheaterFilters, TheaterSort, SortDirection } from '../types'

interface TheaterFiltersBarProps {
  filters: TheaterFilters
  onChange: (next: Partial<TheaterFilters>) => void
}

export function TheaterFiltersBar({ filters, onChange }: TheaterFiltersBarProps) {
  const [showMore, setShowMore] = useState(false)

  return (
    <Box sx={{ py: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
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
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort by"
            onChange={(e) => onChange({ sortBy: e.target.value as TheaterSort })}
          >
            <MenuItem value="revenue">Weekly box office</MenuItem>
            <MenuItem value="score">Rating</MenuItem>
            <MenuItem value="release_date">Release</MenuItem>
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
          Filters
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
