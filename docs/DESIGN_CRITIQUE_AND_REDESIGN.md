# CineDash — Design Critique & Redesign Proposal

**Role:** Senior product designer & UX strategist  
**Focus:** Decision efficiency, clarity, and alignment with product goals (Theater vs Streaming; box office + RT; &lt;60 sec to decide).

---

## Step 1 — UX Evaluation

### Is the hierarchy clear?
**Verdict: Partially.**  
- **Hero** dominates and is clear (one featured title).  
- **Filters** (Now Playing / Trending Day / Week) sit in one row with search, min score, sort, and asc/desc. On small screens this becomes a dense toolbar; the primary mental split—“Am I choosing for the theater or for streaming?”—is not the top-level choice.  
- A single **“Movies”** section follows; there is no structural separation between “in theaters” and “on streaming.”  
- **Analytics** (three charts) has equal visual weight to the main list, which competes with the core job: *pick something to watch*.

### Is it obvious what is in theaters vs streaming?
**Verdict: No.**  
- “Now Playing” is theater-adjacent but not labeled as such; “Trending (Day/Week)” mixes theatrical and streaming buzz.  
- There is no **Streaming** concept in the IA: no streaming badges on cards, no “Where to watch” in the list, no Movie vs TV type.  
- Users cannot answer “What’s hot in theaters?” vs “What’s hot on Netflix/Disney+?” at a glance.

### Does the layout support quick scanning?
**Verdict: Partially.**  
- Grid + rank badges support scanning.  
- Cards show only **Score %** and **Hype**; box office and RT are missing from cards (and RT is absent in current data).  
- “Hype” is abstract; “Box office” or “Trending on [platform]” would be faster to parse.  
- Three charts require focus and don’t directly answer “which one should I watch?”

### Are ratings and box office prioritized appropriately?
**Verdict: No.**  
- **Box office** is not shown (only a “Hype” popularity proxy). Per product requirements, theater content should prominently show domestic (and global) box office.  
- **Rotten Tomatoes** (critic + audience) is not present; the app uses TMDB-only labels and tooltips. For decision-making, RT is a strong expected signal.  
- Score and Hype have equal weight on the card; for “decide in under 60 seconds,” the *one* number that matters most (e.g. RT or box office) should lead.

### Does the app feel cinematic but still usable?
**Verdict: Yes, with caveats.**  
- Dark theme, hero, and cards feel premium and on-brand.  
- Film grain and vignette are subtle and acceptable.  
- Risk: too many controls (search, slider, sort, asc/desc) in one bar can feel like a “dashboard” rather than a “what to watch” experience.  
- Charts add an analytics tone; if the goal is “pick a movie,” they can dilute the cinematic, editorial feel.

### Is there unnecessary visual noise?
**Verdict: Some.**  
- **FiltersBar:** Many controls at once (toggles, search, slider, dropdown, asc/desc). Secondary options could be collapsed or moved.  
- **Analytics section:** Three charts (bar, scatter, histogram) are useful for power users but not for “help me choose in 60 seconds.” They add cognitive load.  
- **Demo/API alerts** are necessary but prominent; consider a compact, dismissible treatment.  
- **Cards:** Only two chips (Score, Hype); the rest is clean. Good.

### Does the user immediately understand what to do?
**Verdict: Partially.**  
- “Scroll and click a poster” is discoverable.  
- The *purpose* of the app (“Theater vs Streaming; pick something great”) is not communicated in the layout.  
- No clear “start here” or “Theater” / “Streaming” entry points.  
- Sort options (Momentum, Score, Vote Count, Release) are clear for those who look; they don’t map to mental models like “Critics’ pick” or “Biggest hit.”

---

## Step 2 — Information Architecture

### Should Theater and Streaming be tabs, segments, or separate sections?
**Recommendation: Primary segmented control (tabs or pill switcher) at the very top.**  
- **Theater** and **Streaming** are two distinct intents; the first tap should be “I’m deciding for **theater**” or “I’m deciding for **streaming**.”  
- **Tabs or prominent segmented control** (e.g. “Theater | Streaming”) immediately frames the experience and reduces ambiguity.  
- Avoid mixing both in one list with a single “Now Playing / Trending” toggle; that doesn’t match the product requirement of two primary categories.

