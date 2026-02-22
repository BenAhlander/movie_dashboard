'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Typography, LinearProgress, Button } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { TriviaQuestion } from '@/types/trivia'
import { useSwipe } from '@/hooks/useSwipe'
import { CardStack } from './CardStack'

/** Duration of the correct/incorrect flash overlay in ms */
const FLASH_DURATION = 300

interface GameBoardProps {
  currentQuestion: TriviaQuestion | null
  nextQuestion: TriviaQuestion | null
  currentIndex: number
  score: number
  totalQuestions: number
  onAnswer: (answer: boolean) => boolean
}

export function GameBoard({
  currentQuestion,
  nextQuestion,
  currentIndex,
  score,
  totalQuestions,
  onAnswer,
}: GameBoardProps) {
  const [isLocked, setIsLocked] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [flashColor, setFlashColor] = useState<string | null>(null)
  const [scoreAnim, setScoreAnim] = useState(false)
  const [showPlusOne, setShowPlusOne] = useState(false)
  const noButtonRef = useRef<HTMLButtonElement>(null)
  const pendingAnswerRef = useRef<boolean | null>(null)
  const reducedMotion = useReducedMotion()

  // Aria live announcement — derived from score/index, no state needed
  const announcement =
    currentIndex > 0
      ? `Score: ${score} of ${totalQuestions} correct`
      : ''

  const handleCommit = useCallback(
    (answer: boolean): boolean => {
      if (isLocked || !currentQuestion) return false
      setIsLocked(true)
      setShowHint(false)

      // Calculate correct/incorrect locally for immediate visual feedback,
      // but defer the state dispatch until after the exit animation completes.
      // This prevents the peek card underneath from changing mid-animation.
      const correct = answer === currentQuestion.answer
      pendingAnswerRef.current = answer

      // Flash feedback
      if (!reducedMotion) {
        const color = correct
          ? 'rgba(34, 197, 94, 0.35)'
          : 'rgba(229, 9, 20, 0.35)'
        setFlashColor(color)
        setTimeout(() => setFlashColor(null), FLASH_DURATION)
      }

      // Score animation on correct
      if (correct) {
        setScoreAnim(true)
        setShowPlusOne(true)
        setTimeout(() => setScoreAnim(false), 400)
        setTimeout(() => setShowPlusOne(false), 600)
      }

      return correct
    },
    [isLocked, currentQuestion, reducedMotion],
  )

  const handleAnimationComplete = useCallback(() => {
    // Now that the exit animation is done, commit the answer to advance state
    if (pendingAnswerRef.current !== null) {
      onAnswer(pendingAnswerRef.current)
      pendingAnswerRef.current = null
    }
    setIsLocked(false)
  }, [onAnswer])

  const {
    x,
    rotate,
    yesOpacity,
    noOpacity,
    overlayBgRight,
    overlayBgLeft,
    commitSwipe,
    handleDragEnd,
  } = useSwipe({
    onCommit: handleCommit,
    onAnimationComplete: handleAnimationComplete,
    isLocked,
  })

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return

      const key = e.key.toLowerCase()
      if (key === 'arrowright' || key === 'y') {
        e.preventDefault()
        commitSwipe('right')
      } else if (key === 'arrowleft' || key === 'n') {
        e.preventDefault()
        commitSwipe('left')
      } else if (key === ' ') {
        e.preventDefault() // Prevent scroll
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLocked, commitSwipe])

  // Focus the NO button when game starts for keyboard accessibility
  useEffect(() => {
    if (currentIndex === 0 && noButtonRef.current) {
      noButtonRef.current.focus()
    }
  }, [currentIndex])

  const progressValue = (currentIndex / totalQuestions) * 100

  return (
    <Box
      id="game-board"
      data-question-index={currentIndex}
      data-score={score}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: 480,
        mx: 'auto',
      }}
    >
      {/* Score and progress row */}
      <Box
        sx={{
          width: '100%',
          px: 2,
          pt: 2,
          pb: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography id="score-label" variant="body1" fontWeight={700} color="text.primary">
              Score:
            </Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <motion.span
                animate={
                  scoreAnim && !reducedMotion
                    ? { scale: [1, 1.3, 1] }
                    : { scale: 1 }
                }
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Typography
                  id="score-value"
                  component="span"
                  variant="body1"
                  fontWeight={700}
                  color="text.primary"
                >
                  {score}
                </Typography>
              </motion.span>

              {/* Floating +1 */}
              <AnimatePresence>
                {showPlusOne && !reducedMotion && (
                  <motion.span
                    key="plus-one"
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -20 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{
                      position: 'absolute',
                      left: '100%',
                      top: -4,
                      marginLeft: 4,
                      color: '#22c55e',
                      fontWeight: 700,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +1
                  </motion.span>
                )}
              </AnimatePresence>
            </Box>
          </Box>

          <Typography id="question-counter" variant="body2" color="text.secondary">
            Question {Math.min(currentIndex + 1, totalQuestions)} of{' '}
            {totalQuestions}
          </Typography>
        </Box>

        <LinearProgress
          id="question-progress"
          variant="determinate"
          value={progressValue}
          aria-label={`Quiz progress, question ${currentIndex + 1} of ${totalQuestions}`}
          aria-valuenow={currentIndex}
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#e50914',
              borderRadius: 3,
            },
          }}
        />
      </Box>

      {/* Card stack */}
      <Box id="card-stack-container" sx={{ mt: 1.5, width: '100%' }}>
        <CardStack
          currentQuestion={currentQuestion}
          nextQuestion={nextQuestion}
          x={x}
          rotate={rotate}
          yesOpacity={yesOpacity}
          noOpacity={noOpacity}
          overlayBgRight={overlayBgRight}
          overlayBgLeft={overlayBgLeft}
          onDragEnd={handleDragEnd}
          isLocked={isLocked}
          showHint={showHint}
        />
      </Box>

      {/* YES / NO buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'center',
          mt: 3,
          pointerEvents: isLocked ? 'none' : 'auto',
        }}
      >
        <motion.div whileTap={reducedMotion ? undefined : { scale: 0.96 }}>
          <Button
            id="btn-answer-no"
            ref={noButtonRef}
            variant="outlined"
            size="large"
            startIcon={<CloseIcon />}
            onClick={() => commitSwipe('left')}
            disabled={isLocked}
            aria-label="Answer No - swipe left or click"
            sx={{
              width: { xs: 140, sm: 160 },
              height: 52,
              borderColor: 'rgba(229, 9, 20, 0.5)',
              color: '#e50914',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              '&:hover': {
                backgroundColor: 'rgba(229, 9, 20, 0.08)',
                borderColor: '#e50914',
              },
            }}
          >
            NO
          </Button>
        </motion.div>

        <motion.div whileTap={reducedMotion ? undefined : { scale: 0.96 }}>
          <Button
            id="btn-answer-yes"
            variant="contained"
            size="large"
            startIcon={<CheckIcon />}
            onClick={() => commitSwipe('right')}
            disabled={isLocked}
            aria-label="Answer Yes - swipe right or click"
            sx={{
              width: { xs: 140, sm: 160 },
              height: 52,
              backgroundColor: '#22c55e',
              color: '#000000',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.25)',
              '&:hover': {
                backgroundColor: '#16a34a',
              },
            }}
          >
            YES
          </Button>
        </motion.div>
      </Box>

      {/* Keyboard hint — only shown on pointer:fine devices */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{
          mt: 1.5,
          textAlign: 'center',
          '@media (pointer: coarse)': {
            display: 'none',
          },
        }}
      >
        {'\u2190'} Arrow key = NO {'  '} Arrow key = YES {'\u2192'}
      </Typography>

      {/* Full-screen flash overlay */}
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
        {announcement}
      </Box>
    </Box>
  )
}
