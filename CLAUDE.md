# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CineDash is a Netflix-inspired movie analytics dashboard built with React 19, TypeScript, Vite 7, Material UI 6, Apache ECharts, Framer Motion, and TanStack Query. It fetches data directly from the TMDB REST API in the browser (no backend required). Falls back to mock data in demo mode when no API key is set.

## Commands

- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — TypeScript check + Vite production build (outputs to `dist/`)
- `npm run preview` — Preview production build locally
- `npm run lint` — ESLint on all TS/TSX files
- `npm run format` — Prettier formatting

No test runner is configured.

## Environment Variables

- `VITE_TMDB_API_KEY` — TMDB v3 API key (set in `.env`). Embedded in client bundle at build time. Without it, the app runs in demo mode with mock data from `src/services/mockData.ts`.

## Architecture

**Entry:** `src/main.tsx` → `App.tsx` (QueryClient, ThemeProvider, BrowserRouter) → `Dashboard.tsx` (single page)

**Dual Mode:** Theater (box office/now-playing focus) vs Streaming (trending movies + TV). Toggled via `ModeSwitcher` component.

**Data flow:**
1. Dashboard manages filter/selection state
2. Custom hooks (`useMovies`, `useTheaterMovies`, `useStreaming`, `useMovieDetails`) use TanStack Query with 15-min stale time
3. Providers in `src/services/providers/` orchestrate API calls (parallel fetching, max 5 concurrent detail requests)
4. `src/services/tmdbClient.ts` is the low-level TMDB API wrapper

**Key layers:**
- `src/components/` — UI components (Header, Hero, MovieCard/Grid, FiltersBar, ChartPanel, DetailDrawer, Theater*/Streaming* variants)
- `src/hooks/` — Data fetching hooks wrapping TanStack Query
- `src/services/` — API client, providers, mock data
- `src/utils/` — Formatters, score scaling, image URL helpers, constants
- `src/types/index.ts` — All TypeScript interfaces (MovieListItem, MovieDetail, etc.)
- `src/theme.ts` — MUI dark cinematic theme (primary: #e50914 Netflix red)

## Code Style

- Prettier: no semicolons, single quotes, 2-space indent, trailing commas (es5)
- TypeScript strict mode enabled
- ESLint with React hooks and TypeScript rules
