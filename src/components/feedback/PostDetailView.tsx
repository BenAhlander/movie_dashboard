'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  Chip,
  TextField,
  Button,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { VoteControl } from './VoteControl'
import type { FeedbackComment } from '@/types'

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

const categoryColors: Record<string, string> = {
  bug: '#f44336',
  feature: '#2196f3',
  general: 'rgba(255,255,255,0.5)',
}

const categoryLabels: Record<string, string> = {
  bug: 'Bug',
  feature: 'Feature Request',
  general: 'General',
}

const statusColors: Record<string, string> = {
  under_review: '#ffc107',
  in_progress: '#2196f3',
  completed: '#4caf50',
  declined: '#9e9e9e',
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  completed: 'Completed',
  declined: 'Declined',
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

interface PostData {
  id: string
  title: string
  body: string
  category: string
  score: number
  status: string
  created_at: string
  updated_at: string
}

interface PostDetailViewProps {
  post: PostData
  comments: FeedbackComment[]
}

export function PostDetailView({
  post,
  comments: initialComments,
}: PostDetailViewProps) {
  const router = useRouter()
  const [comments, setComments] = useState<FeedbackComment[]>(initialComments)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    severity: 'success' | 'error'
  } | null>(null)
  const anonId = useRef('')

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Vote state
  const [score, setScore] = useState(post.score)
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(0)

  useEffect(() => {
    anonId.current = getAnonId()
    const localVotes = getLocalVotes()
    if (localVotes[post.id] !== undefined) {
      setUserVote(localVotes[post.id] as -1 | 0 | 1)
    }
  }, [post.id])

  async function handleVote(direction: 'up' | 'down') {
    const currentVote = userVote
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
    setScore((prev) => prev + scoreDelta)
    setUserVote(newVote)
    setLocalVote(post.id, newVote)

    try {
      const res = await fetch(`/api/feedback/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: anonId.current, action }),
      })
      if (!res.ok) throw new Error('Vote failed')
      const data = await res.json()
      setScore(data.newScore)
    } catch {
      // Revert
      setScore((prev) => prev - scoreDelta)
      setUserVote(currentVote)
      setLocalVote(post.id, currentVote)
      setToast({ message: 'Vote failed. Please try again.', severity: 'error' })
    }
  }

  async function handleSubmitComment() {
    if (!commentBody.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/submissions/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentBody.trim(),
          author_id: anonId.current || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setToast({
          message: err.error || 'Failed to post comment',
          severity: 'error',
        })
        return
      }
      const { comment } = await res.json()
      setComments((prev) => [...prev, comment])
      setCommentBody('')
      setToast({ message: 'Comment posted!', severity: 'success' })
    } catch {
      setToast({ message: 'Failed to post comment', severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function handleDeleteClick(commentId: string) {
    setCommentToDelete(commentId)
    setDeleteDialogOpen(true)
  }

  function handleDeleteCancel() {
    setDeleteDialogOpen(false)
    setCommentToDelete(null)
  }

  async function handleDeleteConfirm() {
    if (!commentToDelete) return
    setDeleting(true)

    // Store the comment for potential rollback
    const commentIndex = comments.findIndex((c) => c.id === commentToDelete)
    const deletedComment = comments[commentIndex]

    // Optimistic update - remove comment immediately
    setComments((prev) => prev.filter((c) => c.id !== commentToDelete))
    setDeleteDialogOpen(false)

    try {
      const res = await fetch(
        `/api/submissions/${post.id}/comments/${commentToDelete}?author_id=${encodeURIComponent(anonId.current)}`,
        {
          method: 'DELETE',
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete comment')
      }
      setToast({ message: 'Comment deleted', severity: 'success' })
    } catch (e) {
      // Rollback - restore the comment
      setComments((prev) => {
        const newComments = [...prev]
        newComments.splice(commentIndex, 0, deletedComment)
        return newComments
      })
      setToast({
        message: e instanceof Error ? e.message : 'Failed to delete comment',
        severity: 'error',
      })
    } finally {
      setDeleting(false)
      setCommentToDelete(null)
    }
  }

  function isOwnComment(comment: FeedbackComment): boolean {
    return !!anonId.current && comment.author_id === anonId.current
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 }, pt: 2, pb: 4 }}>
      {/* Back button */}
      <Box sx={{ mb: 2 }}>
        <IconButton
          onClick={() => router.push('/feedback')}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {/* Post card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card
          sx={{
            display: 'flex',
            gap: { xs: 1.5, md: 2 },
            alignItems: 'flex-start',
            p: { xs: 1.5, md: 2 },
            background: 'rgba(26,26,26,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <VoteControl score={score} userVote={userVote} onVote={handleVote} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.5,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                {post.title}
              </Typography>
              <Chip
                label={categoryLabels[post.category] || post.category}
                size="small"
                sx={{
                  borderColor: categoryColors[post.category],
                  color: categoryColors[post.category],
                  bgcolor: 'transparent',
                  fontSize: '0.7rem',
                  height: 22,
                }}
                variant="outlined"
              />
              {post.status !== 'open' && (
                <Chip
                  label={statusLabels[post.status] || post.status}
                  size="small"
                  sx={{
                    borderColor: statusColors[post.status],
                    color: statusColors[post.status],
                    bgcolor: 'transparent',
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                  variant="outlined"
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {post.body}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {timeAgo(post.created_at)}
            </Typography>
          </Box>
        </Card>
      </motion.div>

      {/* Comments section */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </Typography>

        {comments.length === 0 && (
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            No comments yet. Be the first to reply.
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card
                sx={{
                  p: { xs: 1.5, md: 2 },
                  background: 'rgba(26,26,26,0.9)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: comment.is_agent_comment
                    ? '3px solid rgba(229,9,20,0.6)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    {comment.is_agent_comment && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'primary.main',
                          fontWeight: 600,
                          display: 'block',
                          mb: 0.5,
                        }}
                      >
                        🤖 Agent
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {comment.body}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      {timeAgo(comment.created_at)}
                    </Typography>
                  </Box>
                  {isOwnComment(comment) && !comment.is_agent_comment && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(comment.id)}
                      sx={{
                        color: 'text.disabled',
                        '&:hover': { color: 'error.main' },
                        ml: 1,
                      }}
                      aria-label="Delete comment"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Card>
            </motion.div>
          ))}
        </Box>
      </Box>

      {/* Comment input */}
      <Box sx={{ mt: 3 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          placeholder="Write a comment..."
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          disabled={submitting}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(26,26,26,0.9)',
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitComment}
            disabled={submitting || !commentBody.trim()}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </Box>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Comment?</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this comment? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={deleting}
            autoFocus
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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
