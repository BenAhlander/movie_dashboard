'use client'

import { useCallback } from 'react'
import {
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from 'framer-motion'

/** Threshold in pixels to commit a swipe */
const COMMIT_DISTANCE = 80

/** Velocity threshold in px/s for fast flick commit */
const VELOCITY_THRESHOLD = 500

/** Dead zone in pixels before card starts tracking */
const DEAD_ZONE = 10

/** Exit distance — how far offscreen the card travels */
const EXIT_DISTANCE = 600

/** Exit animation duration in seconds */
const EXIT_DURATION = 0.28

/** Post-commit pause in milliseconds */
const POST_COMMIT_PAUSE = 300

export interface UseSwipeOptions {
  /** Called when user commits an answer. Returns whether the answer was correct. */
  onCommit: (answer: boolean) => boolean
  /** Called after the commit animation and pause completes */
  onAnimationComplete: () => void
  /** Whether input is currently locked (e.g. during animation) */
  isLocked: boolean
}

export interface UseSwipeReturn {
  /** Motion value for horizontal card position */
  x: ReturnType<typeof useMotionValue<number>>
  /** Derived rotation from x position */
  rotate: ReturnType<typeof useTransform<number, number>>
  /** Derived YES label opacity */
  yesOpacity: ReturnType<typeof useTransform<number, number>>
  /** Derived NO label opacity */
  noOpacity: ReturnType<typeof useTransform<number, number>>
  /** Derived overlay background for right drag (green) */
  overlayBgRight: ReturnType<typeof useTransform<number, string>>
  /** Derived overlay background for left drag (red) */
  overlayBgLeft: ReturnType<typeof useTransform<number, string>>
  /** Programmatically commit a swipe in a direction */
  commitSwipe: (direction: 'left' | 'right') => void
  /** Framer Motion drag end handler */
  handleDragEnd: (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => void
}

export function useSwipe({
  onCommit,
  onAnimationComplete,
  isLocked,
}: UseSwipeOptions): UseSwipeReturn {
  const x = useMotionValue(0)
  const reducedMotion = useReducedMotion()

  // Derived transforms from x position
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
  const yesOpacity = useTransform(x, [0, 80, 160], [0, 0.5, 1.0])
  const noOpacity = useTransform(x, [0, -80, -160], [0, 0.5, 1.0])

  const overlayBgRight = useTransform(
    x,
    [0, 160],
    ['rgba(34, 197, 94, 0.0)', 'rgba(34, 197, 94, 0.3)'],
  )
  const overlayBgLeft = useTransform(
    x,
    [0, -160],
    ['rgba(229, 9, 20, 0.0)', 'rgba(229, 9, 20, 0.3)'],
  )

  const performCommit = useCallback(
    (direction: 'left' | 'right') => {
      if (isLocked) return

      const isYes = direction === 'right'
      const correct = onCommit(isYes)
      const exitX = direction === 'right' ? EXIT_DISTANCE : -EXIT_DISTANCE

      if (reducedMotion) {
        // Instant transition for reduced motion
        x.set(exitX)
        setTimeout(() => {
          x.set(0)
          onAnimationComplete()
        }, 50)
        return
      }

      // Animate card off screen
      animate(x, exitX, {
        type: 'tween',
        duration: EXIT_DURATION,
        ease: [0.32, 0, 0.67, 0],
      })

      // Flash feedback is handled by the component via the correct return value
      // After pause, reset and advance
      setTimeout(() => {
        x.set(0)
        onAnimationComplete()
      }, POST_COMMIT_PAUSE)

      // Return correct for flash feedback (the component reads this from onCommit)
      return correct
    },
    [isLocked, onCommit, onAnimationComplete, x, reducedMotion],
  )

  const handleDragEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { offset: { x: number }; velocity: { x: number } },
    ) => {
      if (isLocked) return

      const { offset, velocity } = info
      const absX = Math.abs(offset.x)
      const absVelocity = Math.abs(velocity.x)

      // Check velocity commit first
      if (absVelocity >= VELOCITY_THRESHOLD && absX > DEAD_ZONE) {
        const direction = velocity.x > 0 ? 'right' : 'left'
        performCommit(direction)
        return
      }

      // Check distance commit
      if (absX >= COMMIT_DISTANCE) {
        const direction = offset.x > 0 ? 'right' : 'left'
        performCommit(direction)
        return
      }

      // Snap back
      animate(x, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        restDelta: 0.01,
      })
    },
    [isLocked, performCommit, x],
  )

  const commitSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (isLocked) return

      const targetX = direction === 'right' ? 120 : -120

      if (reducedMotion) {
        performCommit(direction)
        return
      }

      // Animate to threshold first for visual feedback, then commit
      animate(x, targetX, {
        type: 'spring',
        stiffness: 400,
        damping: 30,
        restDelta: 0.5,
        onComplete: () => {
          performCommit(direction)
        },
      })
    },
    [isLocked, performCommit, x, reducedMotion],
  )

  return {
    x,
    rotate,
    yesOpacity,
    noOpacity,
    overlayBgRight,
    overlayBgLeft,
    commitSwipe,
    handleDragEnd,
  }
}
