# Frontend Excellence Plan - Universal LLM Tokenizer

> Goal: make the already-strong brutalist UI feel buttery, alive, and premium - smooth animations everywhere, zero jank, zero dependencies, without breaking the design identity.

---

## 1. Current State Audit (verified against code)

Stack: zero-dependency vanilla HTML/CSS/JS - 2 pages (index.html landing, app.html app) - GitHub Pages - no build step - npm test (node:test).

### What is already good
- Strong, consistent brutalist identity (B/W + #FF2A2A, Archivo Black + Space Mono, hard borders/shadows, grain overlay)
- Light/dark theme with localStorage persistence (no FOUC - set in head)
- Lazy-loaded vocab data with loading hints; History-API router with pretty URLs
- Guided tour, hover token popover, ASCII hex hero, footer token ticker
- prefers-reduced-motion respected in 3 spots (ASCII scan, play button, ticker)

### Gaps (file:line verified)
| # | Issue | Where |
|---|-------|-------|
| 1 | No debounce - tokenizes + rebuilds DOM on every keystroke | app.js:576 |
| 2 | Full DOM teardown per keystroke - innerHTML wipe then rebuild of pills, highlights, mapping table, BPE steps | app.js:155, 272, 301, 483 |
| 3 | Tab switching is an instant snap - hidden class toggled, no transition between 6 views | app.js:757 |
| 4 | Token pills have no entrance animation and hover snaps - no transition on .token-pill | index.css:450-484 |
| 5 | Metrics do not animate - counts/cost swap instantly; context bar width has no transition | app.js:361-388 |
| 6 | Only 2 keyframes in the whole app (af-pulse, play-spin); ~17 transition/animation declarations total | index.css:795, 1020 |
| 7 | Battle table rows appear instantly - no stagger, no animated bars | app.js:503-549 |
| 8 | BPE merge steps are static - the best animation candidate in the product is frozen | app.js:482-498 |
| 9 | Guess game feedback pops instantly - no shake/pop/score count-up | index.css:1361-1377 |
| 10 | Landing page has zero entrance/scroll animations | index.html, landing.css |
| 11 | Fonts via @import (render-blocking) in both CSS files, duplicated with link tag in app.html | index.css:5, landing.css:1, app.html:14 |
| 12 | Mobile header will cramp - 6 tabs + 4 header buttons, no horizontal scroll/collapse | app.html:35-58 |
| 13 | Reduced-motion handled ad-hoc - needs one global guard | app.js:667, index.css:1023 |
| 14 | Copy/export feedback mutates button text via innerHTML + setTimeout | app.js:889-893 |

---

## 2. Motion Design Language - Mechanical Precision

Motion rules that keep the brutalist soul:
- Fast and hard, never bouncy. Durations 120-220ms. Easing: cubic-bezier(0.2, 0, 0, 1) (sharp out), steps(n) for mechanical/terminal moments.
- Transform and opacity only. Never animate width/top/left (exception: the context meter and battle bars - genuine progress bars).
- Red is the event color. Motion highlights flash --border-active (#FF2A2A), nothing else.
- Everything respects prefers-reduced-motion via one global kill-switch.
- Zero dependencies. CSS + ~60 lines of vanilla JS utils. No GSAP/Lottie.

### Motion tokens (add to :root in both CSS files)
```css
--dur-1: 120ms;  /* hovers, presses */
--dur-2: 180ms;  /* entrances, view swaps */
--dur-3: 320ms;  /* page/section reveals */
--ease-snap: cubic-bezier(0.2, 0, 0, 1);
--ease-out:  cubic-bezier(0.16, 1, 0.3, 1);
--ease-mech: steps(6, end);
```

### Global reduced-motion guard (top of both CSS files)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-delay: -1ms !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-delay: -1ms !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

Pattern per web.dev: 1ms durations + negative delays (not 0s) so `animationend`/`transitionend` events still fire and JS logic depending on them never breaks. Note: this CSS cannot stop rAF/WAAPI-driven motion - JS utilities must also check `matchMedia('(prefers-reduced-motion: reduce)')` themselves.

---

## 3. Phase 0 - Foundation (half day) - do first, everything builds on it

| Task | Detail |
|------|--------|
| P0.1 Motion tokens + keyframes library | Add --dur-*/--ease-* vars + keyframes: fade-up, pop-in, shake-x, flash-red, scanline, blink-caret to index.css and landing.css |
| P0.2 Global reduced-motion guard | Replace the 3 ad-hoc checks with the single global block above (web.dev pattern: 1ms duration + -1ms delay so animationend/transitionend still fire) |
| P0.3 JS animation utils in app.js | Shared const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches (CSS override cannot stop rAF-driven motion); debounce(fn, ms); animateCount(el, to, format) via requestAnimationFrame; stagger(nodes, cls) with animation-delay i*18ms, capped at ~40 items; all utils no-op when REDUCED |
| P0.4 Fix font loading | Delete both @import lines; use link rel=preconnect + stylesheet in both HTML heads (dedupes app.html double fetch) |
| P0.5 Toast system | showToast(msg) - brutalist black box, red left border, slides in bottom-right; replaces flashBtn() innerHTML hack for copy/export/share feedback |

Acceptance: fonts load non-blocking; all existing reduced-motion behavior unchanged; toast replaces button-text swap.

---

## 4. Phase 1 - Core App Smoothness (biggest perceived win, 1-2 days)

| Task | Detail |
|------|--------|
| P1.1 Debounce + rAF-batched input pipeline | input event -> debounce(updateTokenization, 60); wrap render calls in one requestAnimationFrame; keep existing refreshVersion guard |
| P1.2 Diff-based pill rendering | Key pills by token index; reuse unchanged DOM nodes, only append/remove the changed tail (typing usually appends). Full rebuild only on model/compare change |
| P1.3 Token pill entrance stagger | New pills get pop-in (scale 0.92 to 1 + fade, 140ms) with capped stagger; pill hover gets transition transform/box-shadow/background var(--dur-1) var(--ease-snap) (fixes the snap at index.css:477) |
| P1.4 Metric count-up tween | Token/word/char/cost values tween old to new over ~260ms via animateCount(); add aria-live=polite on the metrics bar |
| P1.5 Context meter motion | transition: width var(--dur-3) var(--ease-out) + warn/danger flash red once (flash-red 1x) |
| P1.6 Popover smoothing | token-popover: transition opacity/transform var(--dur-1), fade + 4px rise on show, cursor-follow with lerp on rAF |
| P1.7 Prompt-highlight hover sync | .prompt-hl-span.hovered gets smooth background transition + 2px lift (mirrors pill hover) |
| P1.8 Sticky header elevation | On scroll > 4px: thicken bottom border / add hard offset shadow, transitioned via --dur-1 |

Acceptance: paste a 5,000-word doc and the UI stays responsive; pills animate in on first render; counters visibly tween; hovers are smooth, never snappy.

---

## 5. Phase 2 - View Transitions and Navigation (1 day)

| Task | Detail |
|------|--------|
| P2.1 View Transitions API (progressive) | Per Chrome docs pattern: `if (!document.startViewTransition) { updateDOM(); return; }` then `document.startViewTransition(updateDOM)` — same-document transitions are Chrome 111+/Edge 111+/Firefox 144+/Safari 18+; customize via ::view-transition-old(root)/::view-transition-new(root) CSS animations; fallback = view fades/slides up 8px (fade-up, 180ms) |
| P2.2 Sliding tab indicator | Active tab gets a 3px red underline that slides between tabs (transform-based indicator, 160ms) instead of instant background swap |
| P2.3 Landing to app handoff | Opt into cross-document view transitions (Chrome 126+) with `@view-transition { navigation: auto; }` on BOTH pages, styled via ::view-transition-old/new for a red-wipe "boot" effect; keep the JS red-flash overlay (120ms) as the fallback for non-supporting browsers |
| P2.4 Mobile nav | Below 1024px: tabs become a horizontally scrollable row (overflow-x auto + scroll snap) with edge fade masks; header buttons wrap into their own row; verify at 360px |
| P2.5 Tour and modal polish | Tour card: slide+fade between steps; modal gets pop-in; complete focus trap + Escape handling |

Acceptance: switching all 6 tabs feels continuous; no layout shift; mobile nav usable at 360px.

---

## 6. Phase 3 - Landing Page Showpiece (1-2 days)

| Task | Detail |
|------|--------|
| P3.1 Hero live-tokenization effect | The hero title periodically slices: one word visually breaks into 2-3 token chips (colored boxes with fake IDs) then reassembles - CSS steps() + JS interval. Pure showmanship of the product core idea |
| P3.2 Scroll reveals | IntersectionObserver adds fade-up to feature cards, how-it-works, footer cols; feature cards stagger 60ms apart |
| P3.3 Feature card hovers | Hard shadow grows + card lifts translate(-2px,-2px), number badge flashes red - same language as app buttons |
| P3.4 Mini live demo on landing [STAR] | A one-line input in the hero that tokenizes right there (engines already loadable): 3 color chips + token count. Lowest-effort, highest-conversion addition |
| P3.5 CTA buttons | LAUNCH_TOKENIZER gets a sliding red fill (transform-based pseudo-element) + blink-caret after the label |
| P3.6 Scanline echo | Optional thin 2px red bar sweeping under the hero border (steps(60), 6s loop) - ties landing to the app hex hero |

Acceptance: Lighthouse perf >= 90 still (transform/opacity only); reduced-motion shows a static hero.

---

## 7. Phase 4 - Feature-Specific Animation (2 days)

| Feature | Animation plan |
|---------|---------------|
| BPE Step Engine [STAR] | Steps appear with stagger; in each step the merged pair flashes red and neighbors slide together (transform); add PLAY/PAUSE auto-advance (~600ms per step) + progress ticks (1/24). The killer demo of the whole product |
| BPE Trainer | After TRAIN: merge-counter ticks up per merge with micro red flash; result pills pop in |
| All-Models Battle | Rows fade-up stagger 20ms (capped); tokens column gets inline bars that tween from 0; trophy row pulses once on load |
| Guess Game | Wrong: shake-x on the phrase box + red border flash. Correct: box pops, score/streak count up, a red STAMP bar slides across. (No confetti - breaks brutalism) |
| Cost Lab file drop | Drag-over: marching-ants dashed border (background-position animation); analysis rows stagger in; cost bars tween |
| Learn Academy | Thumbnail hover zoom 1.03 + play button grows; duration chip slides in; read-cards get the same lift; glossary popover fades/rises |
| Script chips | A newly detected script chip pops in with a red flash - great aha moment for multilingual demos |

Acceptance: each feature has one signature motion moment; all capped and reduced-motion-safe.

---

## 8. Phase 5 - Performance and Accessibility Hardening (1 day)

| Task | Detail |
|------|--------|
| P5.1 Large-text rendering budget | Over 2,000 tokens: render first 500 pills + a SHOW ALL n TOKENS button; mapping table capped at ~200 rows with a note |
| P5.2 ASCII scanline | Replace the 900ms innerHTML rebuild (app.js:657-669) with a CSS-only sweep overlay on a static pre - cheaper and smoother |
| P5.3 will-change hygiene | Apply only during animations on pills container / view wrappers; remove after |
| P5.4 A11y pass | aria-live metrics; toast role=status; tab switch moves focus to the view heading; tour/modal focus traps; focus states survive animations |
| P5.5 Verification | npm test green; Lighthouse >= 90 perf / >= 95 a11y on both pages; manual reduced-motion audit; 360/768/1440 checks; 4x CPU-throttle smoke test |

---

## 9. Impact vs Effort Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| P0 foundation (tokens, utils, fonts, toast) | *** | 0.5d | NOW |
| P1.1-P1.3 debounce + diff render + pill motion | ***** | 1d | NOW |
| P1.4-P1.8 counters, meter, popover, header | **** | 0.5d | NOW |
| P2.1-P2.2 view transitions + tab indicator | **** | 0.5d | NEXT |
| P2.4 mobile nav | **** | 0.5d | NEXT |
| P3.4 mini live demo on landing | ***** | 0.5d | NEXT |
| P3.1-P3.3, P3.5 landing showpiece | *** | 0.5d | THEN |
| P4 BPE stepper animation | ***** | 0.5d | NEXT |
| P4 battle / game / cost-lab motion | *** | 0.5d | THEN |
| P4 learn/museum polish | ** | 0.5d | LATER |
| P5 hardening | *** | 1d | THEN |

Suggested commit sequence: feat(motion): foundation -> perf(app): debounced diff rendering -> feat(app): micro-interactions -> feat(nav): view transitions -> feat(landing): showpiece -> feat(features): BPE stepper + battle + game -> chore: a11y + perf hardening.

---

## 10. Guardrails - what NOT to do

1. No animation libraries (GSAP/Framer/Lottie) - the zero-dependency badge is a feature.
2. No rounded corners, soft shadows, or spring/bounce easing - kills the brutalist identity.
3. No confetti/sparkles - wrong tone for a dev tool.
4. Do not animate before fonts load (avoid FOUT flash-animation on first paint).
5. Cap staggers (max ~40 items, 18-20ms steps) - 5,000 pills must never cascade for 10 seconds.
6. Do not churn token pill colors per keystroke - legibility first.
7. Every animation dies gracefully under prefers-reduced-motion.

---

## 11. Definition of Done (per phase)

- [ ] npm test passes
- [ ] No CLS introduced; Lighthouse perf >= 90 on both pages
- [ ] prefers-reduced-motion verified manually (DevTools -> Rendering)
- [ ] 360 / 768 / 1440 widths spot-checked
- [ ] Works offline after first load (no new external deps)

---

## 12. Research Findings (web research done before implementation)

### What live research validated or changed
1. prefers-reduced-motion (web.dev, "Sometimes less movement is more" by Thomas Steiner):
   - Use 1ms durations with -1ms delays (not 0s/0.01ms) so animationend/transitionend handlers still fire; pages depending on those events do not break.
   - CSS overrides cannot stop Web Animations API / requestAnimationFrame motion. Our JS-driven effects (count-up, stagger, BPE autoplay, ASCII interval) must check the media query in JS too. Partial precedent already exists at app.js:667.
2. View Transitions API (developer.chrome.com/docs/web-platform/view-transitions):
   - Same-document: document.startViewTransition(cb), Chrome 111+ / Edge 111+ / Firefox 144 / Safari 18; feature-detect with the documented fallback pattern.
   - Cross-document (MPA, our landing-to-app case): Chrome 126+, opt in with @view-transition { navigation: auto; } on both pages - a native replacement for the old JS-only handoff idea.
   - Transitions are powered by CSS animations; customize via ::view-transition-old/new pseudo-elements.
3. CSS transitions craft (Josh Comeau, An Interactive Guide to CSS Transitions):
   - Animate transform (translate) rather than layout properties like margin/top - compositor-friendly, avoids layout thrash.
   - Micro-interaction durations in the 150-250ms band; ease-out entrances feel natural.
   - Respect prefers-reduced-motion (transition: none) and remember motion accumulates: small polish moments add up to the whole feel.
4. Neo-brutalism ecosystem (neobrutalism.dev):
   - Current neo-brutalist component libraries are Tailwind/shadcn-based and advertise WAI-ARIA accessibility - accessibility-first is idiomatic for the style, not in conflict with it.
   - Hover = press into the page (translate + hard shadow collapse) is the idiomatic interaction; our existing .preset-btn language is already on-trend - extend it, do not replace it.
5. Brutalism roots (Wikipedia, Brutalist architecture):
   - Architectural brutalism = exposed structure, raw materials, monochrome palette, geometric forms. Our mechanical motion language (steps(), hard stops, red event color) is the web equivalent of exposed structure - keep it as the guiding metaphor.

### Canonical token values from major systems (their sites are JS-locked; values from their published token specs)
- Material 3: durations 50-1000ms in bands (short 50-200ms small UI, medium 250-400ms larger areas); standard easing cubic-bezier(0.2, 0, 0, 1); emphasized-decelerate cubic-bezier(0.05, 0.7, 0.1, 1) entrances; emphasized-accelerate cubic-bezier(0.3, 0, 0.8, 0.15) exits.
- Material 2 / MDC: standard cubic-bezier(0.4, 0, 0.2, 1); decelerate cubic-bezier(0, 0, 0.2, 1); accelerate cubic-bezier(0.4, 0, 1, 1); ~100-300ms by surface size.
- IBM Carbon: productive easing for UI state changes vs expressive for entrances; duration scale ~70ms (fast-01) to ~540ms (slow-03); product UI lives in the fast, productive band.
- Consensus: 100-300ms micro-interactions, ease-out entrances, ease-in exits, transform/opacity only, reduced-motion support mandatory. Our --dur-1 120ms / --dur-2 180ms / --dur-3 320ms tokens sit inside every system recommended bands - plan tokens stay as-is.

### Sources
- web.dev/articles/prefers-reduced-motion
- developer.chrome.com/docs/web-platform/view-transitions
- joshwcomeau.com/animation/css-transitions/
- neobrutalism.dev
- en.wikipedia.org/wiki/Brutalist_architecture (roots of the style)
- Attempted but JS-locked or moved at research time: m3.material.io, developer.apple.com HIG (motion), carbondesignsystem.com (restructured), polaris.shopify.com, awwwards/wikipedia web-brutalism articles
