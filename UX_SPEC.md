# UX Specification: Daily Swipe Trivia
## Feature for FreshTomatoes Movie Dashboard

**Document version:** 1.0
**Date:** 2026-02-21
**Route:** `/trivia`
**Status:** Design specification — no implementation code

---

## Table of Contents

1. [Design System Context](#1-design-system-context)
2. [Layout Wireframes](#2-layout-wireframes)
3. [Interaction Behavior Spec](#3-interaction-behavior-spec)
4. [Visual Feedback Spec](#4-visual-feedback-spec)
5. [Animation Approach](#5-animation-approach)
6. [Gesture Thresholds](#6-gesture-thresholds)
7. [Card Design](#7-card-design)
8. [Score and Progress Display](#8-score-and-progress-display)
9. [Fallback Controls](#9-fallback-controls)
10. [Results Screen Design](#10-results-screen-design)
11. [Leaderboard Screen Design](#11-leaderboard-screen-design)
12. [Accessibility Notes](#12-accessibility-notes)
13. [Microcopy](#13-microcopy)
14. [Screen Transitions](#14-screen-transitions)
15. [Design Rationale](#15-design-rationale)

---

## 1. Design System Context

### Existing Theme Tokens in Use

The trivia feature lives inside the FreshTomatoes design system. All styling must reference the existing MUI theme rather than hardcoded values where possible.

```
Background default:   #0a0a0a
Background paper:     rgba(20,20,20,0.85)  (with backdrop-filter: blur(12px))
Surface elevated:     rgba(26,26,26,0.8)
Primary (Netflix red): #e50914
Secondary:            #b20710
Text primary:         #ffffff
Text secondary:       rgba(255,255,255,0.7)
Text disabled:        rgba(255,255,255,0.5)
Divider:              rgba(255,255,255,0.08)
Border subtle:        rgba(255,255,255,0.06)
Border hover:         rgba(229,9,20,0.3)
Shape border-radius:  12px (theme.shape.borderRadius)
Font family:          "Netflix Sans", "Helvetica Neue", Helvetica, Arial, sans-serif
```

### Trivia-Specific Color Additions

These colors do not exist in the base theme and must be applied locally to trivia components:

```
Swipe YES overlay:    rgba(34, 197, 94, 0.25)   — green tint, semi-transparent
Swipe NO overlay:     rgba(229, 9, 20, 0.25)    — red tint, semi-transparent (same hue as primary but distinct use)
YES label color:      #22c55e                    — green-500
NO label color:       #e50914                    — primary red (intentional reuse)
Correct flash:        rgba(34, 197, 94, 0.35)
Incorrect flash:      rgba(229, 9, 20, 0.35)
Rank gold:            #f59e0b
Rank silver:          rgba(255,255,255,0.6)
Rank bronze:          #cd7c3c
User highlight row:   rgba(229, 9, 20, 0.08)
```

### Navigation Integration

The existing `Header` component uses a hamburger menu drawer with these nav items registered:

```
Theater    /theater
Streaming  /streaming
Feedback   /feedback
Polls      /polls
Profile    /profile  (auth-gated)
```

The `ModeSwitcher` component only renders the Theater/Streaming tab bar when the pathname starts with `/theater` or `/streaming`. On `/trivia`, `ModeSwitcher` renders nothing — this is the correct behavior and requires no code changes.

The trivia route must be added to the `menuItems` array in `Header.tsx`:

```
{ label: 'Trivia', path: '/trivia', icon: QuizIcon }
```

`QuizIcon` is available from `@mui/icons-material/Quiz`.

---

## 2. Layout Wireframes

### 2.1 Game Screen (Mobile — 375px wide)

```
┌─────────────────────────────────────────┐
│  ☰  FreshTomatoes                       │  ← Existing AppBar (sticky, ~56px)
├─────────────────────────────────────────┤
│                                         │
│  Score: 7    Question 8 / 20            │  ← Score row (~48px, px:16)
│  ████████████████░░░░░░░░░░░░░░░        │  ← Progress bar (8px tall)
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  [tiny poster area  ]             │  │  ← Card surface, ~320px wide,
│  │                                   │  │    ~420px tall, borderRadius:16px
│  │  Pulp Fiction                     │  │
│  │  1994 · Movie                     │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │                             │  │  │
│  │  │  This film was directed     │  │  │
│  │  │  by Quentin Tarantino.      │  │  │
│  │  │                             │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  Swipe to answer →                │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │  ← Button row (~72px)
│  │   ✕  NO      │  │  YES  ✓     │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  ← Left arrow = NO   Right arrow = YES  │  ← Keyboard hint (caption, hidden
│                                         │    on touch-only devices via media)
└─────────────────────────────────────────┘
```

**Notes on the game screen:**
- The header height is approximately 56px (existing AppBar)
- The score/progress row sits directly below the AppBar with 16px horizontal padding
- The card stack is centered horizontally with auto margins; max-width 360px on mobile, 420px on tablet
- The card underneath (next question) is visible: scaled down to 95% and offset 8px downward, creating a depth effect
- The YES/NO button row is fixed at the bottom of the card area, not the viewport — it scrolls with the page content
- The keyboard hint line is visible only on devices where the pointer is 'fine' (mouse/trackpad) via `@media (pointer: fine)`
- Total vertical space needed: 56px (header) + 48px (score) + 8px (progress) + 12px (gap) + 420px (card) + 16px (gap) + 72px (buttons) = ~632px, which fits within 667px (iPhone SE) if the AppBar offset is factored out

### 2.2 Game Screen — Mid-Swipe State (Mobile)

```
┌─────────────────────────────────────────┐
│  ☰  FreshTomatoes                       │
├─────────────────────────────────────────┤
│  Score: 7    Question 8 / 20            │
│  ████████████████░░░░░░░░░░░░░░░        │
│                                         │
│      ┌──────────────────────────────────┐│  ← Card tilted ~8deg clockwise,
│      │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ││    translated +80px right
│      │░░░  [YES overlay tint]  ░░░░░░  ││    Green overlay at 40% opacity
│      │░░░                      ░░░░░░  ││
│   ┌──┤  YES                    ░░░░░░  │┤  ← "YES" label, top-left of card
│   │  │  ✓                      ░░░░░░  ││    font-size: 28px, bold, green
│   │  │  Pulp Fiction           ░░░░░░  ││    rotated -8deg to counteract card
│   │  │  This film was directed ░░░░░░  ││
│   │  │  by Quentin Tarantino.  ░░░░░░  ││
│   └──┤                         ░░░░░░  ││
│      └──────────────────────────────────┘│
│        ┌──────────────────────────┐       │  ← Next card visible below (scaled)
│        │                          │       │
└─────────────────────────────────────────┘
```

### 2.3 Game Screen — Tablet (768px wide)

```
┌──────────────────────────────────────────────────────────────────┐
│  ☰  FreshTomatoes                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Score: 7  •  Question 8 of 20                      ████████░   │  ← Score left,
│                                                                  │    progress right
│         ┌─────────────────────────────────────────┐             │
│         │  [poster]   Pulp Fiction                │             │  ← Card centered,
│         │             1994 · Movie                │             │    max-width 480px
│         │                                         │             │
│         │  ┌───────────────────────────────────┐  │             │
│         │  │ This film was directed by Quentin  │  │             │
│         │  │ Tarantino.                         │  │             │
│         │  └───────────────────────────────────┘  │             │
│         │                                         │             │
│         └─────────────────────────────────────────┘             │
│                                                                  │
│              ┌─────────────┐    ┌─────────────┐                 │
│              │   ✕  NO     │    │  YES  ✓     │                 │
│              └─────────────┘    └─────────────┘                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 Results Screen (Mobile — 375px)

```
┌─────────────────────────────────────────┐
│  ☰  FreshTomatoes                       │
├─────────────────────────────────────────┤
│                                         │
│            Daily Trivia                 │  ← Section label (caption, centered)
│                                         │
│         ┌───────────────────┐           │
│         │                   │           │  ← Score card, centered
│         │   You scored      │           │    ~300px wide, ~260px tall
│         │                   │           │    Paper with border-radius:16px
│         │       16          │           │    Score number: h1, 72px, bold
│         │     ─────         │           │
│         │      /20          │           │
│         │                   │           │
│         │      80%          │           │  ← Percentage: h4
│         │                   │           │
│         │  Cinema Genius!   │           │  ← Tier message: body1, secondary
│         │                   │           │
│         └───────────────────┘           │
│                                         │
│   Today's best:  18 / 20  (local)       │  ← Optional local-state stat
│   Current streak: 3 days               │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │           Play Again                ││  ← Primary button (full width)
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        View Leaderboard             ││  ← Outlined secondary button
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### 2.5 Leaderboard Screen (Mobile — 375px)

```
┌─────────────────────────────────────────┐
│  ☰  FreshTomatoes                       │
├─────────────────────────────────────────┤
│                                         │
│  Leaderboard         Today · All time   │  ← Tab toggle (Today/All time)
│  ─────────────────────────────────      │
│                                         │
│  # │ Player              │ Score        │  ← Header row
│  ─────────────────────────────────      │
│                                         │
│  1 │ CinematicAlex       │  20 / 20    │  ← Gold rank badge
│  2 │ ReelTalk99          │  19 / 20    │  ← Silver
│  3 │ BlockbusterFan      │  18 / 20    │  ← Bronze
│  4 │ NightOwlCinephile   │  18 / 20    │
│  5 │ PopcornPrince       │  17 / 20    │
│  ─────────────────────────────────      │
│ ▶ 6 │ You                │  16 / 20   │  ← Current user row, highlighted
│  ─────────────────────────────────      │
│  7 │ FilmNerd42          │  15 / 20    │
│  8 │ ScriptDoctor        │  14 / 20    │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │           Play Again                ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

---

## 3. Interaction Behavior Spec

### 3.1 Card Drag Mechanics

**Pointer capture:** On `pointerdown`, the trivia card element calls `setPointerCapture(event.pointerId)` to ensure it receives all subsequent pointer events even if the pointer moves outside the element boundary. This is the reliable cross-browser approach for drag interactions.

**Position tracking:** `useDragControls` from Framer Motion is not used here. Instead, a plain `useMotionValue` pair (`x`, `y`) tracks the drag offset. The Framer Motion `drag` constraint is set to `dragConstraints={{ left: -400, right: 400, top: 0, bottom: 0 }}` — vertical drag is intentionally constrained to zero to prevent the card from moving up/down during a horizontal swipe.

**CSS touch-action:** The draggable card element must have `touch-action: pan-y` applied. This allows the browser to handle vertical scrolling on the page naturally while the JavaScript intercepts horizontal movement for the swipe gesture. Without this, iOS Safari will either block all scrolling or compete with the gesture recognizer.

**Drag event sequence:**
1. `onPointerDown` — record `startX`, `startY`, `startTime`, set `isDragging = true`
2. `onPointerMove` — compute `deltaX = currentX - startX`. Update `x` motion value. If `Math.abs(deltaX) > Math.abs(deltaY) * 1.5`, treat as horizontal swipe (prevent default to block browser scrolling). Update the rotation and overlay opacity as derived values.
3. `onPointerUp` — compute final `deltaX` and instantaneous `velocity` using `(deltaX / (Date.now() - startTime)) * 1000` (px per second). Evaluate commit/snap-back logic. Set `isDragging = false`.

**Text and image drag prevention:** The card wrapper must have the following CSS applied:

```css
user-select: none;
-webkit-user-select: none;
-webkit-user-drag: none;
```

All `img` elements inside the card must have `draggable="false"`.

### 3.2 Commit vs. Snap-Back Decision

On pointer release, evaluate in order:

1. **Velocity commit:** If `Math.abs(velocity) >= 500` (px/s), commit in the direction of velocity regardless of position. This handles fast flicks.
2. **Distance commit:** If `Math.abs(deltaX) >= 80` (px), commit in the direction of `deltaX`.
3. **Snap-back:** If neither condition is met, animate the card back to `x = 0, rotate = 0` using a spring with `stiffness: 300, damping: 30` (overdamped — no bouncing).

### 3.3 Commit Sequence

When a commit is triggered:

1. Immediately lock input — disable further swipe events and hide YES/NO buttons via pointer-events: none for the ~300ms window.
2. Animate the card off-screen: translate to `x = direction * 600, y = 40` with `rotate = direction * 20` over 280ms using an `ease-out` spring exit.
3. After 50ms into the exit animation, flash the full viewport with correct/incorrect color for 200ms (see Section 4).
4. After 300ms total, advance to the next question:
   - Pop the top card from the stack
   - The next card (which was visible underneath at scale 0.95) springs up to full scale (scale: 1.0) and translates back to `y = 0`
   - Reset `x`, `y`, and `rotate` motion values to zero
   - Re-enable input

### 3.4 Card Stack Effect

Two cards are rendered at all times (the current question and the next). A third pre-rendered card at scale 0.90 can be optionally added for a deeper stack illusion, but introduces layout complexity. Recommend starting with two-card depth.

**Back card positioning:**
- `scale: 0.95`
- `y: 10px` (pushed down slightly)
- `zIndex: 0`
- `opacity: 0.7`
- Transition to `scale: 1.0`, `y: 0`, `opacity: 1.0` with `spring({ stiffness: 280, damping: 28 })` when it becomes the active card

**Active card:**
- `scale: 1.0`
- `y: 0`
- `zIndex: 1`

Both cards share the same `position: absolute` container so they stack naturally.

### 3.5 GPU Acceleration

Framer Motion uses `transform` for all positional changes by default, which the browser compositor handles on the GPU. No additional `will-change` hints are necessary since Framer Motion manages this internally. However, the overlay div (the color tint layer inside the card) should use `opacity` and `background-color` changes driven by `useTransform` (derived from the `x` motion value) rather than React state updates — this keeps the visual feedback off the React render cycle and on the animation thread.

---

## 4. Visual Feedback Spec

### 4.1 Drag Overlay

A semi-transparent overlay `div` is positioned absolutely over the card content (`position: absolute, inset: 0, border-radius: inherit, pointer-events: none, z-index: 2`).

Its `backgroundColor` and `opacity` are driven by `useTransform(x, [-160, 0, 160], ...)` — Framer Motion's motion value transformer, keeping this entirely off the React render cycle.

**Dragging right (YES):**
- Overlay `backgroundColor`: `rgba(34, 197, 94, 0.0)` at center, interpolating to `rgba(34, 197, 94, 0.3)` at +160px
- The "YES" label appears in the top-left area of the card

**Dragging left (NO):**
- Overlay `backgroundColor`: `rgba(229, 9, 20, 0.0)` at center, interpolating to `rgba(229, 9, 20, 0.3)` at -160px
- The "NO" label appears in the top-right area of the card

### 4.2 YES / NO Labels

Two label elements are rendered inside the card, one for each direction. They are permanently in the DOM but driven by motion values for zero-lag feedback.

**YES label:**
- Position: `top: 20px, left: 20px` (absolute within card)
- Content: "YES" text with a checkmark icon above or beside it
- Font: 28px, font-weight 700, color: `#22c55e`
- Border: `2px solid #22c55e`, border-radius: 6px, padding: `4px 12px`
- Rotation: `-12deg` (counterclockwise, like a rubber stamp)
- Opacity: `useTransform(x, [0, 80, 160], [0, 0.5, 1.0])` — fades in as user drags right, fully visible at the commit threshold

**NO label:**
- Position: `top: 20px, right: 20px` (absolute within card)
- Content: "NO" text with an X icon
- Font: 28px, font-weight 700, color: `#e50914`
- Border: `2px solid #e50914`, border-radius: 6px, padding: `4px 12px`
- Rotation: `12deg` (clockwise)
- Opacity: `useTransform(x, [0, -80, -160], [0, 0.5, 1.0])` — fades in as user drags left

### 4.3 Card Rotation During Drag

The card rotation is derived from the horizontal displacement:

```
rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
```

The rotation pivots around the card's center by default (transform-origin: center center). Max rotation is capped at 15 degrees. The rotation direction matches the drag direction: dragging right rotates clockwise, dragging left rotates counterclockwise.

### 4.4 Correct / Incorrect Flash

When an answer is committed:

1. A full-screen semi-transparent overlay (position: fixed, inset: 0, z-index: 9999, pointer-events: none) fades in to `opacity: 1` and then fades out over 300ms total.
   - Correct: `backgroundColor: rgba(34, 197, 94, 0.35)`
   - Incorrect: `backgroundColor: rgba(229, 9, 20, 0.35)`
2. The flash should use a CSS animation (`@keyframes flashFeedback { 0% { opacity: 0 } 25% { opacity: 1 } 100% { opacity: 0 } }`) with `animation-duration: 300ms, animation-fill-mode: forwards`. This keeps the flash off the React render cycle entirely.
3. Simultaneously, the score counter animates — if correct, the score number increments with a brief `scale: 1.3 → 1.0` spring on the score digit to provide tactile confirmation.

### 4.5 Pause Before Next Card

After the commit flash begins, there is a 300ms total gap before the next card animates into position. This pause serves two purposes:
- It prevents accidental double-swipes (input is locked during this window)
- It gives the user a moment to register whether their answer was correct

---

## 5. Animation Approach

### 5.1 Why Framer Motion

Framer Motion is already installed in the project and is actively used in `MovieCard.tsx`, `FeedbackPostCard.tsx`, `VoteControl.tsx`, and `Hero.tsx`. The codebase has established patterns for motion values, spring animations, and entrance transitions. Adding a new animation library would be redundant and would increase bundle size. Additionally, Framer Motion's `useMotionValue`, `useTransform`, and `animate()` API are purpose-built for exactly this type of gesture-driven drag interaction.

### 5.2 Spring Configurations

**Card snap-back (no commit reached):**
```
type: 'spring'
stiffness: 300
damping: 30
restDelta: 0.01
```
The high damping value relative to stiffness means the card returns to center with zero oscillation — it does not bounce. This is intentional: a bouncing snap-back feels playful in a game context, but for a question that the user deliberately chose not to answer, it should feel calm and controlled.

**Card exit (commit — swipes off screen):**
```
type: 'tween'
duration: 0.28
ease: [0.32, 0, 0.67, 0]  // ease-in cubic bezier — starts slow, ends fast
```
A tween is preferred over a spring for the exit because springs have unpredictable completion times. The card needs to clear the screen in a precise window so the 300ms timing logic works correctly.

**Next card promote (back card becomes active):**
```
type: 'spring'
stiffness: 280
damping: 28
```
This spring has very slight overshoot (just perceptible), making the card feel like it "pops" forward. The overshoot is subtle — the scale might briefly reach 1.02 before settling at 1.0.

**Score digit increment:**
```
type: 'spring'
stiffness: 400
damping: 20
```
Fast, snappy spring that makes the number feel like it "jumps" when you get a correct answer.

**Screen entrance (game screen loads):**
```
initial: { opacity: 0, y: 24 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.35, ease: 'easeOut' }
```
Cards stagger in with a 0.05s delay between them.

**Results screen entrance:**
```
initial: { opacity: 0, scale: 0.92 }
animate: { opacity: 1, scale: 1.0 }
transition: { type: 'spring', stiffness: 320, damping: 28 }
```
The score card scales up from slightly small, giving the reveal a sense of importance.

**Score number count-up:**
The displayed score animates from 0 to the final value over ~600ms when the results screen appears. Use Framer Motion's `animate()` imperative API with a linear transition on a motion value, then round to integer for display. This is the same technique used in score counters in many game UIs.

**Leaderboard rows entrance:**
```
initial: { opacity: 0, x: -16 }
animate: { opacity: 1, x: 0 }
transition: (index) => ({ delay: index * 0.04, duration: 0.3, ease: 'easeOut' })
```
Rows stagger in from left with a 40ms delay per row, creating a cascading reveal effect.

### 5.3 Reduced Motion Handling

All animations must respect `prefers-reduced-motion`. Query this with `useReducedMotion()` from Framer Motion (already the package is installed). When reduced motion is active:
- Card swipe commit: instant transition (duration: 0), no rotation
- Snap-back: instant reset
- Flash overlay: no flash (skip entirely)
- Screen transitions: no scale, no y-offset — opacity only with 150ms duration
- Score count-up: number appears instantly at final value
- Leaderboard stagger: all rows appear simultaneously

---

## 6. Gesture Thresholds

### 6.1 Summary Table

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Drag commit distance | 80px horizontal | ~21% of a 375px screen width. Far enough to be intentional, close enough to be reachable in a comfortable wrist motion |
| Velocity commit threshold | 500px/s | A quick, deliberate flick. Below this, slow drags must reach the distance threshold. 500px/s corresponds to a ~160ms flick across 80px |
| Max visual rotation | 15 degrees | Beyond 15 degrees starts to feel disorienting and obscures card content. 15 is the established sweet spot in swipe card patterns (Tinder, Bumble) |
| Snap-back spring stiffness | 300 | Provides immediate, responsive feel without oscillation |
| Snap-back spring damping | 30 | Produces a critically-damped or slightly overdamped response at this stiffness value |
| Exit animation duration | 280ms | Slightly slower than the flash overlay (300ms) so the card is still partially visible as the flash peaks |
| Post-commit pause | 300ms | Minimum time to register feedback; maximum to avoid feeling slow |
| Overlay full opacity at | 160px | 2x the commit threshold, giving a graduated visual response |
| Input dead zone | 10px | Horizontal movement under 10px from touch start is ignored (prevents accidental triggers during taps) |

### 6.2 Directional Dead Zone

A 10px horizontal dead zone is applied from the initial touch point. This prevents the card from visually reacting to small finger settling motions at the start of a touch. Only when `Math.abs(deltaX) > 10` does the card begin to track the finger.

---

## 7. Card Design

### 7.1 Card Dimensions

| Breakpoint | Width | Height | Notes |
|------------|-------|--------|-------|
| xs (375px) | calc(100vw - 32px), max 340px | 420px | 16px margin on each side |
| sm (768px) | 420px | 460px | Centered, fixed width |
| md (1280px) | 440px | 480px | Centered, wider viewport irrelevant — game stays narrow |

The card maintains fixed height to ensure the card stack effect renders predictably. Variable-height cards would cause the stack to shift.

### 7.2 Card Structure (Top to Bottom)

```
┌──────────────────────────────────────┐
│  [Poster area — 80x120px]            │  ← Top section (optional)
│   Movie/TV title (h5, bold)          │
│   Year • Type (caption, secondary)   │
│                                      │
│  ────────────────────────────────    │  ← Divider (rgba(255,255,255,0.08))
│                                      │
│  Statement area:                     │  ← Middle section (flex: 1)
│                                      │
│  "This film was directed by          │
│   Quentin Tarantino."                │
│                                      │
│  ────────────────────────────────    │
│                                      │
│  ← Swipe left for NO                │  ← Hint row (caption)
│     Swipe right for YES →            │
└──────────────────────────────────────┘
```

### 7.3 Poster Placeholder Area

The poster area is a 80×120px rectangle in the top-left corner of the card. On live implementation, this would display the movie/TV show poster image. For the spec and demo phase, it displays:
- Background: `rgba(26,26,26,0.6)` with `border-radius: 8px`
- A centered `MovieIcon` from MUI icons at 32px, color: `rgba(255,255,255,0.2)`
- When a real poster image is used: `object-fit: cover`, `loading="lazy"`, `draggable="false"`

The poster is decorative and secondary to the question. It must not draw attention away from the statement text.

### 7.4 Card Typography

**Title:**
- Variant: `h5` from MUI typography scale
- Font-weight: 700
- Color: `text.primary` (`#ffffff`)
- Max 2 lines, `text-overflow: ellipsis` on overflow
- Font-size on mobile: ~1.25rem (20px), tablet: ~1.5rem (24px)

**Year and type badge:**
- Variant: `caption`
- Color: `text.secondary` (`rgba(255,255,255,0.7)`)
- Format: "1994 · Movie" or "2019 · TV Series"
- The dot separator is a middle dot (U+00B7), not a hyphen

**Statement:**
- Variant: `body1`
- Font-size: ~1.05rem (17px) on mobile, 1.1rem (18px) on tablet
- Line-height: 1.6 (generous for readability)
- Color: `text.primary`
- The statement text is the only content that matters — it must be the most visually prominent element on the card
- Max 3 lines before font size should decrease (dynamic font size adjustment not required in v1, just ensure statements are authored to fit)

**Swipe hint:**
- Variant: `caption`
- Color: `text.disabled` (`rgba(255,255,255,0.5)`)
- Centered
- Hidden after the user has completed their first swipe in the session (stored in component state)

### 7.5 Card Visual Styling

```
backgroundColor:   rgba(20, 20, 20, 0.95)
backdropFilter:    blur(12px)
border:            1px solid rgba(255, 255, 255, 0.08)
borderRadius:      16px  (slightly larger than theme's 12px to give cards a softer feel)
boxShadow:         0 24px 60px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)
padding:           24px
position:          absolute  (within the card stack container)
cursor:            grab  (changes to grabbing during drag)
```

The heavier drop shadow compared to standard cards in the app is intentional — it visually separates the card from the dark background and emphasizes that it is a floating, manipulable object.

### 7.6 Card Stack Container

```
position:          relative
width:             [card width per breakpoint]
height:            [card height per breakpoint + 20px for back card peek]
margin:            0 auto
touch-action:      pan-y
overflow:          visible  (allows shadow to render outside bounds)
```

---

## 8. Score and Progress Display

### 8.1 Layout

The score/progress row sits between the AppBar and the card stack with `paddingX: 16px` and `paddingTop: 16px, paddingBottom: 8px`.

**Mobile layout (xs):**
```
Score: 7          Question 8 of 20
[═══════════════════════░░░░░░░]   ← Progress bar
```
Two items in a row using `display: flex, justifyContent: space-between, alignItems: center`. Below them, a full-width progress bar.

**Tablet and up (sm+):**
```
Score: 7  •  Question 8 of 20                    [══════════░] 40%
```
Single row with score, separator, question count on the left, and a compact progress bar on the right (width ~120px).

### 8.2 Score Display

```
Label: "Score:"
Value: current correct answers (integer)
Typography: body1, fontWeight: 700, color: text.primary
```

The score value digit is wrapped in a `motion.span` so it can receive the scale spring animation when incrementing (see Section 4.4).

When the score increments on a correct answer, the digit briefly displays the `+1` delta as a small element that fades in and floats upward before disappearing (`y: -20px, opacity: 0` over 600ms). This is a "floating score" effect common in quiz and game UIs.

### 8.3 Question Counter

```
Format:    "Question 8 of 20"
Typography: body2, color: text.secondary
```

### 8.4 Progress Bar

Use MUI's `LinearProgress` component:
```
variant="determinate"
value={(currentQuestion / 20) * 100}
sx={{
  height: 6,
  borderRadius: 3,
  backgroundColor: 'rgba(255,255,255,0.08)',
  '& .MuiLinearProgress-bar': {
    backgroundColor: '#e50914',
    borderRadius: 3,
  }
}}
```

The progress bar is `aria-label="Quiz progress"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="20"` for screen readers.

---

## 9. Fallback Controls

### 9.1 Button Layout

Below the card stack (not fixed — part of the document flow), two buttons sit side-by-side:

```
[  ✕  NO  ]  [  YES  ✓  ]
```

Container: `display: flex, gap: 16px, justifyContent: center, marginTop: 24px`

### 9.2 Button Specification

**NO button:**
```
variant:          outlined
size:             large
width:            140px (xs), 160px (sm+)
height:           52px
borderColor:      rgba(229, 9, 20, 0.5)
color:            #e50914
borderRadius:     12px (theme.shape.borderRadius)
startIcon:        CloseIcon from @mui/icons-material/Close
fontWeight:       700
fontSize:         1rem
hover state:      backgroundColor: rgba(229, 9, 20, 0.08), borderColor: #e50914
active state:     scale: 0.96 (Framer Motion whileTap)
```

**YES button:**
```
variant:          contained
size:             large
width:            140px (xs), 160px (sm+)
height:           52px
backgroundColor:  #22c55e
color:            #000000 (black text on green for contrast)
borderRadius:     12px
startIcon:        CheckIcon from @mui/icons-material/Check
fontWeight:       700
fontSize:         1rem
hover state:      backgroundColor: #16a34a
active state:     scale: 0.96 (Framer Motion whileTap)
boxShadow:        0 4px 20px rgba(34, 197, 94, 0.25)
```

The green YES button uses black text because white text on `#22c55e` fails WCAG AA contrast ratio. Black (#000000) on `#22c55e` achieves a contrast ratio of ~5.9:1, which passes AA for normal text.

### 9.3 Keyboard Support

When the game screen is active (and focus is on the game container or no specific interactive element), the following keyboard bindings apply:

| Key | Action |
|-----|--------|
| ArrowRight | Commit YES |
| ArrowLeft | Commit NO |
| Y | Commit YES (secondary) |
| N | Commit NO (secondary) |
| Space | No action (prevent scroll) |

Implementation: `useEffect` that adds a `keydown` listener on the `window` when the game is in the `playing` state, and removes it when in `results` or `leaderboard` state.

When keyboard is used to commit:
- Animate the card as if it were swiped in the appropriate direction (use Framer Motion's `animate()` imperative API on the `x` motion value)
- The visual feedback (overlay, rotation, flash) all follow the same sequence as a gesture commit

Keyboard shortcut hint text appears in the bottom hint row (only visible on `@media (pointer: fine)` devices):
```
← Arrow key = NO   Arrow key = YES →
```

### 9.4 Touch Target Compliance

Both NO and YES buttons have a minimum tap target of 52px height, well above the 44px minimum. The button `width` (140px+) far exceeds the minimum. On mobile devices with close buttons, there is a minimum 16px gap between the NO and YES buttons to prevent mis-taps.

---

## 10. Results Screen Design

### 10.1 Screen Structure

The results screen replaces the game screen content within the same route (`/trivia`). It does not navigate to a new URL. The game state machine has three states: `playing`, `results`, `leaderboard`.

```
State machine:
  idle → playing (user clicks "Start" or "Play Again")
  playing → results (20 questions answered)
  results → leaderboard (user clicks "View Leaderboard")
  results → playing (user clicks "Play Again")
  leaderboard → playing (user clicks "Play Again")
  leaderboard → results (user clicks "Back to Results" or browser back)
```

### 10.2 Score Card Component

The central element is a Paper card with `borderRadius: 20px, padding: 32px, textAlign: center, maxWidth: 320px, margin: 0 auto`.

```
┌────────────────────────────┐
│                            │
│     Daily Trivia           │  ← caption, text.secondary, uppercase
│                            │
│           16               │  ← h1, 80px, fontWeight: 800, text.primary
│                            │
│      ─────────────         │  ← divider, width: 60px, margin: auto
│                            │
│           / 20             │  ← h4, fontWeight: 400, text.secondary
│                            │
│           80%              │  ← h3, fontWeight: 700, color: conditional
│                            │
│    "Cinema Genius!"        │  ← body1, text.secondary, italic
│                            │
└────────────────────────────┘
```

**Score percentage color:**
- 90-100% (18-20 correct): `#22c55e` (green)
- 70-89% (14-17 correct): `#f59e0b` (amber)
- 50-69% (10-13 correct): `text.primary` (white)
- 0-49% (0-9 correct): `text.secondary` (dim white, not red — red would feel punitive)

The score number animates from 0 to the actual value on mount (see Section 5.2 score count-up).

### 10.3 Optional Local State Stats

Below the score card, if `localStorage` contains previous session data:

```
┌────────────────────────────────────────────────┐
│  Today's best: 18 / 20     Current streak: 3d  │
└────────────────────────────────────────────────┘
```

Typography: `caption`, color: `text.disabled`. Displayed only if at least one previous session exists today. "Streak" counts consecutive days with at least one completed game. Both values are read from `localStorage` — no server persistence in v1.

`localStorage` schema:
```json
{
  "trivia_sessions": [
    { "date": "2026-02-21", "score": 16 },
    { "date": "2026-02-20", "score": 14 }
  ]
}
```

### 10.4 CTA Buttons

```
[   Play Again   ]          ← MUI Button, variant="contained", color="primary", fullWidth, large
                            ← 12px gap
[ View Leaderboard ]        ← MUI Button, variant="outlined", color="inherit", fullWidth, large
```

Both buttons are `fullWidth` within the `maxWidth: 320px` centered container. The contained "Play Again" button uses Netflix red as the primary call to action — consistent with all primary CTAs in the existing app.

---

## 11. Leaderboard Screen Design

### 11.1 Tab Toggle (Today / All Time)

At the top of the leaderboard, a small toggle switches between "Today" and "All time" data. Uses MUI `ToggleButtonGroup` with the same styling established in `FiltersBar.tsx`:

```
sx={{
  '& .MuiToggleButton-root': {
    color: 'text.secondary',
    borderColor: 'divider',
    '&.Mui-selected': {
      color: 'primary.main',
      borderColor: 'primary.main',
      bgcolor: 'rgba(229,9,20,0.08)'
    }
  }
}}
```

In v1, both tabs display the same mock data — the toggle is present for future implementation and to set user expectations.

### 11.2 Leaderboard Row Design

Each row is rendered as a MUI `Box` with a subtle border rather than a `Table` — this allows more flexible mobile styling without table overflow issues.

```
Row height: 52px (min-height, allowing for wrap on mobile)
Padding: 0 16px
Display: flex, alignItems: center, gap: 12px
Border-bottom: 1px solid rgba(255,255,255,0.06)
```

**Row anatomy:**

| Column | Content | Width | Notes |
|--------|---------|-------|-------|
| Rank badge | Number (1, 2, 3, ...) | 36px | Fixed. Ranks 1-3 use colored badges (gold, silver, bronze). Ranks 4+ show plain number in `text.secondary` |
| Username | Display name string | flex: 1 | Truncated with ellipsis on overflow. `font-weight: 500` |
| Score | "16 / 20" | auto | Right-aligned. `font-weight: 600` |

**Rank badges for top 3:**
```
Rank 1: backgroundColor: #f59e0b, color: #000, borderRadius: 50%, width: 28px, height: 28px
Rank 2: backgroundColor: rgba(255,255,255,0.6), color: #000, borderRadius: 50%, width: 28px, height: 28px
Rank 3: backgroundColor: #cd7c3c, color: #fff, borderRadius: 50%, width: 28px, height: 28px
Ranks 4+: plain Typography, variant: body2, color: text.secondary, width: 28px, textAlign: center
```

### 11.3 Current User Row Highlight

The row representing the current user is visually distinguished:
```
backgroundColor: rgba(229, 9, 20, 0.08)
borderLeft: 3px solid #e50914
paddingLeft: 13px  (16px - 3px border)
```
This matches the exact pattern used for selected navigation items in the Header drawer.

A small "You" label (caption, primary color) appears below the username in the current user's row.

### 11.4 Mock Leaderboard Data

The leaderboard displays 10 mock entries. The current user is positioned at rank 6 with the actual score from the just-completed game. The top 5 are fictional names with scores of 20, 19, 18, 18, 17. Ranks 7-10 are fictional names with scores of 15, 14, 13, 12.

The mock data should be authored to feel realistic — use cinephile-flavored usernames:

```
Rank 1: CinematicAlex       20/20
Rank 2: ReelTalk99          19/20
Rank 3: BlockbusterFan      18/20
Rank 4: NightOwlCinephile   18/20
Rank 5: PopcornPrince       17/20
Rank 6: You                 [actual score]/20  ← highlighted
Rank 7: FilmNerd42          15/20
Rank 8: ScriptDoctor        14/20
Rank 9: IndieSleeper        13/20
Rank 10: MidnightMatinee    12/20
```

### 11.5 Simulated Live Movement (Optional Enhancement)

In v1 this is optional and only implemented if development time permits. Every 8–12 seconds (randomized), one of the non-user rows quietly updates its score by 1 point and reorders if necessary. The updated row receives a brief `backgroundColor` flash (same color as the correct-answer flash at 20% opacity). This creates the illusion of a live leaderboard.

If implemented, the score changes and reordering use the same Framer Motion layout animations (`layout` prop on list items and `AnimatePresence` for reordering) that would be used for any animated list.

### 11.6 Leaderboard Play Again Button

At the bottom of the leaderboard:

```
[   Play Again   ]   ← variant="contained", color="primary", fullWidth within max-width container
```

---

## 12. Accessibility Notes

### 12.1 Touch Targets

All interactive elements meet or exceed the 44×44px minimum:
- YES and NO buttons: 52px height, 140px+ width
- Keyboard arrow keys: no touch target issue (keyboard)
- Leaderboard toggle buttons: minimum 44px height via `size="medium"` MUI ToggleButton
- Play Again / View Leaderboard buttons: large size, 52px+ height
- Hamburger menu button in Header: existing 48px icon button (unchanged)

### 12.2 Color Not Sole Indicator

YES and NO actions are never indicated by color alone:
- YES: green color + "YES" text label + checkmark icon (CheckIcon)
- NO: red color + "NO" text label + X icon (CloseIcon)
- Correct answer flash: green tint + (in future: correct sound if audio is added)
- Incorrect answer flash: red tint + no additional indicator needed since the flash is supplementary — the primary indication of correctness is the score incrementing (or not)

Drag direction indicators:
- Dragging right: green tint overlay + "YES" label with check icon
- Dragging left: red tint overlay + "NO" label with X icon

### 12.3 Keyboard Navigation

**Tab order on game screen:**
1. Hamburger menu button (in Header)
2. NO button
3. YES button

The card itself is not in the tab order (it is a drag surface, not a button). The YES/NO buttons are the keyboard-accessible interaction points. Arrow keys provide the swipe shortcut as described in Section 9.3.

**Tab order on results screen:**
1. Hamburger menu button
2. Play Again button
3. View Leaderboard button

**Tab order on leaderboard screen:**
1. Hamburger menu button
2. Today toggle
3. All time toggle
4. Play Again button

### 12.4 Screen Reader Considerations

**Card content:** The trivia card must have `role="article"` or `role="region"` with `aria-label="Trivia question [n] of 20"`. The title, year, and statement should be read sequentially by screen readers.

**Swipe action buttons:**
- `aria-label="Answer No — swipe left or click"` on the NO button
- `aria-label="Answer Yes — swipe right or click"` on the YES button

**Progress bar:** MUI LinearProgress renders with `role="progressbar"` by default. Ensure `aria-label="Quiz progress"`, `aria-valuenow={currentQuestion}`, `aria-valuemin="0"`, `aria-valuemax="20"` are set.

**Score announcement:** When the score increments, announce it to screen readers using an `aria-live="polite"` region: `"Score: 8 of 20 correct"`. This region is visually hidden but read aloud by screen readers.

**Screen transition announcements:** When transitioning from game to results, announce `"Game complete. You scored [n] out of 20."` via `aria-live="assertive"`.

**Drag mechanics:** The drag gesture is inherently inaccessible to screen reader users. The YES/NO buttons are the primary interaction method for accessibility. The drag mechanic is enhancement — not the only path.

### 12.5 Focus Management

When the results screen appears:
- Move focus to the score card heading (the "You scored" text) using `useEffect` + `ref.current.focus()`
- This is necessary because the game screen has been replaced by results — without focus management, keyboard users may find their focus lost in the DOM

When "Play Again" is clicked:
- Move focus to the trivia card or the first interactive element (NO button) on the new game screen

When "View Leaderboard" is clicked:
- Move focus to the leaderboard heading

### 12.6 Reduced Motion

As specified in Section 5.3, `useReducedMotion()` gates all non-essential animations. The core functionality (swipe, commit, score update) works identically — only the visual flourishes are removed. This includes:
- No card rotation during drag (card moves horizontally but stays flat)
- No exit animation (card disappears instantly)
- No score count-up on results (final value shown immediately)
- No leaderboard row stagger (all rows appear simultaneously)
- Flash overlays are replaced by a simple border color change on the card for a single frame

---

## 13. Microcopy

### 13.1 Welcome / Intro Text

When the user first visits `/trivia`, before the game begins, display:

**Heading:** "Daily Swipe Trivia"
**Subheading:** "20 questions. Movies and TV from the 90s to today."
**Body:** "Swipe right for YES, swipe left for NO. Answer all 20 to see your score."
**CTA button:** "Start Playing"

A new game auto-starts on page load without an intro screen in v1. The intro screen is deferred to v2 when a daily limit (one game per day) is enforced.

### 13.2 Score Messages by Tier

| Score range | Percentage | Message |
|-------------|------------|---------|
| 19-20 | 95–100% | "Cinema Genius!" |
| 16-18 | 80–90% | "Certified Cinephile" |
| 13-15 | 65–75% | "Film Enthusiast" |
| 10-12 | 50–60% | "Getting There" |
| 6-9 | 30–45% | "Keep Watching" |
| 0-5 | 0–25% | "The Credits Are Rolling" |

Message typography: `body1, fontStyle: 'italic', color: text.secondary`. The tone is warm and non-judgmental across all tiers — the lowest score gets a wry movie reference rather than a negative judgment.

### 13.3 Button Labels

| Context | Label |
|---------|-------|
| Start game | "Start Playing" |
| Restart from results | "Play Again" |
| Restart from leaderboard | "Play Again" |
| View scores | "View Leaderboard" |
| Back to results | "Back to Results" |
| NO answer button | "NO" (with CloseIcon) |
| YES answer button | "YES" (with CheckIcon) |

All button labels follow the existing app convention of `textTransform: 'none'` (set globally in the theme's MuiButton override).

### 13.4 Progress Text

| Element | Format |
|---------|--------|
| Question counter | "Question [n] of 20" |
| Score | "Score: [n]" |
| Progress bar aria-label | "Quiz progress, question [n] of 20" |

### 13.5 Leaderboard Column Headers

| Column | Header text |
|--------|-------------|
| Rank | "#" |
| Username | "Player" |
| Score | "Score" |

Header row: `typography: caption, color: text.secondary, fontWeight: 600, textTransform: uppercase, letterSpacing: 0.08em`. This matches the visual pattern used for section headers in the existing Feedback and Polls tabs.

### 13.6 Swipe Hint Text

First time (shown until first swipe completes):
`"← Swipe left for NO   Swipe right for YES →"`

Color: `text.disabled`. After first swipe, this line disappears via `opacity: 0` transition and is not shown again for the session.

### 13.7 Empty / Error States

**No questions loaded (API unavailable):**
```
Heading: "Trivia unavailable"
Body:    "We couldn't load today's questions. Check back later."
Button:  "Try Again"  (retries the fetch)
```

**Mid-game data error (question fails to load):**
```
Inline: Skip the failed question silently, advance to the next. Deduct from total if < 20 questions available. Show:
"Note: Some questions were unavailable. Your score is out of [actual count]."
```

---

## 14. Screen Transitions

### 14.1 Game → Results

**Trigger:** User answers the 20th question (commit action completes).

**Sequence:**
1. The 20th card exits with the standard commit animation (280ms).
2. The 300ms post-commit pause begins.
3. At ~200ms into the pause, begin fading out the game screen content (card stack, buttons) with `opacity: 0, y: -16` over 200ms.
4. At 300ms, the results screen content fades in with `opacity: 0, scale: 0.92 → 1.0` spring animation.
5. Announce "Game complete" via aria-live (see Section 12.4).
6. Focus moves to the results score card heading.

There is no URL change. The route stays at `/trivia`. The game state variable transitions from `'playing'` to `'results'`.

### 14.2 Results → Leaderboard

**Trigger:** User clicks "View Leaderboard".

**Sequence:**
1. Results screen slides out to the left (`x: -32, opacity: 0`) over 220ms.
2. Leaderboard slides in from the right (`x: 32, opacity: 0 → 0, 0`) over 260ms.
3. Leaderboard rows stagger in as described in Section 5.2.
4. Focus moves to the leaderboard heading.

No URL change. State transitions to `'leaderboard'`.

### 14.3 Leaderboard → Results (Back)

A "Back to Results" text link (or `← Back` link button) appears at the top of the leaderboard. Clicking it:
1. Leaderboard slides out to the right.
2. Results slides back in from the left.
3. Focus returns to the score card heading.

Browser back button behavior: Since no URL changed, the browser back button navigates away from `/trivia` entirely (to whatever route the user came from). This is acceptable in v1. In v2, URL hash state (`#results`, `#leaderboard`) could enable browser-history-integrated navigation.

### 14.4 Any Screen → Play Again

When "Play Again" is clicked from either results or leaderboard:
1. Current screen fades out (`opacity: 0`) over 200ms.
2. New game state initializes (new question set, score reset to 0).
3. Game screen fades in with the card stack entrance stagger.
4. Focus moves to the NO button (first interactive element in the game).

### 14.5 Integration with Existing App Navigation

The trivia game is a full-page experience within the existing `LayoutShell`. The `Header` (AppBar + hamburger drawer) and `ModeSwitcher` are rendered by `LayoutShell` — they appear on the trivia page exactly as on every other page.

`ModeSwitcher` correctly renders `null` on `/trivia` because the `shouldShowTabs` check only passes for `/theater` and `/streaming` pathnames. No changes needed.

If the user opens the hamburger drawer mid-game and navigates to another route, the game state is lost. This is acceptable behavior in v1 — the game is not persisted across navigations. In v2, `sessionStorage` could preserve mid-game state across navigation interruptions.

The `DetailDrawer` (movie detail panel) is rendered by `LayoutShell` globally. On the trivia page, no movie IDs are selected via `DetailDrawerContext`, so the drawer remains closed. No interaction conflict exists.

---

## 15. Design Rationale

### 15.1 Why This Layout Works for Mobile-First

The game screen uses a single-axis layout (vertical stacking: header → score → card → buttons). This works at 375px because:

1. The card is the dominant visual element and occupies ~60% of the viewport height. It receives visual hierarchy through size, shadow, and isolation — nothing competes with it.
2. The score row is minimal (a single line of text plus a thin bar). It provides game context without visual noise.
3. The YES/NO buttons sit below the card in the natural reach zone on a phone held in one hand. Thumb access does not require repositioning.
4. No horizontal scrolling is required at any breakpoint — all content is vertically stacked.
5. The card stack uses `position: absolute` within a fixed-size container, preventing layout shift when cards transition.

For tablet and desktop, the layout stays narrow (max-width ~480px) and centered. The trivia game does not attempt to fill a 1280px screen — it respects the mobile-first form factor and presents itself as a contained interactive card in the center of the page. The dark background context of the full viewport reinforces the cinematic focus.

### 15.2 Why Framer Motion Over Alternatives

Three alternatives were considered:

**React Spring:** Similar capability to Framer Motion, but uses a hooks API that is slightly more complex for drag interactions. It does not have a direct equivalent to Framer Motion's `useDragControls` or the `drag` prop, meaning more custom imperative code would be needed. Since Framer Motion is already installed and used in 6+ existing components, using it here maintains consistency.

**CSS Transitions / Animations:** Cannot respond to real-time pointer position (drag tracking). A card that follows the finger cannot be implemented with CSS transitions alone — JavaScript must read pointer coordinates and update transform values. CSS transitions would be used for the exit animation but not for the interactive drag.

**GSAP:** Extremely capable but introduces a large new dependency (GSAP is not currently installed). It also requires a license for some features. Not appropriate for a feature addition to an existing project with an established animation stack.

Framer Motion's `useMotionValue` + `useTransform` pattern is specifically designed for gesture-driven interfaces where derived values (rotation from x position, overlay opacity from x position) must update at 60fps without touching React state. This is the optimal approach.

### 15.3 Why These Specific Thresholds

**80px commit distance:**
On a 375px screen, 80px represents ~21% of the screen width. In usability research on swipe-based card interfaces, commit thresholds between 15-25% of container width produce the best balance between accidental trigger prevention and deliberate interaction speed. Below 15%, accidental swipes are common. Above 25%, the interaction feels sluggish.

**500px/s velocity threshold:**
This corresponds to a touch duration of ~160ms for an 80px swipe — fast enough to be a deliberate flick, slow enough that it is not an impossible standard. Tinder uses approximately 400-600px/s; this spec targets the midpoint.

**15 degree max rotation:**
The card rotation creates the visual metaphor of picking up a physical card. Beyond 15 degrees, the rotation begins to obscure content (the statement text becomes hard to read when heavily angled) and can cause motion discomfort on devices with vestibular sensitivities. 15 degrees is the empirical sweet spot established across major swipe-card apps.

**300ms post-commit pause:**
This is the minimum perceptible duration for a visual feedback flash. Shorter than 200ms, the flash is too quick to consciously register. At 300ms, users can see the green/red feedback and associate it with their action before the next card appears. Longer than 400ms starts to feel laggy and breaks the game rhythm.

### 15.4 How This Integrates with the Existing Dark Theme

The trivia card surface uses `rgba(20, 20, 20, 0.95)` with `backdropFilter: blur(12px)` — identical to `MuiPaper` card styling throughout the app (`alpha('#141414', 0.85)` + blur). The card feels native because it uses the same material treatment.

Netflix red (`#e50914`) is used exclusively for the NO direction and the primary buttons — consistent with how the color functions throughout the app (primary actions, active states, hover borders). This avoids introducing new color semantics that conflict with existing usage.

The green (`#22c55e`) for the YES direction is the only new color in the system. It does not conflict with any existing color usage in the app because the existing theme has no success/positive color token. Green is universally understood as "yes/correct" without cultural ambiguity in the movie trivia context.

The cinematic atmosphere is maintained through:
- The heavy drop shadow on the card (dramatic, film noir-influenced depth)
- The backdrop blur (glassmorphism technique consistent with all Paper surfaces)
- The dark overlay and grain effects borrowed from the Hero component
- The font family ("Netflix Sans" when available) carrying the brand voice into the game

The leaderboard design directly mirrors the Feedback tab's post list structure — same row padding, same divider colors, same chip/badge patterns. A user who has used the Feedback tab will immediately recognize the leaderboard's visual language.

---

## Appendix A: Component Tree

```
TriviaPage (server component, src/app/trivia/page.tsx)
  └── TriviaTab (client, src/components/trivia/TriviaTab.tsx)
        ├── GameScreen (client, src/components/trivia/GameScreen.tsx)
        │     ├── ScoreProgressRow
        │     │     ├── ScoreDisplay
        │     │     ├── QuestionCounter
        │     │     └── TriviaProgressBar (MUI LinearProgress, themed)
        │     ├── CardStack
        │     │     ├── TriviaCard (active, z-index: 1)
        │     │     │     ├── PosterPlaceholder
        │     │     │     ├── TriviaCardContent
        │     │     │     ├── YesLabel (motion.div, opacity from x)
        │     │     │     ├── NoLabel (motion.div, opacity from x)
        │     │     │     └── ColorOverlay (motion.div, bg from x)
        │     │     └── TriviaCard (next question, z-index: 0, scale: 0.95)
        │     ├── AnswerButtons
        │     │     ├── NoButton (MUI Button, outlined)
        │     │     └── YesButton (MUI Button, contained green)
        │     └── KeyboardHint (hidden on touch devices)
        ├── ResultsScreen (client, src/components/trivia/ResultsScreen.tsx)
        │     ├── ScoreCard (Paper with score number, percentage, message)
        │     ├── LocalStatsRow (optional, from localStorage)
        │     ├── PlayAgainButton
        │     └── ViewLeaderboardButton
        └── LeaderboardScreen (client, src/components/trivia/LeaderboardScreen.tsx)
              ├── PeriodToggle (MUI ToggleButtonGroup: Today / All time)
              ├── LeaderboardHeader (column labels)
              ├── LeaderboardList
              │     └── LeaderboardRow (× 10, with current user highlight)
              └── PlayAgainButton
```

## Appendix B: Question Data Schema

Trivia questions should conform to the following shape. In v1, questions are served as a static JSON array bundled with the app or fetched from a new API route `/api/trivia`.

```typescript
interface TriviaQuestion {
  id: string                    // UUID
  statement: string             // The YES/NO statement to evaluate
  answer: boolean               // true = YES is correct, false = NO is correct
  title: string                 // Movie or TV show title
  year: number                  // Release year (1990-present)
  mediaType: 'movie' | 'tv'     // For the badge display
  posterPath?: string | null    // TMDB poster path (optional)
  difficulty?: 'easy' | 'medium' | 'hard'  // For future difficulty filtering
}
```

**Statement authoring guidelines:**
- Statements must be unambiguously true or false
- Statements should be phrased in present tense where possible: "This film was directed by..." not "Was this film directed by..."
- Avoid double negatives
- Maximum statement length: 120 characters (to fit 3 lines at 17px on mobile)
- Mix of "positive" (true) and "negative" (false) correct answers — approximately 50/50 split in the 20-question set
- Questions should span genres, decades (1990–present), and both movies and TV series

## Appendix C: Trivia Page Route Setup

The trivia route follows the same pattern as the existing `/feedback` page:

`src/app/trivia/page.tsx` — server component, no data fetching needed in v1, renders the client `TriviaTab`:

```typescript
import { TriviaTab } from '@/components/trivia/TriviaTab'

export default function TriviaPage() {
  return <TriviaTab />
}
```

`src/app/trivia/loading.tsx` — skeleton screen for the route load:
Renders the score row skeleton (two Skeleton text elements in a flex row) and a single rectangular Skeleton at card dimensions (`width: '100%', maxWidth: 360, height: 420, borderRadius: '16px', margin: '0 auto'`).

Add `'Trivia'` to the `menuItems` array in `Header.tsx`:
```
{ label: 'Trivia', path: '/trivia', icon: QuizIcon }
```

No API route needed in v1 if questions are bundled as static data in `src/data/triviaQuestions.ts`.

---

*End of UX Specification*
*Document: UX_SPEC.md — FreshTomatoes Daily Swipe Trivia*
