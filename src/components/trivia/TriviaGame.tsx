'use client'

import { useEffect } from 'react'
import { Box } from '@mui/material'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useGame } from '@/hooks/useGame'
import { GameBoard } from './GameBoard'
import { ResultsScreen } from './ResultsScreen'
import { LeaderboardScreen } from './LeaderboardScreen'

interface TriviaGameProps {
  authEnabled: boolean
}

/**
 * Top-level trivia state machine component.
 * Manages transitions between playing, results, and leaderboard phases.
 */
export function TriviaGame({ authEnabled }: TriviaGameProps) {
  const { user } = useUser()
  const isAuthenticated = !!user
  const currentUserId = user?.sub ?? undefined

  const {
    state,
    currentQuestion,
    nextQuestion,
    answer,
    startNewGame,
    keepPlaying,
    setPhase,
    backToResults,
    lastSubmitResult,
  } = useGame(isAuthenticated)

  // Lock page-level scroll while the trivia game is mounted
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

  return (
    <Box
      id="trivia-game"
      data-phase={state.phase}
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
      {state.phase === 'playing' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <GameBoard
            currentQuestion={currentQuestion}
            nextQuestion={nextQuestion}
            currentIndex={state.currentIndex}
            score={state.score}
            totalQuestions={state.totalQuestions}
            onAnswer={answer}
          />
        </Box>
      )}

      {state.phase === 'results' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <ResultsScreen
            score={state.score}
            totalQuestions={state.totalQuestions}
            roundScore={state.roundScore}
            totalAnswered={state.totalAnswered}
            roundNumber={state.roundNumber}
            onKeepPlaying={keepPlaying}
            onNewGame={startNewGame}
            onViewLeaderboard={() => setPhase('leaderboard')}
            isAuthenticated={isAuthenticated}
            authEnabled={authEnabled}
            submitResult={lastSubmitResult.current}
          />
        </Box>
      )}

      {state.phase === 'leaderboard' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <LeaderboardScreen
            userScore={state.score}
            userTotal={state.totalAnswered}
            onPlayAgain={keepPlaying}
            onBack={backToResults}
            isAuthenticated={isAuthenticated}
            currentUserId={currentUserId}
            authEnabled={authEnabled}
          />
        </Box>
      )}
    </Box>
  )
}
