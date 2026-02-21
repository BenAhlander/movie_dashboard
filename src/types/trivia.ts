export interface TriviaQuestion {
  id: string
  statement: string
  answer: boolean
  title: string
  year: number
  mediaType: 'movie' | 'tv'
  posterPath?: string | null
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface LeaderboardRow {
  rank: number
  username: string
  score: number
  total: number
  isCurrentUser?: boolean
}

export type GamePhase = 'playing' | 'results' | 'leaderboard'

export interface GameState {
  phase: GamePhase
  questions: TriviaQuestion[]
  currentIndex: number
  score: number
  answers: boolean[]
  totalQuestions: number
  roundScore: number
  totalAnswered: number
  roundNumber: number
  /** IDs of questions already seen across rounds (to avoid repeats) */
  usedQuestionIds: string[]
}

export interface TriviaSession {
  date: string
  score: number
}

export type LeaderboardPeriod = 'today' | 'allTime'

export interface ScoreTier {
  min: number
  max: number
  message: string
}
