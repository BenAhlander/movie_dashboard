'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, Snackbar, Alert } from '@mui/material'
import { useReducedMotion, AnimatePresence, motion } from 'framer-motion'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useSwipe } from '@/hooks/useSwipe'
import { useHeadToHead } from '@/hooks/useHeadToHead'
import { AuthGate } from './AuthGate'
import { MatchupSkeleton } from './MatchupSkeleton'
import { SessionHeader } from './SessionHeader'
import { H2HCardStack } from './H2HCardStack'
import { ActionFooter } from './ActionFooter'
import { EmptyState } from './EmptyState'
import { H2HLeaderboard } from './H2HLeaderboard'

interface HeadToHeadViewProps {
  authEnabled: boolean
}

export function HeadToHeadView({ authEnabled }: HeadToHeadViewProps) {
  const { user } = useUser()
  const isAuthenticated = !!user
  const reducedMotion = useReducedMotion()

  const {
    phase,
    currentMatchup,
    nextMatchup,
    stats,
    error,
    prepareVote,
    advanceAndSubmit,
    skip,
    showLeaderboard,
    backToPlaying,
    clearError,
  } = useHeadToHead()

  const [isLocked, setIsLocked] = useState(false)
  const [flashColor, setFlashColor] = useState<string | null>(null)

  // Lock page-level scroll while the game is mounted
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = ''
      body.style.overflow = ''
    }
  }, [])

  const handleCommit = useCallback(
    (answer: boolean): boolean => {
      if (isLocked || !currentMatchup) return false
      setIsLocked(true)

      // LEFT swipe = vote for film A, RIGHT swipe = vote for film B
      const winnerId = answer
        ? currentMatchup.filmB.id
        : currentMatchup.filmA.id

      // Store the vote intent synchronously so advanceAndSubmit can
      // fire the API call after the card exits. This avoids any async
      // gap between the animation completing and the state advancing.
      prepareVote(winnerId)

      // Flash feedback
      if (!reducedMotion) {
        setFlashColor('rgba(34, 197, 94, 0.25)')
        setTimeout(() => setFlashColor(null), 300)
      }

      // Return true always since there is no "correct" answer in H2H
      return true
    },
    [isLocked, currentMatchup, reducedMotion, prepareVote]
  )

  const handleAnimationComplete = useCallback(() => {
    // Advance state synchronously — promotes nextMatchup to current
    // immediately, then fires the vote API call in the background.
    advanceAndSubmit()
    setIsLocked(false)
  }, [advanceAndSubmit])

  const {
    x,
    rotate,
    commitSwipe,
    handleDragEnd,
  } = useSwipe({
    onCommit: handleCommit,
    onAnimationComplete: handleAnimationComplete,
    isLocked,
  })

  // Keyboard controls
  useEffect(() => {
    if (phase !== 'playing') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return

      const key = e.key.toLowerCase()
      if (key === 'arrowright') {
        e.preventDefault()
        commitSwipe('right')
      } else if (key === 'arrowleft') {
        e.preventDefault()
        commitSwipe('left')
      } else if (key === ' ') {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, isLocked, commitSwipe])

  const handleVoteViaButton = useCallback(
    (winnerId: string) => {
      if (!currentMatchup) return

      // Determine swipe direction based on which film was picked
      if (winnerId === currentMatchup.filmA.id) {
        commitSwipe('left')
      } else {
        commitSwipe('right')
      }
    },
    [currentMatchup, commitSwipe]
  )

  // Auth gate for unauthenticated users when auth is enabled
  if (authEnabled && !isAuthenticated) {
    return (
      <Box
        id="h2h-game"
        data-phase="auth"
        sx={{
          width: '100%',
          height: {
            xs: 'calc(100dvh - 56px)',
            sm: 'calc(100dvh - 64px)',
          },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <AuthGate />
      </Box>
    )
  }

  return (
    <Box
      id="h2h-game"
      data-phase={phase}
      sx={{
        width: '100%',
        height: {
          xs: 'calc(100dvh - 56px)',
          sm: 'calc(100dvh - 64px)',
        },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Loading */}
      {phase === 'loading' && (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <MatchupSkeleton />
        </Box>
      )}

      {/* Playing */}
      {phase === 'playing' && currentMatchup && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <SessionHeader
            stats={stats}
            onShowLeaderboard={showLeaderboard}
          />

          <Box
            id="h2h-card-stack-container"
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 1,
            }}
          >
            <H2HCardStack
              currentMatchup={currentMatchup}
              nextMatchup={nextMatchup}
              x={x}
              rotate={rotate}
              onDragEnd={handleDragEnd}
              isLocked={isLocked}
            />
          </Box>

          <ActionFooter
            matchup={currentMatchup}
            onVote={handleVoteViaButton}
            onSkip={skip}
            isLocked={isLocked}
          />
        </Box>
      )}

      {/* Empty */}
      {phase === 'empty' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <EmptyState
            votesThisSession={stats.votesThisSession}
            onShowLeaderboard={showLeaderboard}
          />
        </Box>
      )}

      {/* Leaderboard */}
      {phase === 'leaderboard' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <H2HLeaderboard onBack={backToPlaying} />
        </Box>
      )}

      {/* Flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: flashColor,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Error snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          onClose={clearError}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Screen reader announcements */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
        }}
      >
        {phase === 'playing' &&
          currentMatchup &&
          `Matchup: ${currentMatchup.filmA.title} versus ${currentMatchup.filmB.title}. ${stats.votesThisSession} votes this session.`}
        {phase === 'empty' && 'No more matchups available.'}
      </Box>
    </Box>
  )
}
