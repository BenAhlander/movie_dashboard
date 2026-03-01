'use client'

import { useCallback, useReducer, useEffect, useRef } from 'react'
import type {
  H2HMatchup,
  H2HPhase,
  H2HSessionStats,
} from '@/types/h2h'
import {
  fetchMatchup,
  submitVote,
  skipMatchup,
} from '@/lib/h2h/h2hApi'

interface H2HState {
  phase: H2HPhase
  currentMatchup: H2HMatchup | null
  nextMatchup: H2HMatchup | null
  stats: H2HSessionStats
  error: string | null
}

type H2HAction =
  | { type: 'LOADING' }
  | { type: 'MATCHUP_LOADED'; matchup: H2HMatchup | null; isNext?: boolean }
  | { type: 'ADVANCE' }
  | { type: 'VOTE_SUBMITTED' }
  | { type: 'SKIPPED' }
  | { type: 'POOL_EXHAUSTED' }
  | { type: 'SHOW_LEADERBOARD' }
  | { type: 'BACK_TO_PLAYING' }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }

function createInitialState(): H2HState {
  return {
    phase: 'loading',
    currentMatchup: null,
    nextMatchup: null,
    stats: { votesThisSession: 0, skipsThisSession: 0 },
    error: null,
  }
}

function h2hReducer(state: H2HState, action: H2HAction): H2HState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, phase: 'loading', error: null }

    case 'MATCHUP_LOADED':
      if (action.isNext) {
        return { ...state, nextMatchup: action.matchup }
      }
      if (!action.matchup) {
        return { ...state, phase: 'empty', currentMatchup: null }
      }
      return {
        ...state,
        phase: 'playing',
        currentMatchup: action.matchup,
      }

    case 'ADVANCE':
      // Promote nextMatchup to current immediately
      if (!state.nextMatchup) {
        return { ...state, phase: 'empty', currentMatchup: null, nextMatchup: null }
      }
      return {
        ...state,
        phase: 'playing',
        currentMatchup: state.nextMatchup,
        nextMatchup: null,
      }

    case 'VOTE_SUBMITTED':
      return {
        ...state,
        stats: {
          ...state.stats,
          votesThisSession: state.stats.votesThisSession + 1,
        },
      }

    case 'SKIPPED':
      return {
        ...state,
        stats: {
          ...state.stats,
          skipsThisSession: state.stats.skipsThisSession + 1,
        },
      }

    case 'POOL_EXHAUSTED':
      return { ...state, phase: 'empty', currentMatchup: null, nextMatchup: null }

    case 'SHOW_LEADERBOARD':
      return { ...state, phase: 'leaderboard' }

    case 'BACK_TO_PLAYING':
      if (!state.currentMatchup) {
        return { ...state, phase: 'empty' }
      }
      return { ...state, phase: 'playing' }

    case 'ERROR':
      return { ...state, error: action.message }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}

export function useHeadToHead() {
  const [state, dispatch] = useReducer(
    h2hReducer,
    undefined,
    createInitialState
  )
  const isVoting = useRef(false)
  // Ref to hold the matchup id being voted on, so vote() doesn't
  // depend on state.currentMatchup (which changes on ADVANCE).
  const pendingMatchupRef = useRef<{ matchupId: string; winnerId: string } | null>(null)

  // Load initial matchup on mount
  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      try {
        const result = await fetchMatchup()
        if (cancelled) return

        if (!result) {
          dispatch({ type: 'POOL_EXHAUSTED' })
          return
        }

        dispatch({ type: 'MATCHUP_LOADED', matchup: result.matchup })

        // Pre-fetch next matchup
        const nextResult = await fetchMatchup()
        if (!cancelled && nextResult) {
          dispatch({
            type: 'MATCHUP_LOADED',
            matchup: nextResult.matchup,
            isNext: true,
          })
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'ERROR', message: 'Failed to load matchup' })
        }
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
  }, [])

  // Called synchronously when the swipe commits (before exit animation ends).
  // Stores the vote details for the async submit that happens after advance.
  const prepareVote = useCallback(
    (winnerId: string) => {
      if (!state.currentMatchup) return
      pendingMatchupRef.current = {
        matchupId: state.currentMatchup.id,
        winnerId,
      }
    },
    [state.currentMatchup]
  )

  // Called after the exit animation completes. Advances immediately,
  // then submits the vote and pre-fetches in the background.
  const advanceAndSubmit = useCallback(() => {
    // Advance card state immediately — no waiting for network
    dispatch({ type: 'ADVANCE' })
    dispatch({ type: 'VOTE_SUBMITTED' })

    const pending = pendingMatchupRef.current
    pendingMatchupRef.current = null
    if (!pending) return

    // Fire-and-forget: submit vote + pre-fetch next
    ;(async () => {
      try {
        await submitVote(pending.matchupId, pending.winnerId)
      } catch {
        dispatch({ type: 'ERROR', message: 'Vote failed to save' })
      }

      // Pre-fetch the next matchup to fill the empty nextMatchup slot
      try {
        const prefetch = await fetchMatchup()
        if (prefetch) {
          dispatch({
            type: 'MATCHUP_LOADED',
            matchup: prefetch.matchup,
            isNext: true,
          })
        }
      } catch {
        // Non-critical — we'll fetch again on the next advance
      }
    })()
  }, [])

  const skip = useCallback(async () => {
    if (!state.currentMatchup || isVoting.current) return
    isVoting.current = true

    const matchupId = state.currentMatchup.id

    // Advance immediately
    dispatch({ type: 'ADVANCE' })
    dispatch({ type: 'SKIPPED' })

    try {
      await skipMatchup(matchupId)

      // Pre-fetch next
      const prefetch = await fetchMatchup()
      if (prefetch) {
        dispatch({
          type: 'MATCHUP_LOADED',
          matchup: prefetch.matchup,
          isNext: true,
        })
      }
    } catch {
      dispatch({ type: 'ERROR', message: 'Failed to skip matchup' })
    } finally {
      isVoting.current = false
    }
  }, [state.currentMatchup])

  const showLeaderboard = useCallback(() => {
    dispatch({ type: 'SHOW_LEADERBOARD' })
  }, [])

  const backToPlaying = useCallback(() => {
    dispatch({ type: 'BACK_TO_PLAYING' })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  return {
    phase: state.phase,
    currentMatchup: state.currentMatchup,
    nextMatchup: state.nextMatchup,
    stats: state.stats,
    error: state.error,
    prepareVote,
    advanceAndSubmit,
    skip,
    showLeaderboard,
    backToPlaying,
    clearError,
  }
}
