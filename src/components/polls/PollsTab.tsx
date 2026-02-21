'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material'
import PollIcon from '@mui/icons-material/Poll'
import { useUser } from '@auth0/nextjs-auth0/client'
import { PollsControlBar } from './PollsControlBar'
import { PollCard } from './PollCard'
import { PollForm } from './PollForm'
import type { Poll, PollFilters } from '@/types'

const defaultFilters: PollFilters = {
  sortBy: 'new',
  status: 'all',
}

interface PollsTabProps {
  authEnabled?: boolean
}

export function PollsTab({ authEnabled }: PollsTabProps) {
  const { user } = useUser()
  const [polls, setPolls] = useState<Poll[]>([])
  const [filters, setFilters] = useState<PollFilters>(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    severity: 'success' | 'error'
  } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [votingPolls, setVotingPolls] = useState<Set<string>>(new Set())

  const fetchPolls = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          sort: filters.sortBy,
          status: filters.status,
          page: String(pageNum),
        })
        if (user?.sub) {
          params.set('userId', user.sub as string)
        }
        const res = await fetch(`/api/polls?${params}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const results: Poll[] = data.results || []

        if (append) {
          setPolls((prev) => [...prev, ...results])
        } else {
          setPolls(results)
        }
        setHasMore(results.length === 20 && data.total > pageNum * 20)
      } catch {
        setToast({ message: 'Failed to load polls', severity: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [filters, user]
  )

  useEffect(() => {
    setPage(1)
    fetchPolls(1)
  }, [fetchPolls])

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPolls(nextPage, true)
  }

  async function handleVote(pollId: string, optionId: string) {
    if (votingPolls.has(pollId)) return

    const poll = polls.find((p) => p.id === pollId)
    if (!poll || poll.status === 'closed' || poll.user_vote !== null) return

    // Mark as voting in progress
    setVotingPolls((prev) => new Set(prev).add(pollId))

    // Optimistic update
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p
        return {
          ...p,
          user_vote: optionId,
          total_votes: p.total_votes + 1,
          options: p.options.map((o) =>
            o.id === optionId
              ? { ...o, vote_count: o.vote_count + 1 }
              : o
          ),
        }
      })
    )

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Vote failed')
      }

      const data = await res.json()
      // Sync with server response
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? data.poll : p))
      )
    } catch (err) {
      // Revert optimistic update
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p
          return {
            ...p,
            user_vote: null,
            total_votes: p.total_votes - 1,
            options: p.options.map((o) =>
              o.id === optionId
                ? { ...o, vote_count: o.vote_count - 1 }
                : o
            ),
          }
        })
      )
      setToast({
        message:
          err instanceof Error ? err.message : 'Vote failed. Please try again.',
        severity: 'error',
      })
    } finally {
      setVotingPolls((prev) => {
        const next = new Set(prev)
        next.delete(pollId)
        return next
      })
    }
  }

  async function handleCreatePoll(data: {
    title: string
    description?: string
    options: string[]
    expires_in: '1d' | '3d' | '7d' | null
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        setToast({
          message: err.error || 'Failed to create poll',
          severity: 'error',
        })
        return false
      }
      const { poll } = await res.json()
      setPolls((prev) => [poll, ...prev])
      setToast({ message: 'Poll created!', severity: 'success' })
      return true
    } catch {
      setToast({ message: 'Failed to create poll', severity: 'error' })
      return false
    }
  }

  const handleNewPoll = () => {
    if (authEnabled && !user) {
      window.location.href = '/auth/login?returnTo=/polls'
      return
    }
    setFormOpen(true)
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 }, pt: 2 }}>
      <PollsControlBar
        filters={filters}
        onChange={(next) => setFilters((p) => ({ ...p, ...next }))}
        onNewPoll={handleNewPoll}
      />

      {loading && polls.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                p: 2.5,
                borderRadius: 1,
                bgcolor: 'rgba(26,26,26,0.9)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <Skeleton
                  variant="text"
                  width="50%"
                  height={28}
                  className="shimmer"
                />
                <Box sx={{ flex: 1 }} />
                <Skeleton
                  variant="rectangular"
                  width={56}
                  height={22}
                  sx={{ borderRadius: 8 }}
                  className="shimmer"
                />
              </Box>
              <Skeleton
                variant="text"
                width="80%"
                height={20}
                sx={{ mb: 1.5 }}
                className="shimmer"
              />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton
                  key={j}
                  variant="rectangular"
                  width="100%"
                  height={40}
                  sx={{ borderRadius: 1, mb: 0.75 }}
                  className="shimmer"
                />
              ))}
              <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                <Skeleton
                  variant="text"
                  width={60}
                  height={16}
                  className="shimmer"
                />
                <Skeleton
                  variant="text"
                  width={80}
                  height={16}
                  className="shimmer"
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {!loading && polls.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <PollIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            No polls yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Be the first to create a poll and get the community voting
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNewPoll}
          >
            Create first poll
          </Button>
        </Box>
      )}

      {polls.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVote}
              voting={votingPolls.has(poll.id)}
              isAuthenticated={!!user}
              authEnabled={!!authEnabled}
            />
          ))}
          {hasMore && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loading}
                sx={{
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                  },
                }}
              >
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <PollForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreatePoll}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            onClose={() => setToast(null)}
            variant="filled"
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  )
}
