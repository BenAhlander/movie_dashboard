# FreshTomatoes — Movie Analytics Dashboard

A Netflix-cinematic, responsive React dashboard for **now playing** and **trending** movies with rich visuals, charts, and analytics. Built with Vite, TypeScript, MUI, ECharts, and TanStack Query.

## Features

- **Dual mode**: Theater (box office/now-playing) and Streaming (trending movies + TV)
- **Hero** with backdrop, parallax-style motion, film grain, and vignette
- **Movie grid** with poster cards, rank badges, Audience Score (TMDB) and Hype (momentum proxy)
- **Search**: Calls the TMDB search API to find any movie or TV show (debounced, 400ms)
- **Charts**: Top by Momentum (bar), Score vs Momentum (scatter/bubble), Score distribution (histogram)
- **Filters**: Search, min score slider, sort, media type (Streaming mode)
- **Detail drawer**: Poster, overview, genres, cast, directors, runtime, Where to Watch (US)
- **Demo mode**: Works without an API key by showing local mock data

## Data strategy (Free mode)

- **MODE A (default)**: Uses [TMDB](https://www.themoviedb.org/) only (free API key).
  - **Audience Score (TMDB)**: `vote_average × 10` as a percentage. Shown instead of Rotten Tomatoes in Free mode.
  - **Hype**: TMDB `popularity` scaled 0–100 as a "Box Office Momentum" proxy (explained in tooltips).
  - **Rating (TMDB)**: Same as Audience Score; IMDb is not used in Free mode.
  - A small tooltip explains why Rotten Tomatoes / IMDb are not shown in Free mode.

- **MODE B (optional)**: If you add `OMDB_API_KEY` (or equivalent) on the server later, the API can enrich with IMDb and Rotten Tomatoes. The UI will show RT/IMDb when the provider returns them; otherwise N/A.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

The app calls **TMDB directly from the browser** (no proxy or serverless). Set your key in a `.env` file in the project root:

- **`VITE_TMDB_API_KEY`** — [Get a free v3 API key](https://www.themoviedb.org/settings/api). Required for live data.

Example:

```bash
cp .env.example .env
# Edit .env and set VITE_TMDB_API_KEY=your_key
```

**Note:** The key is embedded in the client bundle and visible to users. TMDB allows this for read-only use; you can add referrer restrictions in your TMDB account if needed.

If `VITE_TMDB_API_KEY` is not set, the app runs in **demo mode** with local mock data.

### 3. Run locally

```bash
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`). With a valid key in `.env`, you get live TMDB data.

### 4. Build & deploy

```bash
npm run build
```

Deploy the `dist` folder to any static host (Vercel, Netlify, etc.). Set **`VITE_TMDB_API_KEY`** in the host's environment variables so the build embeds it. No serverless or API routes are required for TMDB.

## Project structure

```
/src
  components/            # Header, Hero, MovieCard, MovieGrid, FiltersBar, ChartPanel, DetailDrawer
  pages/                 # Dashboard
  services/              # tmdbClient (direct TMDB), providers (tmdb, streaming, enrichment), mockData
  hooks/                 # useMovies, useMovieDetails, useTheaterMovies, useStreaming, useSearchMovies
  types/
  utils/                 # formatters, scoreScaling, constants, imageUrl
  theme.ts
```

The app calls **TMDB's REST API directly** from the browser via `src/services/tmdbClient.ts` (list, search, movie details, credits, watch providers). No backend is required.

## Free mode limitations

- **Rotten Tomatoes** and **IMDb** are not available in the default (TMDB-only) setup. The UI shows "Audience Score (TMDB)" and "Rating (TMDB)" with a tooltip explaining this.
- To show RT/IMDb, you'd need a separate data source (e.g. OMDb) and MODE B support in the app.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — TypeScript + Vite build
- `npm run preview` — Preview production build
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Tech stack

- React 19, Vite 7, TypeScript
- Material UI (MUI) with custom dark cinematic theme
- Apache ECharts (echarts-for-react)
- Framer Motion
- TanStack Query (React Query)
- React Router
