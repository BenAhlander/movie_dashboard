'use client'

import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Skeleton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import { posterUrl, backdropUrl } from '@/utils/imageUrl'
import { formatRuntime, formatDate, formatNumber, formatRevenue, formatCurrency } from '@/utils/formatters'
import { audienceScorePercent } from '@/utils/scoreScaling'
import type { MovieDetail } from '@/types'
import { TMDB_IMAGE_BASE } from '@/utils/constants'

interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  movie: MovieDetail | null
  loading: boolean
}

export function DetailDrawer({ open, onClose, movie, loading }: DetailDrawerProps) {
  const width = { xs: '100%', sm: 420, md: 480 }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.8)' } } }}
      PaperProps={{ sx: { width } }}
    >
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'flex-end', p: 1, bgcolor: 'background.paper' }}>
          <IconButton onClick={onClose} size="large" aria-label="Close movie details">
            <CloseIcon />
          </IconButton>
        </Box>
        {loading && !movie && (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} className="shimmer" />
            <Skeleton variant="text" width="70%" height={40} sx={{ mt: 2 }} />
            {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="text" width="100%" height={24} sx={{ mt: 0.5 }} className="shimmer" />
          ))}
          </Box>
        )}
        {!loading && !movie && open && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Could not load details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try selecting another title or check your connection.
            </Typography>
          </Box>
        )}
        {movie && !loading && (
          <>
            <Box
              sx={{
                position: 'relative',
                height: 280,
                background: movie.backdrop_path
                  ? `linear-gradient(to top, #0d0d0d 0%, transparent 50%), url(${backdropUrl(movie.backdrop_path, 'w780')}) center/cover`
                  : 'linear-gradient(135deg, #1a0a0a 0%, #0d0d0d 100%)',
              }}
              className="vignette"
            />
            <Box sx={{ px: 2, pb: 4, mt: -2, position: 'relative' }}>
              <Box
                component="img"
                src={posterUrl(movie.poster_path, 'w342')}
                alt={movie.title}
                sx={{
                  width: 120,
                  height: 180,
                  borderRadius: 1,
                  border: '2px solid rgba(255,255,255,0.1)',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <Typography variant="h5" sx={{ mt: 1.5, fontWeight: 700 }}>
                {movie.title}
              </Typography>
              {movie.tagline && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                  {movie.tagline}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                <Chip size="small" label={`Audience: ${audienceScorePercent(movie.vote_average)}%`} />
                {(movie.revenue != null && movie.revenue > 0) && (
                  <Chip size="small" label={`Box office: ${formatRevenue(movie.revenue)}`} sx={{ color: 'rgba(255,255,255,0.95)' }} />
                )}
                <Chip size="small" label={formatRuntime(movie.runtime)} />
                <Chip size="small" label={formatDate(movie.release_date)} />
                <Chip size="small" label={`${formatNumber(movie.vote_count)} votes`} />
              </Box>
              {movie.genres?.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {movie.genres.map((g) => (
                    <Chip key={g.id} size="small" variant="outlined" label={g.name} />
                  ))}
                </Box>
              )}
              {(movie.budget || movie.revenue) ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Financials
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Budget</Typography>
                      <Typography variant="body2">{formatCurrency(movie.budget)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Revenue</Typography>
                      <Typography variant="body2">{formatCurrency(movie.revenue)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Profit</Typography>
                      {movie.budget && movie.revenue ? (() => {
                        const profit = movie.revenue - movie.budget
                        return (
                          <Typography variant="body2" sx={{ color: profit >= 0 ? '#4caf50' : '#f44336' }}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(Math.abs(profit))}
                            {profit < 0 && <span> (loss)</span>}
                          </Typography>
                        )
                      })() : (
                        <Typography variant="body2">N/A</Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ROI</Typography>
                      {movie.budget && movie.budget > 0 && movie.revenue ? (() => {
                        const roi = ((movie.revenue - movie.budget) / movie.budget) * 100
                        return (
                          <Typography variant="body2" sx={{ color: roi >= 0 ? '#4caf50' : '#f44336' }}>
                            {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                          </Typography>
                        )
                      })() : (
                        <Typography variant="body2">N/A</Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ) : null}
              {movie.overview && (
                <Typography variant="body2" sx={{ mt: 2, lineHeight: 1.6 }}>
                  {movie.overview}
                </Typography>
              )}
              {movie.credits?.cast && movie.credits.cast.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Cast
                  </Typography>
                  <Typography variant="body2">
                    {movie.credits.cast.slice(0, 8).map((c) => c.name).join(', ')}
                    {movie.credits.cast.length > 8 && '…'}
                  </Typography>
                </Box>
              )}
              {movie.credits?.crew && movie.credits.crew.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Directors
                  </Typography>
                  <Typography variant="body2">
                    {movie.credits.crew.map((c) => c.name).join(', ')}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Get tickets
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    component="a"
                    href={`https://www.cinemark.com/search?query=${encodeURIComponent(movie.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<ConfirmationNumberIcon sx={{ fontSize: 16 }} />}
                    label="Cinemark"
                    size="small"
                    clickable
                    sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                    variant="outlined"
                  />
                  <Chip
                    component="a"
                    href={`https://www.megaplextheatres.com/search?query=${encodeURIComponent(movie.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<ConfirmationNumberIcon sx={{ fontSize: 16 }} />}
                    label="Megaplex"
                    size="small"
                    clickable
                    sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                    variant="outlined"
                  />
                </Box>
              </Box>
              {movie.watch_providers?.results?.US && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Where to watch (US)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(movie.watch_providers.results.US.flatrate || []).slice(0, 6).map((p) => (
                      <Chip
                        key={p.provider_name}
                        size="small"
                        icon={
                          p.logo_path ? (
                            <Box
                              component="img"
                              src={`${TMDB_IMAGE_BASE}/w92${p.logo_path}`}
                              alt=""
                              sx={{ width: 18, height: 18, borderRadius: '50%' }}
                            />
                          ) : undefined
                        }
                        label={p.provider_name}
                      />
                    ))}
                    {(!movie.watch_providers.results.US.flatrate?.length && !movie.watch_providers.results.US.rent?.length) && (
                      <Typography variant="caption" color="text.secondary">
                        No providers listed
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  )
}
