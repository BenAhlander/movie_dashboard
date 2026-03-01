'use client'

import { Box, Typography } from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import type { H2HFilm } from '@/types/h2h'
import { posterUrl } from '@/utils/imageUrl'

interface FilmPanelProps {
  film: H2HFilm
  side: 'left' | 'right'
  isHighlighted: boolean
}

export function FilmPanel({ film, side, isHighlighted }: FilmPanelProps) {
  const poster = posterUrl(film.posterPath, 'w342')

  return (
    <Box
      id={`h2h-film-${side}`}
      data-film-id={film.id}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 1, sm: 2 },
        py: 2,
        position: 'relative',
        transition: 'transform 0.2s ease',
        transform: isHighlighted ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      {/* Poster */}
      <Box
        sx={{
          width: { xs: 120, sm: 150, md: 170 },
          height: { xs: 180, sm: 225, md: 255 },
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: isHighlighted
            ? '0 8px 32px rgba(34, 197, 94, 0.3)'
            : '0 8px 24px rgba(0, 0, 0, 0.5)',
          transition: 'box-shadow 0.2s ease',
          flexShrink: 0,
        }}
      >
        {poster ? (
          <Box
            component="img"
            src={poster}
            alt={`${film.title} poster`}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
              WebkitUserDrag: 'none',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(26,26,26,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MovieIcon
              sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)' }}
            />
          </Box>
        )}
      </Box>

      {/* Title */}
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          mt: 1.5,
          textAlign: 'center',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.3,
          fontSize: { xs: '0.85rem', sm: '0.95rem' },
          maxWidth: { xs: 130, sm: 160, md: 180 },
        }}
      >
        {film.title}
      </Typography>

      {/* Year */}
      {film.year && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.25 }}
        >
          {film.year}
        </Typography>
      )}
    </Box>
  )
}
