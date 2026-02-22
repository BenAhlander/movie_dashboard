'use client'

import { Box } from '@mui/material'
import { type MotionValue } from 'framer-motion'
import type { TriviaQuestion } from '@/types/trivia'
import { SwipeCard } from './SwipeCard'

interface CardStackProps {
  currentQuestion: TriviaQuestion | null
  nextQuestion: TriviaQuestion | null
  x: MotionValue<number>
  rotate: MotionValue<number>
  yesOpacity: MotionValue<number>
  noOpacity: MotionValue<number>
  overlayBgRight: MotionValue<string>
  overlayBgLeft: MotionValue<string>
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => void
  isLocked: boolean
  showHint: boolean
}

export function CardStack({
  currentQuestion,
  nextQuestion,
  x,
  rotate,
  yesOpacity,
  noOpacity,
  overlayBgRight,
  overlayBgLeft,
  onDragEnd,
  isLocked,
  showHint,
}: CardStackProps) {
  return (
    <Box
      id="card-stack"
      sx={{
        position: 'relative',
        width: {
          xs: '100%',
          sm: 420,
          md: 440,
        },
        maxWidth: { xs: 340, sm: 420, md: 440 },
        height: { xs: 440, sm: 480, md: 500 },
        mx: 'auto',
        touchAction: 'pan-y',
        overflow: 'hidden',
      }}
    >
      {/* Next card (underneath) */}
      {nextQuestion && (
        <SwipeCard
          key={`next-${nextQuestion.id}`}
          question={nextQuestion}
          x={x}
          rotate={rotate}
          yesOpacity={yesOpacity}
          noOpacity={noOpacity}
          overlayBgRight={overlayBgRight}
          overlayBgLeft={overlayBgLeft}
          isActive={false}
          showHint={false}
          onDragEnd={onDragEnd}
          isLocked={true}
        />
      )}

      {/* Active card (on top) */}
      {currentQuestion && (
        <SwipeCard
          key={`active-${currentQuestion.id}`}
          question={currentQuestion}
          x={x}
          rotate={rotate}
          yesOpacity={yesOpacity}
          noOpacity={noOpacity}
          overlayBgRight={overlayBgRight}
          overlayBgLeft={overlayBgLeft}
          isActive={true}
          showHint={showHint}
          onDragEnd={onDragEnd}
          isLocked={isLocked}
        />
      )}
    </Box>
  )
}
