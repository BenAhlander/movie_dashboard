'use client'

import { Box, Typography, Divider } from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { motion, type MotionValue } from 'framer-motion'
import type { TriviaQuestion } from '@/types/trivia'

interface SwipeCardProps {
  question: TriviaQuestion
  x: MotionValue<number>
  rotate: MotionValue<number>
  yesOpacity: MotionValue<number>
  noOpacity: MotionValue<number>
  overlayBgRight: MotionValue<string>
  overlayBgLeft: MotionValue<string>
  isActive: boolean
  showHint: boolean
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => void
  isLocked: boolean
}

export function SwipeCard({
  question,
  x,
  rotate,
  yesOpacity,
  noOpacity,
  overlayBgRight,
  overlayBgLeft,
  isActive,
  showHint,
  onDragEnd,
  isLocked,
}: SwipeCardProps) {
  const mediaLabel = question.mediaType === 'tv' ? 'TV Series' : 'Movie'

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: isActive ? 1 : 0,
        x: isActive ? x : 0,
        rotate: isActive ? rotate : 0,
        scale: isActive ? 1 : 0.95,
        y: isActive ? 0 : 10,
        opacity: isActive ? 1 : 0.7,
        cursor: isActive ? 'grab' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
      }}
      drag={isActive && !isLocked ? 'x' : false}
      dragConstraints={{ left: -400, right: 400, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={isActive ? onDragEnd : undefined}
      whileDrag={{ cursor: 'grabbing' }}
      id={isActive ? 'active-card' : 'next-card'}
      data-question-id={question.id}
      data-difficulty={question.difficulty}
      role="region"
      aria-label={`Trivia question about ${question.title}`}
    >
      <Box
        sx={{
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          WebkitUserDrag: 'none',
        }}
      >
        {/* YES / NO overlay labels */}
        {isActive && (
          <>
            <motion.div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                opacity: yesOpacity,
                zIndex: 3,
                transform: 'rotate(-12deg)',
              }}
            >
              <Box
                sx={{
                  border: '2px solid #22c55e',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <CheckIcon sx={{ color: '#22c55e', fontSize: 24 }} />
                <Typography
                  sx={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#22c55e',
                    lineHeight: 1,
                  }}
                >
                  YES
                </Typography>
              </Box>
            </motion.div>

            <motion.div
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                opacity: noOpacity,
                zIndex: 3,
                transform: 'rotate(12deg)',
              }}
            >
              <Box
                sx={{
                  border: '2px solid #e50914',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <CloseIcon sx={{ color: '#e50914', fontSize: 24 }} />
                <Typography
                  sx={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#e50914',
                    lineHeight: 1,
                  }}
                >
                  NO
                </Typography>
              </Box>
            </motion.div>

            {/* Color overlay driven by motion values */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                pointerEvents: 'none',
                zIndex: 2,
                backgroundColor: overlayBgRight,
              }}
            />
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                pointerEvents: 'none',
                zIndex: 2,
                backgroundColor: overlayBgLeft,
              }}
            />
          </>
        )}

        {/* Poster placeholder + title */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 80,
              height: 120,
              flexShrink: 0,
              backgroundColor: 'rgba(26,26,26,0.6)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MovieIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography
              id={isActive ? 'card-title' : undefined}
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3,
              }}
            >
              {question.title}
            </Typography>
            <Typography id={isActive ? 'card-meta' : undefined} variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {question.year} {'\u00B7'} {mediaLabel}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />

        {/* Statement — the primary content */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Typography
            id={isActive ? 'card-statement' : undefined}
            variant="body1"
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.1rem' },
              lineHeight: 1.6,
              color: 'text.primary',
              textAlign: 'center',
              width: '100%',
              fontWeight: 400,
            }}
          >
            &ldquo;{question.statement}&rdquo;
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mt: 2, mb: 1.5 }} />

        {/* Swipe hint */}
        {showHint && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              textAlign: 'center',
              transition: 'opacity 0.3s',
            }}
          >
            {'\u2190'} Swipe left for NO {'  '} Swipe right for YES {'\u2192'}
          </Typography>
        )}
      </Box>
    </motion.div>
  )
}
