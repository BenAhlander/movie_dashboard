'use client'

import { Box, Typography } from '@mui/material'
import { motion, type MotionValue, useTransform } from 'framer-motion'
import type { H2HMatchup } from '@/types/h2h'
import { FilmPanel } from './FilmPanel'

interface MatchupCardProps {
  matchup: H2HMatchup
  x: MotionValue<number>
  rotate: MotionValue<number>
  isActive: boolean
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => void
  isLocked: boolean
}

export function MatchupCard({
  matchup,
  x,
  rotate,
  isActive,
  onDragEnd,
  isLocked,
}: MatchupCardProps) {
  // VS badge shift — slight movement toward the winning side
  const vsBadgeX = useTransform(x, [-160, 0, 160], [-8, 0, 8])

  // Determine which side is highlighted based on x position
  // We use raw transform values for the green overlay
  const leftOverlayBg = useTransform(
    x,
    [0, -160],
    ['rgba(34, 197, 94, 0.0)', 'rgba(34, 197, 94, 0.2)']
  )
  const rightOverlayBg = useTransform(
    x,
    [0, 160],
    ['rgba(34, 197, 94, 0.0)', 'rgba(34, 197, 94, 0.2)']
  )

  // Film title overlay labels (appear during drag)
  const leftLabelOpacity = useTransform(x, [0, -80, -160], [0, 0.5, 1.0])
  const rightLabelOpacity = useTransform(x, [0, 80, 160], [0, 0.5, 1.0])

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
      id={isActive ? 'h2h-active-card' : 'h2h-next-card'}
      data-matchup-id={matchup.id}
      role="region"
      aria-label={`Matchup: ${matchup.filmA.title} versus ${matchup.filmB.title}`}
    >
      <Box
        sx={{
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left film panel with green overlay */}
        <Box sx={{ flex: 1, position: 'relative', display: 'flex' }}>
          <FilmPanel
            film={matchup.filmA}
            side="left"
            isHighlighted={false}
          />
          {isActive && (
            <>
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: leftOverlayBg,
                  pointerEvents: 'none',
                  zIndex: 2,
                  borderRadius: '16px 0 0 16px',
                }}
              />
              {/* Film A title label during left drag */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  opacity: leftLabelOpacity,
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: 'rgba(34, 197, 94, 0.9)',
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#000',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    PICK
                  </Typography>
                </Box>
              </motion.div>
            </>
          )}
        </Box>

        {/* VS badge in center */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 4,
          }}
        >
          {isActive ? (
            <motion.div style={{ x: vsBadgeX }}>
              <Box
                id="h2h-vs-badge"
                sx={{
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                  borderRadius: '50%',
                  backgroundColor: '#e50914',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(229, 9, 20, 0.4)',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 14, sm: 16 },
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '0.05em',
                  }}
                >
                  VS
                </Typography>
              </Box>
            </motion.div>
          ) : (
            <Box
              sx={{
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                borderRadius: '50%',
                backgroundColor: '#e50914',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(229, 9, 20, 0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 14, sm: 16 },
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '0.05em',
                }}
              >
                VS
              </Typography>
            </Box>
          )}
        </Box>

        {/* Center divider */}
        <Box
          sx={{
            width: '1px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignSelf: 'stretch',
          }}
        />

        {/* Right film panel with green overlay */}
        <Box sx={{ flex: 1, position: 'relative', display: 'flex' }}>
          <FilmPanel
            film={matchup.filmB}
            side="right"
            isHighlighted={false}
          />
          {isActive && (
            <>
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: rightOverlayBg,
                  pointerEvents: 'none',
                  zIndex: 2,
                  borderRadius: '0 16px 16px 0',
                }}
              />
              {/* Film B title label during right drag */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  opacity: rightLabelOpacity,
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: 'rgba(34, 197, 94, 0.9)',
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#000',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    PICK
                  </Typography>
                </Box>
              </motion.div>
            </>
          )}
        </Box>
      </Box>
    </motion.div>
  )
}
