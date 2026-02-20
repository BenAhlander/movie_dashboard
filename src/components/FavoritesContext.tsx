'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'

export interface Favorite {
  id: string
  tmdb_id: number
  title: string
  poster_path: string | null
  created_at: string
}

interface FavoritesContextValue {
  favorites: Favorite[]
  loading: boolean
  isFavorite: (tmdbId: number) => boolean
  getFavorite: (tmdbId: number) => Favorite | undefined
  addFavorite: (movie: {
    tmdb_id: number
    title: string
    poster_path: string | null
  }) => Promise<void>
  removeFavorite: (favoriteId: string) => Promise<void>
  canAddMore: boolean
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading: userLoading } = useUser()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setFavorites([])
      return
    }

    let cancelled = false
    setLoading(true)
    fetch('/api/favorites')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch favorites')
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setFavorites(data.favorites ?? [])
      })
      .catch(() => {
        if (!cancelled) setFavorites([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, userLoading])

  const isFavorite = useCallback(
    (tmdbId: number) => favorites.some((f) => f.tmdb_id === tmdbId),
    [favorites],
  )

  const getFavorite = useCallback(
    (tmdbId: number) => favorites.find((f) => f.tmdb_id === tmdbId),
    [favorites],
  )

  const addFavorite = useCallback(
    async (movie: {
      tmdb_id: number
      title: string
      poster_path: string | null
    }) => {
      const optimistic: Favorite = {
        id: `temp-${Date.now()}`,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        poster_path: movie.poster_path,
        created_at: new Date().toISOString(),
      }

      setFavorites((prev) => [...prev, optimistic])

      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movie),
        })

        if (!res.ok) {
          setFavorites((prev) =>
            prev.filter((f) => f.id !== optimistic.id),
          )
          if (res.status === 403) {
            throw new Error('Favorite limit reached')
          }
          if (res.status === 409) {
            throw new Error('Already favorited')
          }
          throw new Error('Failed to add favorite')
        }

        const data = await res.json()
        setFavorites((prev) =>
          prev.map((f) => (f.id === optimistic.id ? data.favorite : f)),
        )
      } catch (err) {
        setFavorites((prev) =>
          prev.filter((f) => f.id !== optimistic.id),
        )
        throw err
      }
    },
    [],
  )

  const removeFavorite = useCallback(async (favoriteId: string) => {
    let removed: Favorite | undefined
    setFavorites((prev) => {
      removed = prev.find((f) => f.id === favoriteId)
      return prev.filter((f) => f.id !== favoriteId)
    })

    try {
      const res = await fetch(`/api/favorites/${favoriteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        if (removed) setFavorites((prev) => [...prev, removed!])
        throw new Error('Failed to remove favorite')
      }
    } catch (err) {
      if (removed) setFavorites((prev) => [...prev, removed!])
      throw err
    }
  }, [])

  const canAddMore = favorites.length < 5

  const value = useMemo(
    () => ({
      favorites,
      loading,
      isFavorite,
      getFavorite,
      addFavorite,
      removeFavorite,
      canAddMore,
    }),
    [favorites, loading, isFavorite, getFavorite, addFavorite, removeFavorite, canAddMore],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx)
    throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
