'use client'

import {
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material'
import { useUser } from '@auth0/nextjs-auth0/client'

export function ProfileView() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ pt: 6 }}>
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
      <Container maxWidth="sm" sx={{ pt: 6 }}>
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

  return (
    <Container maxWidth="sm" sx={{ pt: 6 }}>
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