### Is sorting/filtering intuitive?
**Verdict: Functional but not decision-oriented.**  
- Current sort (Momentum, Score, Vote Count, Release) is generic.  
- Align with how people decide:  
  - **Theater:** “Sort by box office,” “New releases,” “Best reviewed.”  
  - **Streaming:** “Trending,” “Best rated,” “Movie vs TV” filter.  
- **Recommendation:**  
  - **Theater:** Default or prominent sort by box office (domestic or global); optional “By rating” / “By release.”  
  - **Streaming:** Default by popularity/trending; filter by type (Movie / TV) and optionally by service.  
- Move “Min score” and “Sort by” into a secondary row or a single “Filters” expandable area to reduce toolbar density.

### Are we overloading users with data?
**Verdict: On the list, no; on the page, yes.**  
- **Cards** are light (title, score, hype).  
- **Page-level** overload comes from: too many filter controls, three charts, and no clear “buckets” (e.g. “Top 5 in theaters,” “Top 5 on streaming”).  
- **Recommendation:** One primary list per mode (Theater or Streaming). Optional “See more” or a second row (e.g. “Also trending”) is fine. Hide or make charts optional (e.g. “Analytics” in a tab or below the fold).

### What is essential vs secondary?
**Essential (above the fold, on cards or hero):**  
- **Theater:** Title, poster, box office (domestic + global if available), RT critic + audience (if available), release date, runtime, genre.  
- **Streaming:** Title, poster, type (Movie/TV), streaming badges, RT (if available), trending/popularity indicator.  
**Secondary (detail view or expand):**  
- Full synopsis, full cast/crew, “Where to watch” list, extended filters, sort.  
**Optional / power users:**  
- Charts (momentum distribution, score vs box office). Keep for analytics but don’t compete with the main list.

---

## Step 3 — Visual Design

### Does the Netflix-cinematic theme enhance clarity or hurt it?
**Verdict: Enhances mood; needs small clarity tweaks.**  
- Dark, red accents, and glass panels are on-brand.  
- **Contrast:** Ensure score and box office numbers meet WCAG on dark (e.g. white or light gray for primary numbers, not low-contrast red on dark).  
- **Glow:** Current hover glow is subtle; avoid increasing it. If anything, reduce glow on cards and reserve a slight glow for “featured” or “#1” only.

### Should we use color strategically?
**Yes.**  
- **Rotten Tomatoes:** Use green for “fresh” (e.g. ≥60%) and red for “rotten” when RT is available. Users expect this.  
- **Box office:** Neutral (white/light) for numbers; optional subtle gold or accent for “blockbuster” tier (e.g. top 3 by revenue).  
- **Streaming badges:** Use platform colors (Netflix red, Disney+ blue, etc.) for logos/badges so services are recognizable at a glance.  
- **Type (Movie vs TV):** Small pill or icon (e.g. film strip vs TV) in a consistent position on every card.

