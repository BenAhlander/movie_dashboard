# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FreshTomatoes is a Netflix-inspired movie analytics dashboard built with React 19, TypeScript, Next.js 15 (App Router), Material UI 6, Apache ECharts, and Framer Motion. TMDB API calls are made server-side via Next.js Route Handlers (API key is never exposed to the client). Falls back to mock data in demo mode when no API key is set.

## Commands

- `npm run dev` — Start Next.js dev server (http://localhost:3000)
- `npm run build` — Next.js production build (TypeScript check + optimized output in `.next/`)
- `npm start` — Start production server
- `npm run lint` — ESLint on all TS/TSX files
- `npm run format` — Prettier formatting

No test runner is configured.

## Environment Variables

- `TMDB_API_KEY` — TMDB v3 API key (set in `.env`). Server-only (no `NEXT_PUBLIC_` prefix). Used by Route Handlers in `src/app/api/`. Without it, the app runs in demo mode with mock data from `src/services/mockData.ts`.

## Architecture

**Entry:** `src/app/layout.tsx` (ThemeRegistry, metadata) → `src/app/page.tsx` (server component, fetches initial data) → `Dashboard.tsx` (client component)

**Dual Mode:** Theater (box office/now-playing focus) vs Streaming (trending movies + TV). Toggled via `ModeSwitcher` component.

**Data flow:**
1. `app/page.tsx` (server) fetches initial theater + streaming data via internal API routes
2. API Route Handlers (`app/api/`) call TMDB server-side with 15-min revalidation
3. Dashboard (client) receives initial data as props, handles filtering/sorting/search client-side
4. Detail drawer and streaming search use client-side `fetch('/api/...')` calls

**API Routes:**
- `GET /api/theater` — Now playing enriched with revenue/budget (top 20)
- `GET /api/streaming?window=week` — Trending movies + TV combined
- `GET /api/movie/[id]` — Movie detail + credits + watch providers
- `GET /api/search?q=...&type=movie|multi` — Search proxy

**Key layers:**
- `src/app/` — Next.js App Router (layout, page, loading, error, API routes)
- `src/components/` — UI components (all `'use client'`: Header, Hero, Dashboard, MovieCard/Grid, FiltersBar, ChartPanel, DetailDrawer, Theater*/Streaming* variants, ThemeRegistry)
- `src/services/tmdb.ts` — Server-only TMDB API client (uses `process.env.TMDB_API_KEY`)
- `src/services/mockData.ts` — Demo mode fallback data
- `src/utils/` — Formatters, score scaling, image URL helpers, constants
- `src/types/index.ts` — All TypeScript interfaces (MovieListItem, MovieDetail, etc.)
- `src/theme.ts` — MUI dark cinematic theme (primary: #e50914 Netflix red)

## Code Style

- Prettier: no semicolons, single quotes, 2-space indent, trailing commas (es5)
- TypeScript strict mode enabled
- ESLint with React hooks and TypeScript rules
- All interactive components require `'use client'` directive
- Import paths use `@/*` alias (mapped to `./src/*`)
