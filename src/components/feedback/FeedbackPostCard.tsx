'use client'

import { useState } from 'react'
import {
  Box,
  Card,
  Chip,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { VoteControl } from './VoteControl'
import type { FeedbackPost } from '@/types'

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

interface FeedbackPostCardProps {
  post: FeedbackPost
  onVote: (postId: string, direction: 'up' | 'down') => void
  onDelete?: (postId: string) => void
}

export function FeedbackPostCard({
  post,
  onVote,
  onDelete,
}: FeedbackPostCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        onClick={() => router.push(`/feedback/${post.id}`)}
        sx={{
          display: 'flex',
          gap: { xs: 1.5, md: 2 },
          alignItems: 'flex-start',
          p: { xs: 1.5, md: 2 },
          background: 'rgba(26,26,26,0.9)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.2s',
          cursor: 'pointer',
          '&:hover': { borderColor: 'rgba(229,9,20,0.25)' },
        }}
      >
        <VoteControl
          score={post.score}
          userVote={post.userVote as -1 | 0 | 1}
          onVote={(dir) => onVote(post.id, dir)}
        />
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
            {onDelete && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmOpen(true)
                }}
                sx={{
                  color: 'text.disabled',
                  '&:hover': { color: '#f44336' },
                  ml: -0.5,
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 0.5,
            }}
          >
            {post.body}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="caption" color="text.disabled">
              {timeAgo(post.created_at)}
            </Typography>
            {(post.comment_count ?? 0) > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <ChatBubbleOutlineIcon
                  sx={{ fontSize: 14, color: 'text.disabled' }}
                />
                <Typography variant="caption" color="text.disabled">
                  {post.comment_count}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete post?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove your post and all its votes. This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              setConfirmOpen(false)
              onDelete?.(post.id)
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  )
}
