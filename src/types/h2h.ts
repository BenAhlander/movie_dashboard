/** Head-to-Head film voting types */

export interface H2HFilm {
  id: string
  tmdbId: number
  title: string
  year: number | null
  posterPath: string | null
  eloRating: number
  voteCount: number
}

export interface H2HMatchup {
  id: string
  filmA: H2HFilm
  filmB: H2HFilm
}

export interface MatchupResponse {
  matchup: H2HMatchup
}

export interface H2HVote {
  id: string
  matchupId: string
  winnerId: string
  votedAt: string
}

export interface VoteResponse {
  vote: H2HVote
  updatedRatings: {
    filmAId: string
    filmAElo: number
    filmBId: string
    filmBElo: number
  }
}

export interface H2HLeaderboardFilm {
  rank: number
  id: string
  tmdbId: number
  title: string
  year: number | null
  posterPath: string | null
  eloRating: number
  voteCount: number
}

export interface LeaderboardResponse {
  films: H2HLeaderboardFilm[]
  generatedAt: string
  minVotes: number
}

export type H2HPhase = 'loading' | 'playing' | 'empty' | 'leaderboard'

export interface H2HSessionStats {
  votesThisSession: number
  skipsThisSession: number
}
