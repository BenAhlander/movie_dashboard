import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { FilterState, SortField, SortDirection } from '../types'
import { SORT_OPTIONS } from '../utils/constants'

interface FiltersBarProps {
  filter: FilterState
  onFilterChange: (next: Partial<FilterState>) => void
}

export function FiltersBar({ filter, onFilterChange }: FiltersBarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        py: 2,
        px: { xs: 1, sm: 0 },
      }}
    >
      <ToggleButtonGroup
        value={`${filter.list}${filter.list === 'trending' ? `_${filter.window}` : ''}`}
        exclusive
        onChange={(_, v: string) => {
          if (!v) return
          if (v === 'now_playing') onFilterChange({ list: 'now_playing' })
          else if (v === 'trending_day') onFilterChange({ list: 'trending', window: 'day' })
          else if (v === 'trending_week') onFilterChange({ list: 'trending', window: 'week' })
        }}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            color: 'text.secondary',
            borderColor: 'divider',
            '&.Mui-selected': { color: 'primary.main', borderColor: 'primary.main', bgcolor: 'rgba(229,9,20,0.08)' },
          },
        }}
      >
        <ToggleButton value="now_playing">Now Playing</ToggleButton>
        <ToggleButton value="trending_day">Trending (Day)</ToggleButton>
        <ToggleButton value="trending_week">Trending (Week)</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        size="small"
        placeholder="Search titles…"
        value={filter.search}
        onChange={(e) => onFilterChange({ search: e.target.value })}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          minWidth: 200,
          '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'divider' },
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 160 }}>
        <Typography variant="caption" color="text.secondary">
          Min score
        </Typography>
        <Slider
          size="small"
          value={filter.minScore}
          onChange={(_, v) => onFilterChange({ minScore: v as number })}
          min={0}
          max={100}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}%`}
          sx={{ width: 100 }}
        />
      </Box>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Sort by</InputLabel>
        <Select
          value={filter.sortBy}
          label="Sort by"
          onChange={(e) => onFilterChange({ sortBy: e.target.value as SortField })}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <ToggleButtonGroup
        value={filter.sortDir}
        exclusive
        onChange={(_, v: SortDirection) => v != null && onFilterChange({ sortDir: v })}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            color: 'text.secondary',
            borderColor: 'divider',
            '&.Mui-selected': { color: 'primary.main', borderColor: 'primary.main' },
          },
        }}
      >
        <ToggleButton value="desc">Desc</ToggleButton>
        <ToggleButton value="asc">Asc</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}
