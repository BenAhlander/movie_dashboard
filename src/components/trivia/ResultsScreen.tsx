'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Box, Typography, Paper, Divider, Button } from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import CheckIcon from '@mui/icons-material/Check'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import {
  motion,
  useMotionValue,
  useTransform,
  animate as fmAnimate,
} from 'framer-motion'
import { getScoreMessage, getScoreColor, getGhostRank } from '@/lib/trivia/gameApi'
import { getLocalStats } from '@/hooks/useGame'
import type { SubmitRunResponse } from '@/types/trivia'

interface ResultsScreenProps {
  score: number
  totalQuestions: number
  roundScore: number
  totalAnswered: number
  roundNumber: number
  onKeepPlaying: () => void
  onNewGame: () => void
  onViewLeaderboard: () => void
  isAuthenticated: boolean
  authEnabled: boolean
  submitResult: SubmitRunResponse
}

export function ResultsScreen({
  score,
  totalQuestions,
  roundScore,
  totalAnswered,
  roundNumber,
  onKeepPlaying,
  onNewGame,
  onViewLeaderboard,
  isAuthenticated,
  authEnabled,
  submitResult,
}: ResultsScreenProps) {
  const headingRef = useRef<HTMLDivElement>(null)
  const [shareLabel, setShareLabel] = useState<'share' | 'copied'>('share')

  const animatedScore = useMotionValue(0)
  const displayScore = useTransform(animatedScore, (v) => Math.round(v))

  const localStats = useMemo(() => getLocalStats(), [])

  useEffect(() => {
    const controls = fmAnimate(animatedScore, roundScore, {
      duration: 0.6,
      ease: 'linear',
    })

    return () => {
      controls.stop()
    }
  }, [roundScore, animatedScore])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const percentage = Math.round((roundScore / totalQuestions) * 100)
  const message = getScoreMessage(roundScore)
  const scoreColor = getScoreColor(roundScore, totalQuestions)

  const handleShare = useCallback(async () => {
    const text = [
      'FreshTomatoes Trivia',
      `Round ${roundNumber}: ${roundScore}/${totalQuestions} (${percentage}%)`,
      roundNumber > 1 ? `Total: ${score}/${totalAnswered}` : null,
      '',
      'Think you can beat me? Play now!',
    ]
      .filter(Boolean)
      .join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setShareLabel('copied')
      setTimeout(() => setShareLabel('share'), 2000)
    } catch {
      // Clipboard not available
    }
  }, [
    roundNumber,
    roundScore,
    totalQuestions,
    percentage,
    score,
    totalAnswered,
  ])

  const showSignInNudge = authEnabled && !isAuthenticated
  const [ghostRank, setGhostRank] = useState<number | null>(null)

  useEffect(() => {
    if (!showSignInNudge || roundScore === 0) return
    getGhostRank(roundScore, totalQuestions).then((data) => {
      setGhostRank(data.rank)
    })
  }, [showSignInNudge, roundScore, totalQuestions])

  return (
    <Box
      id="results-screen"
      data-round={roundNumber}
      data-score={roundScore}
      data-total={totalQuestions}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
        mx: 'auto',
        px: 2,
      }}
    >
      <Typography
        id="results-round-label"
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', mt: 4 }}
      >
        Round {roundNumber} Complete
      </Typography>

      {/* Score card */}
      <Paper
        id="results-score-card"
        ref={headingRef}
        tabIndex={-1}
        role="region"
        aria-label={`Round ${roundNumber} complete. You scored ${roundScore} out of ${totalQuestions}.`}
        sx={{
          borderRadius: '20px',
          p: 4,
          textAlign: 'center',
          maxWidth: 320,
          width: '100%',
          mt: 2,
          '&:focus': { outline: 'none' },
        }}
      >
        <Typography variant="caption" color="text.secondary">
          You scored
        </Typography>

        <Typography
          variant="h1"
          component="div"
          sx={{
            fontSize: 80,
            fontWeight: 800,
            color: 'text.primary',
            lineHeight: 1,
            mt: 1,
          }}
        >
          <motion.span id="results-score-value">{displayScore}</motion.span>
        </Typography>

        <Divider sx={{ width: 60, mx: 'auto', my: 1.5 }} />

        <Typography
          id="results-total-questions"
          variant="h4"
          fontWeight={400}
          color="text.secondary"
        >
          / {totalQuestions}
        </Typography>

        <Typography
          id="results-percentage"
          variant="h3"
          fontWeight={700}
          sx={{ color: scoreColor, mt: 2 }}
        >
          {percentage}%
        </Typography>

        <Typography
          id="results-message"
          variant="body1"
          sx={{
            fontStyle: 'italic',
            color: 'text.secondary',
            mt: 1,
          }}
        >
          {message}
        </Typography>
      </Paper>

      {/* Score saved indicator for authenticated users */}
      {isAuthenticated && submitResult.saved && submitResult.rank && (
        <Typography
          id="results-saved-indicator"
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1.5 }}
        >
          Score saved — you&apos;re ranked #{submitResult.rank} today
        </Typography>
      )}

      {/* Cumulative score (shown after first round) */}
      {roundNumber > 1 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1,
            mt: 2,
            px: 2.5,
            py: 1,
            borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total score:
          </Typography>
          <Typography variant="body2" fontWeight={700} color="text.primary">
            {score} / {totalAnswered}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            ({Math.round((score / totalAnswered) * 100)}%)
          </Typography>
        </Box>
      )}

      {/* Local stats */}
      {localStats.todayBest !== null && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 3,
            mt: 1.5,
          }}
        >
          <Typography variant="caption" color="text.disabled">
            Today&apos;s best: {localStats.todayBest}
          </Typography>
          {localStats.streak > 0 && (
            <Typography variant="caption" color="text.disabled">
              Streak: {localStats.streak}d
            </Typography>
          )}
        </Box>
      )}

      {/* Anonymous sign-in nudge with ghost rank */}
      {showSignInNudge && (
        <Box
          id="results-signin-nudge"
          sx={{
            mt: 2.5,
            width: '100%',
            maxWidth: 320,
            backgroundColor: 'rgba(229,9,20,0.06)',
            border: '1px solid rgba(229,9,20,0.2)',
            borderRadius: '12px',
            p: 2.5,
          }}
        >
          {ghostRank !== null && roundScore > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1.5,
              }}
            >
              <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600}>
                You&apos;d be ranked #{ghostRank} today!
              </Typography>
            </Box>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Sign in to save your score and claim your spot on the leaderboard.
          </Typography>

          <Button
            id="btn-results-signin"
            variant="contained"
            color="primary"
            fullWidth
            href="/auth/login?returnTo=/trivia"
            sx={{
              height: 44,
              borderRadius: '10px',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Sign in with Google
          </Button>
        </Box>
      )}

      {/* CTA buttons */}
      <Box sx={{ width: '100%', maxWidth: 320, mt: 3, mb: 4 }}>
        <Button
          id="btn-keep-playing"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={onKeepPlaying}
          sx={{ height: 52, borderRadius: '12px', fontWeight: 700, mb: 1.5 }}
        >
          Keep Playing
        </Button>

        <Button
          id="btn-share-results"
          variant="outlined"
          color="inherit"
          size="large"
          fullWidth
          onClick={handleShare}
          startIcon={shareLabel === 'copied' ? <CheckIcon /> : <ShareIcon />}
          sx={{
            height: 52,
            borderRadius: '12px',
            fontWeight: 700,
            mb: 1.5,
            borderColor: 'rgba(255,255,255,0.12)',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.24)',
            },
          }}
        >
          {shareLabel === 'copied' ? 'Copied!' : 'Share Results & Invite Friends'}
        </Button>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            id="btn-new-game"
            variant="text"
            color="inherit"
            size="large"
            fullWidth
            onClick={onNewGame}
            sx={{
              height: 44,
              borderRadius: '12px',
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            New Game
          </Button>

          <Button
            id="btn-view-leaderboard"
            variant="text"
            color="inherit"
            size="large"
            fullWidth
            onClick={onViewLeaderboard}
            sx={{
              height: 44,
              borderRadius: '12px',
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            Leaderboard
          </Button>
        </Box>
      </Box>

      {/* Screen reader announcement */}
      <Box
        aria-live="assertive"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
        }}
      >
        Round {roundNumber} complete. You scored {roundScore} out of{' '}
        {totalQuestions}.
      </Box>
    </Box>
  )
}
