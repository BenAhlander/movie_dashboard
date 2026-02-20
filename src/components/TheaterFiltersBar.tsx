'use client'

import { Box, TextField, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useState, useEffect, useRef } from 'react'
import type { TheaterFilters } from '@/types'

interface TheaterFiltersBarProps {
  filters: TheaterFilters
  onChange: (next: Partial<TheaterFilters>) => void
}

export function TheaterFiltersBar({ filters, onChange }: TheaterFiltersBarProps) {
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
      </Box>
    </Box>
  )
}
