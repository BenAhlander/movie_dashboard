'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import { useUser } from '@auth0/nextjs-auth0/client'
import { FeedbackControlBar } from './FeedbackControlBar'
import { FeedbackPostCard } from './FeedbackPostCard'
import { FeedbackForm } from './FeedbackForm'
import type { FeedbackPost, FeedbackFilters, FeedbackFormData } from '@/types'

const ANON_ID_KEY = 'ft_anon_id'
const VOTES_KEY = 'ft_votes'

function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

function getLocalVotes(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}')
  } catch {
    return {}
  }
}

function setLocalVote(postId: string, vote: number) {
  const votes = getLocalVotes()
  if (vote === 0) {
    delete votes[postId]
  } else {
    votes[postId] = vote
  }
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes))
}

const defaultFilters: FeedbackFilters = {
  sortBy: 'hot',
  category: 'all',
}

interface FeedbackTabProps {
  authEnabled?: boolean
}

export function FeedbackTab({ authEnabled }: FeedbackTabProps) {
  const { user } = useUser()
  const [posts, setPosts] = useState<FeedbackPost[]>([])
  const [filters, setFilters] = useState<FeedbackFilters>(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    severity: 'success' | 'error'
  } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const anonId = useRef('')

  // Initialize anon ID on mount
  useEffect(() => {
    anonId.current = getAnonId()
  }, [])

  // Fetch posts
  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      if (!anonId.current) anonId.current = getAnonId()
      setLoading(true)
      try {
        const params = new URLSearchParams({
          sort: filters.sortBy,
          category: filters.category,
          page: String(pageNum),
          voterId: anonId.current,
        })
        const res = await fetch(`/api/feedback?${params}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        // Merge server votes with localStorage (localStorage takes precedence for UI)
        const localVotes = getLocalVotes()
        const results: FeedbackPost[] = (data.results || []).map(
          (p: FeedbackPost) => ({
            ...p,
            userVote:
              localVotes[p.id] !== undefined ? localVotes[p.id] : p.userVote,
          })
        )

        if (append) {
          setPosts((prev) => [...prev, ...results])
        } else {
          setPosts(results)
        }
        setHasMore(results.length === 20 && data.total > pageNum * 20)
      } catch {
        setToast({ message: 'Failed to load feedback', severity: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [filters]
  )

  useEffect(() => {
    setPage(1)
    fetchPosts(1)
  }, [fetchPosts])

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage, true)
  }

  async function handleVote(postId: string, direction: 'up' | 'down') {
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const currentVote = post.userVote as -1 | 0 | 1
    let newVote: -1 | 0 | 1
    let action: 'up' | 'down' | 'remove'

    if (direction === 'up') {
      newVote = currentVote === 1 ? 0 : 1
      action = currentVote === 1 ? 'remove' : 'up'
    } else {
      newVote = currentVote === -1 ? 0 : -1
      action = currentVote === -1 ? 'remove' : 'down'
    }

    const scoreDelta = newVote - currentVote

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, userVote: newVote, score: p.score + scoreDelta }
          : p
      )
    )
    setLocalVote(postId, newVote)

    try {
      const res = await fetch(`/api/feedback/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: anonId.current, action }),
      })
      if (!res.ok) throw new Error('Vote failed')
      const data = await res.json()

      // Sync server score
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, score: data.newScore } : p))
      )
    } catch {
      // Revert optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, userVote: currentVote, score: p.score - scoreDelta }
            : p
        )
      )
      setLocalVote(postId, currentVote)
      setToast({ message: 'Vote failed. Please try again.', severity: 'error' })
    }
  }

  async function handleCreatePost(data: FeedbackFormData): Promise<boolean> {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        setToast({
          message: err.error || 'Failed to create post',
          severity: 'error',
        })
        return false
      }
      const { post } = await res.json()
      setPosts((prev) => [{ ...post, userVote: 0 }, ...prev])
      setToast({ message: 'Post created!', severity: 'success' })
      return true
    } catch {
      setToast({ message: 'Failed to create post', severity: 'error' })
      return false
    }
  }

  const handleNewPost = () => {
    if (authEnabled && !user) {
      window.location.href = '/auth/login?returnTo=/feedback'
      return
    }
    setFormOpen(true)
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 }, pt: 2 }}>
      <FeedbackControlBar
        filters={filters}
        onChange={(next) => setFilters((p) => ({ ...p, ...next }))}
        onNewPost={handleNewPost}
      />

      {loading && posts.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, p: 2 }}>
              <Skeleton
                variant="rectangular"
                width={40}
                height={80}
                sx={{ borderRadius: 1 }}
                className="shimmer"
              />
              <Box sx={{ flex: 1 }}>
                <Skeleton
                  variant="text"
                  width="60%"
                  height={24}
                  className="shimmer"
                />
                <Skeleton
                  variant="text"
                  width="100%"
                  height={20}
                  sx={{ mt: 0.5 }}
                  className="shimmer"
                />
                <Skeleton
                  variant="text"
                  width="30%"
                  height={16}
                  sx={{ mt: 0.5 }}
                  className="shimmer"
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {!loading && posts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <ChatBubbleOutlineIcon
            sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
          />
          <Typography variant="h6" gutterBottom>
            No feedback yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Be the first to share your thoughts about FreshTomatoes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNewPost}
          >
            Create first post
          </Button>
        </Box>
      )}

      {posts.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {posts.map((post) => (
            <FeedbackPostCard key={post.id} post={post} onVote={handleVote} />
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

      <FeedbackForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreatePost}
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
