'use client'

import { useState, useCallback } from 'react'
import {
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useFavorites, type Favorite } from './FavoritesContext'
import { posterUrl } from '@/utils/imageUrl'

export function ProfileView() {
  const { user, isLoading } = useUser()
  const { favorites, loading: favsLoading, removeFavorite, addFavorite } = useFavorites()
  const [pendingRemove, setPendingRemove] = useState<Favorite | null>(null)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleRemove = useCallback(
    async (fav: Favorite) => {
      setPendingRemove(fav)
      await removeFavorite(fav.id)

      const timer = setTimeout(() => {
        setPendingRemove(null)
      }, 3000)
      setUndoTimer(timer)
    },
    [removeFavorite],
  )

  const handleUndo = useCallback(async () => {
    if (!pendingRemove) return
    if (undoTimer) clearTimeout(undoTimer)

    try {
      await addFavorite({
        tmdb_id: pendingRemove.tmdb_id,
        title: pendingRemove.title,
        poster_path: pendingRemove.poster_path,
      })
    } catch {
      // silently fail undo
    }
    setPendingRemove(null)
  }, [pendingRemove, undoTimer, addFavorite])

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ pt: 6 }}>
        <Paper
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Skeleton variant="circular" width={80} height={80} />
          <Skeleton variant="text" width={160} height={32} />
          <Skeleton variant="text" width={200} height={20} />
        </Paper>
      </Container>
    )
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ pt: 6 }}>
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Not signed in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sign in to view your profile.
          </Typography>
          <Button href="/auth/login" variant="contained" color="primary">
            Sign in
          </Button>
        </Paper>
      </Container>
    )
  }

  const emptySlots = 5 - favorites.length

  return (
    <Container maxWidth="md" sx={{ pt: 6 }}>
      <Paper
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Avatar
          src={user.picture ?? undefined}
          alt={user.name ?? ''}
          sx={{ width: 80, height: 80 }}
        />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={700}>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>

        {user.nickname && (
          <InfoRow label="Nickname" value={user.nickname} />
        )}
        {user.email_verified !== undefined && (
          <InfoRow
            label="Email verified"
            value={user.email_verified ? 'Yes' : 'No'}
          />
        )}
        {user.updated_at && (
          <InfoRow
            label="Last updated"
            value={new Date(user.updated_at).toLocaleDateString()}
          />
        )}

        <Button
          href="/auth/logout"
          variant="outlined"
          sx={{
            mt: 2,
            borderColor: 'divider',
            color: 'text.primary',
            textTransform: 'none',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
            },
          }}
        >
          Sign out
        </Button>
      </Paper>

      {/* My Top 5 Section */}
      <Paper
        sx={{
          mt: 3,
          p: 4,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            My Top 5
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {favorites.length} of 5 selected
          </Typography>
        </Box>

        {favsLoading ? (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rectangular" width={120} height={200} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : favorites.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <FavoriteBorderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              You haven&apos;t added any favorites yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Browse movies and tap the heart icon to add them here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {favorites.map((fav) => (
              <Box
                key={fav.id}
                sx={{
                  position: 'relative',
                  width: 120,
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: 120,
                    height: 180,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Box
                    component="img"
                    src={posterUrl(fav.poster_path, 'w342')}
                    alt={fav.title}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const t = e.target as HTMLImageElement
                      if (t) t.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><rect fill="%231a1a1a" width="120" height="180"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em" font-size="12">No poster</text></svg>'
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemove(fav)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.7)',
                      '&:hover': { bgcolor: 'rgba(229,9,20,0.8)' },
                      p: 0.25,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16, color: '#fff' }} />
                  </IconButton>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fav.title}
                </Typography>
              </Box>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <Box
                key={`empty-${i}`}
                sx={{
                  width: 120,
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 120,
                    height: 180,
                    borderRadius: 1,
                    border: '2px dashed rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AddIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.15)' }} />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Snackbar
        open={pendingRemove !== null}
        autoHideDuration={3000}
        onClose={() => setPendingRemove(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          onClose={() => setPendingRemove(null)}
          action={
            <Button color="inherit" size="small" onClick={handleUndo}>
              Undo
            </Button>
          }
        >
          Removed &quot;{pendingRemove?.title}&quot; from favorites
        </Alert>
      </Snackbar>
    </Container>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}
