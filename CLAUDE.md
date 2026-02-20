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
- `POSTGRES_URL` — Neon/Vercel Postgres connection string for the Feedback tab. Without it, Feedback shows an empty state.
- `VOTER_HASH_PEPPER` — Secret string to hash anonymous voter IDs before DB storage.

## Architecture

**Entry:** `src/app/layout.tsx` (ThemeRegistry, metadata) → `LayoutShell` (client: Header, ModeSwitcher, DetailDrawerProvider, DetailDrawer) → route pages

**Route structure:**
- `/` → redirects to `/theater`
- `/theater` — Server component fetches `/api/theater` → `TheaterView` (client)
- `/streaming` — Server component fetches `/api/streaming` → `StreamingView` (client)
- `/feedback` — Renders `FeedbackTab` (client, self-contained)

**Three Modes:** Theater (box office/now-playing focus), Streaming (trending movies + TV), and Feedback (Reddit-style community board). Navigation via `ModeSwitcher` using `usePathname()` + `router.push()`.

**Data flow:**
1. Route pages (server) fetch data via internal API routes with 15-min revalidation
2. API Route Handlers (`app/api/`) call TMDB server-side
3. View components (client) receive initial data as props, handle filtering/sorting/search client-side
4. Detail drawer state is shared via `DetailDrawerContext` in the layout shell
5. Streaming search uses client-side `fetch('/api/search')` calls

**API Routes:**
- `GET /api/theater` — Now playing enriched with revenue/budget (top 20)
- `GET /api/streaming?window=week` — Trending movies + TV combined
- `GET /api/movie/[id]` — Movie detail + credits + watch providers
- `GET /api/search?q=...&type=movie|multi` — Search proxy
- `GET /api/feedback?sort=hot|new|top&category=all|bug|feature|general&page=1&voterId=...` — Feedback posts
- `POST /api/feedback` — Create feedback post (body: title, body, category)
- `POST /api/feedback/[id]/vote` — Vote on post (body: voterId, action: up|down|remove)

**Key layers:**
- `src/app/` — Next.js App Router (layout, page, loading, error, API routes)
- `src/components/` — UI components (all `'use client'`: Header, Hero, LayoutShell, TheaterView, StreamingView, DetailDrawerContext, MovieCard/Grid, FiltersBar, ChartPanel, DetailDrawer, Theater*/Streaming* variants, ThemeRegistry)
- `src/components/feedback/` — Feedback tab components (FeedbackTab, FeedbackPostCard, FeedbackForm, FeedbackControlBar, VoteControl)
- `src/services/tmdb.ts` — Server-only TMDB API client (uses `process.env.TMDB_API_KEY`)
- `src/services/db.ts` — Neon Postgres connection helper (uses `process.env.DATABASE_URL`)
- `src/services/mockData.ts` — Demo mode fallback data
- `src/utils/` — Formatters, score scaling, image URL helpers, constants
- `src/types/index.ts` — All TypeScript interfaces (MovieListItem, MovieDetail, etc.)
- `src/theme.ts` — MUI dark cinematic theme (primary: #e50914 Netflix red)

## API Documentation

Full API reference is maintained in `API.md` at the project root. When adding, modifying, or removing API routes in `src/app/api/`, update `API.md` to reflect the changes (endpoints, parameters, request/response shapes, error codes, auth requirements).

## Code Style

- Prettier: no semicolons, single quotes, 2-space indent, trailing commas (es5)
- TypeScript strict mode enabled
- ESLint with React hooks and TypeScript rules
- All interactive components require `'use client'` directive
- Import paths use `@/*` alias (mapped to `./src/*`)
