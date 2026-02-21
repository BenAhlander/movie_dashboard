'use client'

import { Box } from '@mui/material'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useGame } from '@/hooks/useGame'
import { GameBoard } from './GameBoard'
import { ResultsScreen } from './ResultsScreen'
import { LeaderboardScreen } from './LeaderboardScreen'

/**
 * Top-level trivia state machine component.
 * Manages transitions between playing, results, and leaderboard phases.
 */
export function TriviaGame() {
  const {
    state,
    currentQuestion,
    nextQuestion,
    answer,
    startNewGame,
    keepPlaying,
    setPhase,
    backToResults,
  } = useGame()

  console.log({state,
    currentQuestion,
    nextQuestion,
    answer,
    startNewGame,
    keepPlaying,
    setPhase,
    backToResults})

  const reducedMotion = useReducedMotion()

  return (
    <Box
      id="trivia-game"
      data-phase={state.phase}
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        pt: 1,
      }}
    >
      <AnimatePresence>
        {state.phase === 'playing' && (
          <motion.div
            key={`playing-${state.roundNumber}`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { duration: 0.35, ease: 'easeOut' }
            }
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <GameBoard
              currentQuestion={currentQuestion}
              nextQuestion={nextQuestion}
              currentIndex={state.currentIndex}
              score={state.score}
              totalQuestions={state.totalQuestions}
              onAnswer={answer}
            />
          </motion.div>
        )}

        {state.phase === 'results' && (
          <motion.div
            key="results"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -32 }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 320, damping: 28 }
            }
            style={{ flex: 1 }}
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
            />
          </motion.div>
        )}

        {state.phase === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 32 }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { duration: 0.26, ease: 'easeOut' }
            }
            style={{ flex: 1 }}
          >
            <LeaderboardScreen
              userScore={state.score}
              userTotal={state.totalAnswered}
              onPlayAgain={keepPlaying}
              onBack={backToResults}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}
