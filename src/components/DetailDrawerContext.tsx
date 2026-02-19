'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import type { MovieDetail } from '@/types'

interface DetailDrawerContextValue {
  selectedMovieId: number | null
  setSelectedMovieId: (id: number | null) => void
  detailMovie: MovieDetail | null
  detailLoading: boolean
}

const DetailDrawerContext = createContext<DetailDrawerContextValue | null>(null)

export function DetailDrawerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null)
  const [detailMovie, setDetailMovie] = useState<MovieDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (selectedMovieId == null) {
      setDetailMovie(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    fetch(`/api/movie/${selectedMovieId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetailMovie(data.movie ?? null)
      })
      .catch(() => {
        if (!cancelled) setDetailMovie(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedMovieId])

  const handleSetSelectedMovieId = useCallback(
    (id: number | null) => setSelectedMovieId(id),
    [],
  )

  return (
    <DetailDrawerContext.Provider
      value={{
        selectedMovieId,
        setSelectedMovieId: handleSetSelectedMovieId,
        detailMovie,
        detailLoading,
      }}
    >
      {children}
    </DetailDrawerContext.Provider>
  )
}

export function useDetailDrawer() {
  const ctx = useContext(DetailDrawerContext)
  if (!ctx)
    throw new Error('useDetailDrawer must be used within DetailDrawerProvider')
  return ctx
}
