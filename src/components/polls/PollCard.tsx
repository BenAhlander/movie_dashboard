'use client'

import {
  Box,
  Card,
  Chip,
  Typography,
  ButtonBase,
  Link,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import { motion } from 'framer-motion'
import type { Poll, PollOption } from '@/types'

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

function getTimeRemaining(expiresAt: string): string | null {
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return null
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  if (hours < 1) {
    const minutes = Math.floor(remaining / (1000 * 60))
    return `${minutes}m left`
  }
  if (hours < 24) return `${hours}h left`
  const days = Math.floor(hours / 24)
  return `${days}d left`
}

function getStatusChip(poll: Poll) {
  if (poll.status === 'closed') {
    return (
      <Chip
        label="Closed"
        size="small"
        sx={{
          bgcolor: 'rgba(255,255,255,0.08)',
          color: 'text.secondary',
          fontSize: '0.7rem',
          height: 22,
        }}
      />
    )
  }

  if (poll.expires_at) {
    const remaining = new Date(poll.expires_at).getTime() - Date.now()
    const hoursLeft = remaining / (1000 * 60 * 60)

    if (hoursLeft <= 24 && hoursLeft > 0) {
      const label = getTimeRemaining(poll.expires_at)
      return (
        <Chip
          label={label}
          size="small"
          sx={{
            bgcolor: 'rgba(255,152,0,0.12)',
            color: '#ffb74d',
            fontSize: '0.7rem',
            height: 22,
          }}
        />
      )
    }
  }

  return (
    <Chip
      label="Open"
      size="small"
      sx={{
        bgcolor: 'rgba(76,175,80,0.12)',
        color: '#81c784',
        fontSize: '0.7rem',
        height: 22,
      }}
    />
  )
}

interface ResultBarProps {
  option: PollOption
  totalVotes: number
  isUserVote: boolean
}

function ResultBar({ option, totalVotes, isUserVote }: ResultBarProps) {
  const pct = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 1,
        overflow: 'hidden',
        mb: 0.75,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${pct}%`,
          bgcolor: isUserVote ? 'rgba(229,9,20,0.25)' : 'rgba(68,68,68,0.4)',
          borderRadius: 1,
          transition: 'width 0.4s ease',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          border: '1px solid',
          borderColor: isUserVote
            ? 'rgba(229,9,20,0.3)'
            : 'rgba(255,255,255,0.06)',
          borderRadius: 1,
        }}
      >
        {isUserVote && (
          <CheckCircleIcon
            sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }}
          />
        )}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontWeight: isUserVote ? 600 : 400,
            color: isUserVote ? 'text.primary' : 'text.secondary',
          }}
        >
          {option.option_text}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: isUserVote ? 'primary.main' : 'text.secondary',
            flexShrink: 0,
          }}
        >
          {pct.toFixed(0)}%
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ pl: 1.5, display: 'block', mt: 0.25, mb: 0.25 }}
      >
        {option.vote_count} {option.vote_count === 1 ? 'vote' : 'votes'}
      </Typography>
    </Box>
  )
}

interface VotingOptionProps {
  option: PollOption
  onVote: (optionId: string) => void
  disabled: boolean
}

function VotingOption({ option, onVote, disabled }: VotingOptionProps) {
  return (
    <ButtonBase
      onClick={() => onVote(option.id)}
      disabled={disabled}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        px: 1.5,
        py: 1,
        mb: 0.75,
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
        textAlign: 'left',
        transition: 'border-color 0.2s, background-color 0.2s',
        '&:hover': {
          borderColor: 'rgba(229,9,20,0.35)',
          bgcolor: 'rgba(229,9,20,0.04)',
        },
        '&.Mui-disabled': {
          opacity: 0.6,
        },
      }}
    >
      <RadioButtonUncheckedIcon
        sx={{ fontSize: 20, color: 'text.disabled', flexShrink: 0 }}
      />
      <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
        {option.option_text}
      </Typography>
    </ButtonBase>
  )
}

interface PollCardProps {
  poll: Poll
  onVote: (pollId: string, optionId: string) => void
  voting: boolean
  isAuthenticated: boolean
  authEnabled: boolean
}

export function PollCard({
  poll,
  onVote,
  voting,
  isAuthenticated,
  authEnabled,
}: PollCardProps) {
  const hasVoted = poll.user_vote !== null
  const isClosed = poll.status === 'closed'
  const showResults = isClosed || hasVoted || !isAuthenticated

  const sortedOptions = [...poll.options].sort(
    (a, b) => a.display_order - b.display_order
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        sx={{
          p: { xs: 2, md: 2.5 },
          background: 'rgba(26,26,26,0.9)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.2s',
          '&:hover': { borderColor: 'rgba(229,9,20,0.15)' },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            mb: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ flex: 1, minWidth: 0 }}
          >
            {poll.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
            {hasVoted && !isClosed && (
              <Chip
                label="Voted"
                size="small"
                sx={{
                  bgcolor: 'rgba(76,175,80,0.1)',
                  color: '#81c784',
                  fontSize: '0.7rem',
                  height: 22,
                }}
              />
            )}
            {getStatusChip(poll)}
          </Box>
        </Box>

        {/* Description */}
        {poll.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {poll.description}
          </Typography>
        )}

        {/* Options / Results */}
        <Box sx={{ mb: 1 }}>
          {showResults ? (
            <>
              {sortedOptions.map((option) => (
                <ResultBar
                  key={option.id}
                  option={option}
                  totalVotes={poll.total_votes}
                  isUserVote={poll.user_vote === option.id}
                />
              ))}
            </>
          ) : (
            sortedOptions.map((option) => (
              <VotingOption
                key={option.id}
                option={option}
                onVote={(optionId) => onVote(poll.id, optionId)}
                disabled={voting}
              />
            ))
          )}
        </Box>

        {/* Sign in banner for unauthenticated users */}
        {authEnabled && !isAuthenticated && !isClosed && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              mb: 1,
              borderRadius: 1,
              bgcolor: 'rgba(229,9,20,0.06)',
              border: '1px solid rgba(229,9,20,0.15)',
            }}
          >
            <HowToVoteIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              <Link
                href="/auth/login?returnTo=/polls"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign in
              </Link>
              {' to vote on this poll'}
            </Typography>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
          <Typography variant="caption" color="text.disabled">
            {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {timeAgo(poll.created_at)}
          </Typography>
          {poll.author_name && (
            <Typography variant="caption" color="text.disabled">
              by {poll.author_name}
            </Typography>
          )}
        </Box>
      </Card>
    </motion.div>
  )
}
