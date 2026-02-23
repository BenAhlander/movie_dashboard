'use client'

import { useCallback, useReducer, useRef } from 'react'
import type {
  GameState,
  GamePhase,
  TriviaSession,
  SubmitRunResponse,
} from '@/types/trivia'
import {
  getQuestions,
  QUESTIONS_PER_ROUND,
  submitRun,
} from '@/lib/trivia/gameApi'

const LOCAL_STORAGE_KEY = 'trivia_sessions'

type GameAction =
  | { type: 'START' }
  | { type: 'CONTINUE' }
  | { type: 'ANSWER'; correct: boolean }
  | { type: 'SHOW_RESULTS' }
  | { type: 'SHOW_LEADERBOARD' }
  | { type: 'BACK_TO_RESULTS' }

function createInitialState(): GameState {
  const questions = getQuestions()
  return {
    phase: 'playing',
    questions,
    currentIndex: 0,
    score: 0,
    roundScore: 0,
    answers: [],
    totalQuestions: QUESTIONS_PER_ROUND,
    totalAnswered: 0,
    roundNumber: 1,
    usedQuestionIds: questions.map((q) => q.id),
  }
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return createInitialState()

    case 'CONTINUE': {
      // Keep cumulative score, load next round of questions
      const newQuestions = getQuestions(state.usedQuestionIds)
      return {
        ...state,
        phase: 'playing',
        questions: newQuestions,
        currentIndex: 0,
        roundScore: 0,
        answers: [],
        totalQuestions: QUESTIONS_PER_ROUND,
        roundNumber: state.roundNumber + 1,
        usedQuestionIds: [
          ...state.usedQuestionIds,
          ...newQuestions.map((q) => q.id),
        ],
      }
    }

    case 'ANSWER': {
      const newScore = action.correct ? state.score + 1 : state.score
      const newRoundScore = action.correct
        ? state.roundScore + 1
        : state.roundScore
      const newAnswers = [...state.answers, action.correct]
      const nextIndex = state.currentIndex + 1
      const isLastQuestion = nextIndex >= state.totalQuestions

      return {
        ...state,
        score: newScore,
        roundScore: newRoundScore,
        answers: newAnswers,
        currentIndex: nextIndex,
        totalAnswered: state.totalAnswered + 1,
        phase: isLastQuestion ? 'results' : state.phase,
      }
    }

    case 'SHOW_RESULTS':
      return { ...state, phase: 'results' }

    case 'SHOW_LEADERBOARD':
      return { ...state, phase: 'leaderboard' }

    case 'BACK_TO_RESULTS':
      return { ...state, phase: 'results' }

    default:
      return state
  }
}

/** Save a completed session to localStorage for streak/best tracking */
function saveSession(score: number): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    const sessions: TriviaSession[] = raw ? JSON.parse(raw) : []
    const today = new Date().toISOString().split('T')[0]
    sessions.unshift({ date: today, score })
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(sessions.slice(0, 30))
    )
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

/** Read session history from localStorage */
function readSessions(): TriviaSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export interface LocalStats {
  todayBest: number | null
  streak: number
}

/** Calculate local stats from stored sessions */
export function getLocalStats(): LocalStats {
  const sessions = readSessions()
  if (sessions.length === 0) return { todayBest: null, streak: 0 }

  const today = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter((s) => s.date === today)
  const todayBest =
    todaySessions.length > 0
      ? Math.max(...todaySessions.map((s) => s.score))
      : null

  let streak = 0
  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse()
  const now = new Date()

  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(now)
    expected.setDate(expected.getDate() - i)
    const expectedDate = expected.toISOString().split('T')[0]
    if (uniqueDates[i] === expectedDate) {
      streak++
    } else {
      break
    }
  }

  return { todayBest, streak }
}

export function useGame(isAuthenticated = false) {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialState
  )

  // Store the latest submit result so it can be read by ResultsScreen
  const lastSubmitResult = useRef<SubmitRunResponse>({ saved: false })

  const answer = useCallback(
    (userAnswer: boolean) => {
      const currentQuestion = state.questions[state.currentIndex]
      if (!currentQuestion) return false

      const correct = userAnswer === currentQuestion.answer

      dispatch({ type: 'ANSWER', correct })

      // If this was the last question in this round, save the session
      const isLast = state.currentIndex + 1 >= state.totalQuestions
      if (isLast) {
        const finalRoundScore = correct
          ? state.roundScore + 1
          : state.roundScore
        // Fire and forget — the result is stored in the ref for later use
        submitRun(finalRoundScore, state.totalQuestions, isAuthenticated).then(
          (result) => {
            lastSubmitResult.current = result
          }
        )
        saveSession(state.score + (correct ? 1 : 0))
      }

      return correct
    },
    [
      state.questions,
      state.currentIndex,
      state.roundScore,
      state.score,
      state.totalQuestions,
      isAuthenticated,
    ]
  )

  const startNewGame = useCallback(() => {
    dispatch({ type: 'START' })
  }, [])

  const keepPlaying = useCallback(() => {
    dispatch({ type: 'CONTINUE' })
  }, [])

  const setPhase = useCallback((phase: GamePhase) => {
    switch (phase) {
      case 'playing':
        dispatch({ type: 'START' })
        break
      case 'results':
        dispatch({ type: 'SHOW_RESULTS' })
        break
      case 'leaderboard':
        dispatch({ type: 'SHOW_LEADERBOARD' })
        break
    }
  }, [])

  const backToResults = useCallback(() => {
    dispatch({ type: 'BACK_TO_RESULTS' })
  }, [])

  const currentQuestion = state.questions[state.currentIndex] ?? null
  const nextQuestion = state.questions[state.currentIndex + 1] ?? null

  return {
    state,
    currentQuestion,
    nextQuestion,
    answer,
    startNewGame,
    keepPlaying,
    setPhase,
    backToResults,
    lastSubmitResult,
  }
}