### Should box office be formatted with bars, badges, ranking ribbons?
**Recommendation: Yes, but keep it simple.**  
- **Ranking ribbon** (e.g. “#1,” “#2”) is already present; keep it. Optionally use a subtle “Top 10” or “Blockbuster” ribbon for top box office.  
- **Box office numbers:** Prefer **short, formatted text** (e.g. “$42M” domestic, “$280M” global) over bars on cards. Bars can live in the detail view or in an optional “Compare” view.  
- **Badges:** “Domestic” / “Global” small labels next to amounts reduce ambiguity.

### Should trending momentum be visualized differently?
**Yes.**  
- Replace or supplement abstract “Hype” with:  
  - **Streaming:** “Trending on Netflix” or “#2 this week” with a small trend-up icon.  
  - **Theater:** “$XXM opening” or “Week 3” to signal momentum.  
- A small **sparkline or “trending up” icon** next to the number is enough; avoid a full chart on the card.

---

## Step 4 — Decision Support

### Does the app actually help users decide?
**Partially.**  
- It shows a list and scores, but it doesn’t name *why* something might be right for the user (e.g. “Critics’ favorite,” “Biggest hit,” “Trending fastest”).

### Should we add decision buckets?
**Yes.**  
- **Theater:**  
  - **Best overall** (e.g. score + box office composite or RT).  
  - **Critics’ favorite** (top by critic score).  
  - **Crowd favorite** (top by audience score).  
  - **Most profitable** (top by box office).  
- **Streaming:**  
  - **Trending fastest** (biggest rise in popularity).  
  - **Best rated** (score).  
  - **Crowd favorite** (audience).  
- **Implementation:** Either (a) **horizontal rows** per bucket (e.g. “Most profitable” row of 3–5 cards, then “Critics’ favorite” row), or (b) a **single list** with a “Quick pick” dropdown (“Show me: Best overall | Critics’ pick | Most profitable | Trending”) that re-sorts the same set. Option (a) is more scannable; option (b) is simpler. Recommend (a) for Theater and Streaming each: 1–2 rows of “curated” buckets, then “All” or “See more.”

### Would a comparison view help?
**Yes, as a secondary feature.**  
- **Side-by-side (2–3 titles):** Compare box office, RT, runtime, genre. Place in detail flow (e.g. “Compare” from detail drawer) or as a small “Add to compare” on cards with a sticky compare bar.  
- Don’t make comparison the default; keep “single list + detail” as the primary path.

---

## Step 5 — Rework: Redesigned Layout & Components

### Revised layout structure (high level)

1. **Header** — Logo + optional theme toggle. Minimal.
2. **Primary mode switcher** — **Theater | Streaming** (segmented control or tabs). Full width, high contrast. This is the main IA split.
3. **Contextual hero (optional)** — One featured item for the active mode (e.g. #1 at box office in Theater, or #1 trending in Streaming). Shorter than current hero (e.g. 40vh) so the list is quickly visible.
4. **Decision buckets (new)** —  
   - **Theater:** Rows such as “Top box office,” “Critics’ favorite,” “Crowd favorite.” Each row: 3–5 cards, horizontal scroll on mobile.  
   - **Streaming:** “Trending this week,” “Best rated,” “Crowd favorite,” with Movie/TV and streaming badges on cards.
5. **One main list** — “All in theaters” or “All trending (streaming)” with clear section title. Same card component, sort/filter in a compact secondary bar or under “Filters.”
6. **Detail drawer/sheet** — Unchanged in purpose; ensure it shows box office, RT (when available), runtime, genre, and streaming services.
7. **Analytics** — Optional; move to “Analytics” tab or below the fold so it doesn’t compete with the decision task.

### Revised component hierarchy

- **App shell:** Header → Mode (Theater | Streaming) → [Hero] → Buckets → Main list → [Analytics].  
- **Bucket row:** Section title (e.g. “Top box office”) + horizontal card strip (scroll on mobile).  
- **Card (Theater):** Poster, rank ribbon, title, **box office** (domestic + global if available), **RT** (critic + audience if available), release, runtime, genre chips. Optional “Compare” affordance.  
- **Card (Streaming):** Poster, **type pill** (Movie | TV), **streaming badges**, **RT** (if available), **trending indicator**, title.  
- **Filters:** Collapsed by default into “Filters” or one row: Sort (contextual: e.g. Box office / Rating / Release for Theater; Trending / Rating / Type for Streaming), optional search, optional min score.  
- **Detail drawer:** Prioritize box office, RT, runtime, genre, “Where to watch”; keep cast/overview. Optional “Add to compare.”

### Homepage wireframe (text)

**Desktop:**

- Top: Header (logo, maybe theme).
- Below: **[ Theater ] [ Streaming ]** (pill/tab, full-width bar).
- **Hero (compact):** Backdrop + title + 1–2 lines of meta + primary CTA (“See details” or scroll). Height ~40vh.
- **Section: “Top at the box office”** — Horizontal row of 5 cards. Each card: poster, #1–5 ribbon, title, domestic + global box office, RT (if available), release.
- **Section: “Critics’ favorites”** — Same pattern, 3–5 cards.
- **Section: “Crowd favorites”** — Same pattern.
- **Section: “All in theaters”** — Grid, same cards. Above grid: one line with Sort (Box office ▼) and [Filters]. No charts in main flow.
- Footer or “Analytics” link → optional charts page/section.

**Streaming tab:**

- Same header + mode.
- **Hero:** #1 trending (movie or TV), with streaming badge(s).
- **Section: “Trending this week”** — Cards with type (Movie/TV), streaming badges, RT, trend indicator.
- **Section: “Best rated”** — Same.
- **Section: “All trending”** — Grid. Sort: Trending | Rating; Filter: All | Movie | TV (and optionally by service).
- No charts in main flow.

**Mobile:**

- Same order; hero shorter. Bucket rows become horizontal scroll (scroll snap). Main list: 2 columns. Filters: bottom sheet or single row with overflow scroll. Detail: full-screen sheet instead of drawer.

### Card design (prioritization)

**Theater card (priority order):**

1. Poster (with rank overlay).
2. Title.
3. **Box office** — e.g. “$42M dom · $280M global” or “$280M worldwide” if only one number.
4. **Rotten Tomatoes** — e.g. “87%” with small “critic”/“audience” or tomato icon; color (green/red) if available.
5. Release + runtime (e.g. “Dec 2024 · 2h 12m”).
6. Genre chips (1–3).

**Streaming card:**

1. Poster.
2. **Type pill:** “Movie” or “TV” (top-left or top-right).
3. **Streaming badges** — Small logos or names (Netflix, Disney+, etc.) at bottom of poster or below title.
4. Title.
5. **RT** (if available).
6. **Trending:** “#3 this week” or fire/trend icon + number.
7. Optional: release or “New.”

### Visual refinements (summary)

- **Contrast:** Ensure key numbers (box office, RT) are high contrast (e.g. white or light gray on dark).
- **Color:** RT green/red when data exists; platform colors for streaming badges; neutral for box office.
- **Reduce noise:** Fewer controls in main toolbar; collapse Filters; move Analytics out of primary flow.
- **Glow:** Use sparingly (e.g. featured item or #1 only).
- **Ranking:** Keep ribbon; consider “Blockbuster” or “Top 10” for top box office.
- **Trending:** Prefer “#2 this week” or trend icon over abstract “Hype” number.

### Feature additions for decision-making

1. **Theater | Streaming** as the primary mode switch (IA).
2. **Box office on Theater cards** (and in detail); domestic + global when available.
3. **RT (critic + audience) on cards and detail** when data is available; else keep “Audience (TMDB)” and label clearly.
4. **Streaming badges and “Where to watch”** on Streaming cards and in detail.
5. **Movie vs TV** type on every Streaming card (and filter).
6. **Decision buckets:** “Top box office,” “Critics’ favorite,” “Crowd favorite,” “Trending fastest” as horizontal rows or quick-sort.
7. **Optional comparison:** Add to compare → 2–3 items side-by-side (box office, RT, runtime, genre).
8. **Contextual sort/filter:** Theater → Box office, Rating, Release; Streaming → Trending, Rating, Type (Movie/TV), Service.
9. **Shorter hero** so the first list is visible with minimal scroll.
10. **Charts** as optional/secondary (tab or below fold) so the main path stays “pick something to watch in under 60 seconds.”

---

## Summary

| Current gap | Change |
|------------|--------|
| No Theater vs Streaming split | Primary mode: **Theater \| Streaming** at top. |
| No box office on cards | Show **domestic + global** on Theater cards and detail. |
| No RT on cards | Show **RT critic + audience** when available; color (green/red). |
| No streaming context on list | **Streaming badges** and **Movie/TV** on Streaming cards. |
| Generic sort (Momentum, Score…) | **Contextual sort:** Box office / Rating / Release (Theater); Trending / Rating / Type (Streaming). |
| One flat list | **Bucket rows:** Top box office, Critics’ favorite, Crowd favorite, Trending. |
| Charts compete with list | Move **Analytics** to tab or below fold. |
| Dense filter bar | **Collapse** secondary filters; one primary sort per mode. |
| Abstract “Hype” | Replace with **“$XXM”** (theater) or **“#N this week” / trending** (streaming). |
| No comparison | Optional **Compare** (2–3 titles) from detail or cards. |

This structure keeps the experience cinematic and premium, stays responsive and mobile-friendly, and aligns the layout and content with the product goal: **clear Theater vs Streaming, prominent box office and RT, and a path to a confident viewing decision in under 60 seconds.**
