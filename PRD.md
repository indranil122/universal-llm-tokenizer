# PRD — Universal LLM Tokenizer & Visualizer

> **Product:** Universal LLM Tokenizer & Visualizer  
> **Repo:** `indranil122/universal-llm-tokenizer` — https://github.com/indranil122/universal-llm-tokenizer  
> **Live:** https://indranil122.github.io/universal-llm-tokenizer/  
> **Version:** 2.0  
> **Date:** 2026-08-26  
> **Status:** Approved — In Development (Shipped to `main`, GH Pages live)  
> **Author:** Indranil + Muse Spark (OpenCode)  
> **Stack:** Vanilla JS, 0 dependencies, 0 servers, 100% client-side

---

## 1. Executive Summary

A **zero-dependency, fully client-side** visualizer that shows — live, token-by-token, with byte-exact IDs — how 24 frontier LLM tokenizers (GPT-5.6, Claude Fable 5, Gemini 3.1, Llama 4, Kimi K3, Qwen, DeepSeek, Cohere, Mistral, Grok, BERT) turn human text into the subword IDs models actually see. Built to make tokenization *visible* for learners and *actionable* for developers (cost, context-window, prompt optimization). Ships with an embedded Learn Academy (8 in-browser YouTube facades + curated reading), a 6-exhibit Quirks Museum, a Guess-the-Tokens game, a Cost Lab, a Train-Your-Own-BPE laboratory, and a guided tour. Designed in a brutalist editorial system (`index.css` + `landing.css`, `Archivo Black` + `Space Mono`, `#FF2A2A` accent).

The product's unfair advantage: **11 byte-exact vocabulary files are embedded** and verified against the official `tiktoken` runtime (`o200k_base`, `cl100k_base`, `p50k_base`, `o200k_harmony`, `qwen3`, `qwen35`, `cohere`, `llama3`). Everything else is an honest, clearly-labelled approximation.

---

## 2. Problem Statement

| Actor | Pain |
|---|---|
| **Learner** | Tokenization is invisible. Text goes into an API and tokens come out — no intuition for why English is cheap, Hindi is 5–10× more expensive, or why `strawberry` breaks letter-counting. Available explainers are videos/docs with no playground. |
| **Developer** | Every cost estimate, context-window calculation, and prompt-optimization decision depends on tokens. Vendor tokenizer pages are single-vendor, require network calls, don't show byte/hex/character-range inspectors, don't compare models, and don't export. |
| **Educator** | Teaching BPE/WordPiece/SentencePiece without a live, inspectable artifact is abstract. Students need to *see* merges, not read about them. |

**Opportunity:** One URL that (a) tokenizes instantly while you type, (b) across every model you care about, (c) with IDs you can trust, (d) next to the best free courses that explain *why* — and that you can share as a permalink.

---

## 3. Goals & Objectives

### 3.1 Product Goals
1. **Make tokenization tangible** — every keystroke → visible tokens, in <50 ms.
2. **Be the most complete open tokenizer reference** for Aug 2026 — 24 models, 11 exact encodings, 4 engines.
3. **Teach while you play** — Learn Academy + Museum + Game turn visitors into repeat users.
4. **Be useful in production workflows** — cost lab, shareable permalinks, copy-as-code, JSON/CSV exports.
5. **Stay radically simple to run and contribute to** — `python -m http.server`, `npm test`, no build.

### 3.2 Business / Growth Goals
- Reach **1k GitHub stars** within one Hacktoberfest cycle; sustain ≥10% MoM star growth.
- Rank top-3 for `llm tokenizer visualizer`, `tiktoken playground`, `Qwen tokenizer online`.
- 40% of sessions touch ≥2 tabs; 15% use an export/share action (retention proxy).

### 3.3 Non-Goals (this release)
- No backend, no auth, no database, no analytics warehouse.
- No model inference / generation — tokenization only.
- No user accounts, comments, or cloud-saved history (localStorage only).
- No native iOS/Android apps (PWA is a stretch goal, not v2).

---

## 4. Target Audience & Personas

| Persona | Who | Jobs-to-be-Done | Must-have moment |
|---|---|---|---|
| **Aarav — CS sophomore** | Learning LLMs via Karpathy/3Blue1Brown | "I want to *see* BPE merges and why `.DefaultCellStyle` is one token." | Watches embedded video → trains own BPE → loads museum exhibit → *aha* |
| **Priya — indie AI dev** | Ships prompts to 3 vendors, watches costs | "Will this system prompt fit in context? What's cheapest?" | Pastes real prompt → All-Models Battle sorted by cost → exports CSV for budgeting |
| **Marco — platform engineer** | Evaluates Qwen vs Cohere for multilingual product | "How badly does Arabic explode vs English on each tokenizer?" | Drops a `.md` file in Cost Lab → compares Qwen3.5 exact vs Cohere exact → shares permalink with team |
| **Dr. Chen — educator** | Teaches NLP/IR | "I need a live demo that works offline in a lecture hall." | Opens Guess game → runs 3 rounds with class → loads strawberry exhibit |

Secondary: researchers benchmarking token efficiency; PMs estimating context budgets; Hacktoberfest contributors looking for first PRs.

---

## 5. User Journeys

### 5.1 First-visit learner (guided)
Landing → `LAUNCH_TOKENIZER` → Guided tour (5 steps, auto-starts once, skippable, stored as `localStorage["tokenizer-tour-v1"]`) highlights editor → token pills → model dropdown → share/export → Learn tab → Tour ends → user explores museum exhibit → playground.

### 5.2 Developer cost check
Playground → pastes production prompt (or drops file in Cost Lab) → All-Models Battle / Cost Lab table → sorts by cost/context% → `COPY PY` tiktoken snippet or `JSON` export → `SHARE LINK` (`?d=` payload) pasted to teammate → teammate opens permalink → state restores exactly.

### 5.3 Classroom game
`GUESS` tab → sees phrase ("नमस्ते दुनिया") → guesses count for GPT-5.6 → feedback shows correct count + pills → streak increments → `NEXT ROUND`.

### 5.4 Deep-link / share
User receives `.../playground?d=<b64url>` or pretty `.../learn` → router resolves via `?d=` / `?tab=` / pretty segment / legacy `#d=` / `sessionStorage["tokenizer-route"]` (404 fallback) → correct tab + text + model restored, no flash.

---

## 6. Functional Requirements

### 6.0 Navigation & Routing
| ID | Requirement | Acceptance |
|---|---|---|
| FR-NAV-01 | Header tabs: `[ LIVE PLAYGROUND ]` `[ COMPARE MODELS ]` `[ BPE STEP ENGINE ]` `[ ALL MODELS ]` `[ GUESS ]` `[ LEARN ]` — single active state, brutalist styling | Clicking a tab switches the sole visible view; active tab has filled background |
| FR-NAV-02 | History-API routing with **real path segments** — `.../playground`, `/compare`, `/bpe`, `/battle`, `/guess`, `/learn` | `pushState` on tab switch; `popstate` restores view; address bar shows pretty path |
| FR-NAV-03 | **404.html fallback** for GitHub Pages pretty deep links | Direct load of `.../learn` lands on `app.html` via `sessionStorage["tokenizer-route"]` hand-off; no hash |
| FR-NAV-04 | Query & legacy compat: `?tab=<seg>`, `?d=<b64url payload>`, `#learn`, `#d=` all resolve | Old shared links continue to work |
| FR-NAV-05 | Landing CTAs & footers use `?tab=learn` links; in-app navigation upgrades to pretty paths | No broken links on GH Pages or local `python -m http.server` |

### 6.1 Live Playground (core)
| ID | Requirement | Acceptance |
|---|---|---|
| FR-PG-01 | Textarea `#promptInput` with highlight backdrop `#highlightBackdrop` — real-time tokenization on `input` | Typing re-renders pills, highlights, matrix, metrics, chips within 50 ms for ≤2k chars |
| FR-PG-02 | Model dropdown `#modelSelect` (24 options, 12 optgroups) — default `gpt-5-6`, active key stored in `activeModelKey` | Changing model re-tokenizes; exact models lazy-load `tokenizers/data/<encoding>.js` (~0.7–9 MB) with `⏳ Loading...` hint |
| FR-PG-03 | Token pills `#tokensDisplayBox` + bar flip `#viewToggle` | Pills show `displaySubword` + `token-id-badge`; hover syncs highlight in editor + shows `#tokenPopover` (ID, hex, UTF-8 bytes, char range) |
| FR-PG-04 | `#compareContainer` + `#compareModelSelect` — side-by-side second model when Compare tab active | Compare pills render independently; both tokenizers respect exact vs approximate routing |
| FR-PG-05 | Metrics bar: total tokens, words, chars, efficiency ratio, est. cost (1M), context-window meter | Values update live; `tabular-nums`; correct per `model.costPer1M` and `contextWindow` |
| FR-PG-06 | Script chips `#scriptChips` | Detects Devanagari/CJK/Arabic/Emoji etc. present in input |
| FR-PG-07 | Word→Token breakdown matrix `#mappingTableBody` | Each prompt word → its tokens + count |
| FR-PG-08 | Presets (`[ CODE ]` `[ MULTILINGUAL ]` `[ EMOJIS ]` `[ NUMBERS ]` `[ SYSTEM TAGS ]`) | One click loads curated text; `SolidGoldMagikarp` included |

### 6.2 ASCII / Hex Hero Artwork (app page only)
| ID | Requirement |
|---|---|
| FR-ART-01 | `section.ascii-hero` at top of `main.brutalist-wrapper` — `<pre id="asciiArt">` spells **TOKENS** in 5×7 pixel font where lit cells are the letter's own UTF-8 hex (`T=0x54`, `O=0x4F`, `K=0x4B`, `E=0x45`, `N=0x4E`, `S=0x53`), dim cells `··`. Right panel: kicker, caption, hex dump of `UNIVERSAL LLM TOKENIZER` (`#asciiDump`), stat chips. |
| FR-ART-02 | Slow scanline sweep highlights one row band every 900 ms; respects `prefers-reduced-motion` and pauses when `document.hidden`. No external assets. |

### 6.3 Share, Copy-as-Code, Export
| ID | Requirement |
|---|---|
| FR-SHARE-01 | `[ 🔗 SHARE LINK ]` (`#btnShareLink`) builds `BASE_PATH + "playground?d=" + b64u(JSON.stringify({t, m}))` (UTF-8-safe `TextEncoder` → `btoa` → base64url), `replaceState`s the URL, copies to clipboard (with `execCommand` fallback), flashes `[ ✓ COPIED! ]`. |
| FR-CODE-01 | `[ 🐍 COPY PY ]` (`#btnCopyPy`): if `config.exact` → `import tiktoken; enc = tiktoken.get_encoding("<pat>"); enc.encode(...)` snippet with expected `ids` comment; else literal `ids = [...]` + honest approximation note. |
| FR-EXP-01 | `[ { } JSON ]` / `[ ▦ CSV ]` download every token (`i, text, id, bytes, hex, start, end, type`) as `tokens-<modelKey>.json` / `.csv`. |

### 6.4 Cost Lab — File Drop Analyzer
| ID | Requirement |
|---|---|
| FR-COST-01 | `section#fileDropSection` with `#fileDropZone` (dashed, `dragging` state, click→`#fileInput`, keyboard Enter/Space) |
| FR-COST-02 | On file (≤2 MB text): reads via `FileReader.readAsText`; computes `words, lines, KB`; tokenizes across all *already-loaded* exact models (never forces big downloads) + all approximate models; renders `#fileAnalysisWrap` battle-style table sorted by tokens (🏆 on cheapest), with chars/token, est. cost, context%; `[ USE THIS TEXT IN PLAYGROUND ]` loads file text into editor |

### 6.5 All-Models Battle
| ID | Requirement |
|---|---|
| FR-BATTLE-01 | `#battleView` / `#battleTableWrap` — pre-loads all exact vocabularies in parallel, tokenizes input across every model, sorts by count, shows EXACT badges, trophy on winner, click row → sets `activeModelKey` / `modelSelect.value` and switches to playground |

### 6.6 BPE Step Engine
| ID | Requirement |
|---|---|
| FR-BPE-01 | `#bpeStepsContainer` — `tokenizer.getMergeSteps(text)` visualization: raw text → char/byte split → ranked merges |
| FR-BPE-02 | **Train-Your-Own-BPE Lab** (`#trainCorpus`, `#trainMerges`, `#btnTrainBPE`, `#trainBPEOutput`, `#encodeSample`): pure-JS trainer — `TextEncoder` bytes → 256 base vocab → greedy most-frequent-pair merges (cap corpus 6000 chars, max 200 merges); shows per-merge cards (`MERGE #n — PAIR [x]+[y] seen N× → id Z = "…"`) and compression ratio; sample encoder applies learned merges sequentially and renders result pills |

### 6.7 Guess-the-Tokens Game
| ID | Requirement |
|---|---|
| FR-GUESS-01 | `[ GUESS ]` tab (`#guessView`): scorebar (`#gRound`, `#gScore`, `#gStreak`, `#gBest` persisted as `localStorage["guess-best"]`), phrase display (`#gPhrase`), numeric input (`#gInput`), `GUESS` / `NEXT ROUND` buttons, feedback (`#gFeedback` with verdict, actual count, mini pills via `renderTokenPills`) |
| FR-GUESS-02 | 24-phrase shuffled deck; scoring model fixed to `gpt-5-6` (exact `o200k_base`); `ensureLoaded` before first round |

### 6.8 Learn Academy
| ID | Requirement |
|---|---|
| FR-LEARN-01 | `#learnView`: intro card + 4 glossary tooltips (`BPE`, `SUBWORD`, `VOCABULARY`, `CONTEXT WINDOW`) — CSS `::after` on `[data-def]` |
| FR-LEARN-02 | **Museum** (`.museum-grid`, 6 cards `data-exhibit`): strawberry, trailing-space, SolidGoldMagikarp, non-English tax, number slicing, ZWJ emoji — `[ LOAD IN PLAYGROUND ]` sets `promptInput.value` + `activeModelKey` + `switchTab("playground")` + smooth scroll |
| FR-LEARN-03 | **Video facades** (`.learn-video[data-yt]`): `hqdefault.jpg` thumb + brutalist `▶` play button + duration badge + `↗` external link; click injects `youtube-nocookie.com/embed/<id>?autoplay=1&rel=0` iframe *only then* (zero third-party JS until play); keyboard Enter/Space; CTA flips to `// NOW PLAYING` |
| FR-LEARN-04 | Reading grid (8 cards, plain `<a>` links): minbpe, fast.ai chapter, HF Course ch.6, OpenAI tokenizer, tiktoken, Illustrated Transformer, LLM Visualization, OpenAI Cookbook |

### 6.9 Guided Tour & Glossary
| ID | Requirement |
|---|---|
| FR-TOUR-01 | `#tourOverlay` + `#tourCard` (5 steps: editor → pills → model dropdown → share/export → Learn tab), `localStorage["tokenizer-tour-v1"]` once-only auto-start (900 ms delay), `[ ? TOUR ]` (`#btnTour`) manual trigger, `NEXT`/`SKIP`, `tour-highlight` outline, card positioned from `getBoundingClientRect` |

### 6.10 Theming & Polish
- Dark/light toggle (`#themeToggleBtnApp`, `#theme-toggle` on landing) persisted as `localStorage["tokenizer-theme"]`; CSS variables in `:root` / `[data-theme="dark"]`; grain overlay via `body::before` SVG turbulence; `::selection` red; square brutalist `::-webkit-scrollbar`; `scroll-behavior: smooth`; `tabular-nums` on metrics/battle; `text-wrap: balance` on headings; real transitions (`0.15s`/`0.25s`).

---

## 7. Supported Models & Tokenizer Truth Table

| Model key | Display name | Engine | Vocab | Context | Exact file | Status |
|---|---|---|---|---|---|---|
| `gpt-5-6` | GPT-5.6 Sol / Terra / Luna | BPE `o200k_base` | 200,000 | 400k | `o200k_base.js` (3.6 MB) | 🟢 Current — default |
| `gpt-5` | GPT-5 family | BPE `o200k_base` | 200,000 | 400k | `o200k_base.js` | 🟢 |
| `gpt-oss` | gpt-oss-120b / 20b | BPE `o200k_harmony` | 201,088 | 131k | `o200k_harmony.js` (3.7 MB, 1,090 harmony specials 199998→201087) | 🟢 |
| `gpt-4-1` | GPT-4.1 | BPE `o200k_base` | 200,000 | 1M | `o200k_base.js` | 🟡 |
| `gpt-4o` | GPT-4o / mini | BPE `o200k_base` | 200,000 | 128k | `o200k_base.js` | 🟡 |
| `gpt-4` | GPT-4 / 3.5 Turbo | BPE `cl100k_base` | 100,000 | 8k | `cl100k_base.js` | ⚪ |
| `gpt-3` | GPT-3 / GPT-2 / Codex | BPE `p50k_base` | 50,000 | 2,049 | `p50k_base.js` | ⚪ |
| `llama-4` | Llama 4 Scout / Maverick | Tiktoken BPE | 202,048* | 10M/1M | `llama3.js` (4.2 MB) — Llama 4 expands to 202,048, approximated with embedded Llama 3 128k file, labelled honestly | 🟢 |
| `llama-2` | Llama 2 / 1 | SentencePiece | 32,000 | 4k | — | ⚪ |
| `claude-fable-5` | Claude Fable 5 / Mythos 5 | Minimum-piece seg. (est. ~16.2k) | ≈16,200 | 1M | — | 🟢 |
| `claude-opus-5` | Claude Opus 5 | Minimum-piece seg. | ≈16,200 | 1M | — | 🟢 |
| `claude-sonnet-5` | Claude Sonnet 5 | Minimum-piece seg. | ≈16,200 | 1M | — | 🟢 |
| `gemini-3-1-pro` | Gemini 3.1 Pro / 3.5 Flash | SentencePiece Unigram | 256,000 | 1M | — | 🟢 |
| `gemini-3-pro` | Gemini 3 Pro / Flash | SentencePiece Unigram | 256,000 | 1M | — | 🟢 |
| `bert` | BERT | WordPiece | 30,522 | 512 | — | ⚪ |
| `deepseek-v4` | DeepSeek V4 Pro/Flash | Byte-fallback BPE | 129,280 | 1M | — | 🟢 |
| `kimi-k3` | Kimi K3 / K2.5 | Tiktoken BPE | 163,584 | 1M | — | 🟢 |
| `qwen-3-5` | Qwen 3.5 / 3.6 / 3.8 | Byte-fallback BPE | 248,320 | 256k→1M | `qwen35.js` (9.7 MB, 248,044 vocab) | 🟢 — **exact** (published file) |
| `qwen-3-coder` | Qwen3 / Coder | Byte-fallback BPE | 151,646 | 256k | `qwen3.js` (5.2 MB, 151,643 vocab) | 🟡 — **exact** |
| `glm-5` | GLM-5 / 5.2 | Byte-fallback BPE `glm5` | 154,856 | 1M | — | 🟢 |
| `minimax-m2-5` | MiniMax M2.5 / M2 | Byte-fallback BPE `minimax_m2` | 200,054 | ~200k | — | 🟢 |
| `mistral-large-3` | Mistral Large 3 | Tekken BPE | 131,072 | 256k | — | 🟢 |
| `grok-4` | Grok 4 / 4.5 / 4.6 | BPE (est. ~131k) | ≈131,072 | 256k–2M | — | 🟢 |
| `cohere-command-a` | Command A+ / A | BPE | 255,000 | 256k | `cohere.js` (9.0 MB, 255,000 vocab) | 🟢 — **exact** (official published file) |

**24 models · 4 engines · 11 byte-exact vocabularies · 0 servers.**  
Exact = `config.exact === true` + `tiktokenData` present in `window.TIKTOKEN_DATA`; vocabulary sizes verified by `test/tokenizer.test.js: "exact vocabularies have the published sizes"`.

Cost defaults (`costPer1M.input`): Sol 5.00, gpt-oss 0.10, GPT-4.1 2.00, DeepSeek 0.28, Kimi 0.60, Qwen 0.20, GLM 0.60, MiniMax 0.30, etc. (docs-accurate where published, conservative estimates otherwise — clearly labelled "EST. COST").

---

## 8. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | First paint (no model selected) | <800 ms on 3G |
| NFR-PERF-02 | Keystroke → re-render (≤2k chars) | <50 ms p95 on mid-range mobile |
| NFR-PERF-03 | Exact vocab lazy-load (largest 9.7 MB) | Streamed on demand; `Loading… ~X MB` hint |
| NFR-SIZE-01 | Initial HTML+CSS+JS (without vocabularies) | <200 KB gzipped |
| NFR-A11Y-01 | Keyboard, focus rings, ARIA labels, `prefers-reduced-motion` respected (ticker + artwork sweep pause) | WCAG 2.1 AA |
| NFR-SEC-01 | No data leaves the browser | No fetch on tokenization; `tokenize()` is pure |
| NFR-COMPAT-01 | Evergreen Chrome/Firefox/Safari + iOS Safari viewport (`100dvh` where applicable) | Graceful without JS → static landing |
| NFR-TEST-01 | `npm test` (node:test, 0 deps) guards dropdown↔config drift, exact byte-identity, vocab sizes, unicode round-trips | CI must pass on every PR |

---

## 9. Information Architecture & URL Design

```
 /                      → index.html (landing)
 /app.html              → app (default playground)
 /app.html?tab=learn    → learn (robust fallback, works on any host)
 /learn                 → learn (pretty History-API path, via 404.html)
 /playground?d=<b64url> → shared permalink (pretty: /playground?d=...)
 /404.html              → static-host SPA fallback — stashes intended segment
                           in sessionStorage["tokenizer-route"], redirects to app.html
```

Router lives in `app.js:BASE_PATH/ROUTES/routeFromLocation()/navigate()/popstate`.  
Permalink payload: `b64u(JSON.stringify({t: text, m: modelKey[, c: compareKey]}))` — base64url, UTF-8-safe via `TextEncoder`. Legacy `#learn` / `#d=` hashes still resolve.

---

## 10. UI / Visual Design

- **System:** Brutalist editorial — hard 2px borders, `6px`/`4px` offset shadows in `var(--border-color)`, square radii (`0px`), `Archivo Black` headings + `Space Mono` body/code.
- **Palette:** Light `#F4F4F0` / Dark `#050505`, accent `#FF2A2A`, muted `#555/#888`; token pills cycle 6 high-contrast chips.
- **Motion:** Real transitions (`0.15s`/`0.25s` ease), `transform`+`opacity` only; grain overlay (`body::before` SVG turbulence at 3% opacity); square scrollbar; scanline on ASCII hero.

Key surfaces:
- **Landing:** hero `clamp(3rem, 7.5vw, 9rem)` wordmark, 3-CTA grid (`LAUNCH_TOKENIZER` / `LEARN_ACADEMY` / `VIEW_SOURCE`), 4 feature cards, *How it actually works* section, **full-page mega footer** (animated token ticker + giant wordmark + 3 link columns + status bar with pulsing dot + `↑ TOP`).
- **App:** sticky header (logo + 6 tabs + `? TOUR` + theme toggle + GitHub), control bar (model selects + presets), 2-col tokenizer grid (editor + pills), export bar, metrics, scripts, Cost Lab dropzone, mapping table; hidden views for BPE (incl. trainer), battle table, guess game, learn academy.
- **App footer:** compact sibling — 4px red accent strip, brand + quick links + pulsing `ALL SYSTEMS LOCAL · © 2026 // MIT`.

---

## 11. Data & Engine Details

- **`tokenizers/tiktoken.js`** — byte-level BPE (merge-rank greedy, per-encoding `pat_str`, `(?i:...)` contraction groups, special tokens). Verified byte-identical to `openai/tiktoken` for `o200k_base`, `cl100k_base`, `p50k_base`, `o200k_harmony` (harmony = `o200k_base` ranks + 1,090 specials `199998→201087`), and via `llama3`/`qwen3`/`qwen35`/`cohere` HF BPE files.
- **`tokenizers/bpe.js`** — greedy longest-match BPE with byte-fallback (Claude, DeepSeek, Qwen-approx, Grok, GLM, MiniMax, Mistral).
- **`tokenizers/sentencepiece.js`** — SentencePiece with `▁`; **`tokenizers/wordpiece.js`** — WordPiece with `##`.
- **`tools/convert_vocab.js`** — converts `.tiktoken` (base64 lines) and HF `tokenizer.json` (BPE `vocab`+`merges`) into `tokenizers/data/*.js` (`{ranks, vocab, patStr, special}` with GPT-2 byte↔unicode mapping). Longest-regex heuristic for Cohere's `Sequence` pre-tokenizer.
- Lazy loading: `window.loadTiktokenData(name)` injects `<script src="tokenizers/data/<name>.js">`.

Every token exposes `{id, text, displaySubword, bytes, hexBytes, start, end, type}`.

---

## 12. Success Metrics

**North Star:** Weekly Active Tokenizers (WAT) — unique visitors who produce ≥1 tokenization.

| KPI | Instrumentation | Target (90 days) |
|---|---|---|
| WAT, sessions, tab depth (≥2 tabs) | `localStorage` counter or privacy-friendly analytics (e.g., Plausible) — no PII | 40% multi-tab sessions |
| Share/export conversion (share link / copy-py / JSON / CSV clicked) | Click handlers | 15% of sessions |
| Learn Academy video plays | Facade click → iframe inject | 25% of sessions |
| Guess game rounds played | `gState.round` | 10% of sessions, median 3 rounds |
| Museum exhibit loads | `museum-load` clicks | 20% of sessions |
| GitHub stars, forks, PRs | GitHub API | 1k stars; 20 merged PRs |
| SEO rank for `llm tokenizer visualizer` | Search Console | Top 3 |

---

## 13. SEO & Growth

- OG/Twitter meta (`og:title/description/image`, `social-preview.png`), `twitter:card`, `favicon.svg`.
- README is the repo's landing page: hero image, TOC, 10-second demo, comparison table, collapsible FAQ (SEO long-tail: "why can't LLMs count letters"), star-history chart, share-to-X/Reddit/LinkedIn buttons, Discussions link.
- `package.json` keywords: 25 terms (`tokenizer`, `tiktoken`, `gpt-5`, `qwen`, `cohere`, `kimi`, `hacktoberfest`, …).
- Repo topics (20, via `gh api PUT /topics`): `llm`, `tokenizer`, `tiktoken`, `bpe`, `gpt-5`, `claude`, `gemini`, `kimi`, `deepseek`, `qwen`, `developer-tools`, `data-visualization`, `machine-learning`, `vanilla-javascript`, `hacktoberfest`, etc. — live.
- `CONTRIBUTING.md`, `ISSUE_TEMPLATE/bug_report.md` + `feature_request.md`, CI badge — first-PR friendly.
- Virality mechanics: permalinks (every interesting tokenization is shareable), game/museum (screenshot bait).

---

## 14. Technical Architecture

```
index.html ──▶ landing.css ──┐
app.html ────▶ index.css  ───┤
            ┌─ tokenizers/vocabularies.js ── 24 model configs
            ├─ tokenizers/tiktoken.js ─────── exact engine
            ├─ tokenizers/bpe|wordpiece|sentencepiece.js
            ├─ tokenizers/data/*.js ───────── lazy-loaded vocabs
            └─ app.js ─────────────────────── controller, router, artwork,
                                              share/export, cost lab, game,
                                              museum, BPE trainer, tour
404.html ─── SPA fallback for pretty routes
tools/convert_vocab.js, compare_tiktoken.js, validate_tiktoken.js
test/tokenizer.test.js ── node:test, 0 deps, CI-gated
```

No framework, no bundler, no `node_modules`.  
Hosting: GitHub Pages (`indranil122.github.io/universal-llm-tokenizer`), `404.html` enables deep pretty URLs.

---

## 15. Privacy & Security

- **No backend, no cookies for tracking, no analytics PII.** Tokenization is pure and synchronous; file drops are `FileReader.readAsText` locally.
- YouTube facades use `youtube-nocookie.com` and only load the iframe on explicit click.
- No secrets in repo; `.gitignore` covers `tokenizers/data/raw/` (raw downloads are reproducible via `convert_vocab.js`).

---

## 16. Accessibility

- Semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`), `aria-label` on navs/dialogs, `role="button"` on dropzone, `tabindex="0"` on cards, visible `:focus-visible` rings (`3px solid #FF2A2A`), `prefers-reduced-motion` disables ticker sweep + ASCII scanline + play-button spin.

---

## 17. Internationalization

- Current: English-only, `text-transform: uppercase` globally with `text-transform: none` on prose.
- Roadmap: `i18n` of landing page (FR-LEARN stretch); script detection already covers Devanagari/CJK/Arabic/Emoji cost visibility.

---

## 18. Release Plan

| Milestone | Scope | Status |
|---|---|---|
| **v1.0** | 15 models, 4 engines, playground + battle + BPE steps — brutalist UI, GH Pages | ✅ Shipped |
| **v1.1** | Theme toggle, dark mode, landing polish | ✅ Shipped |
| **v2.0 — Learn & Trust** | 24 models, 7→11 exact vocabs (`qwen3`/`qwen35`/`cohere`/`o200k_harmony`), Learn Academy facades, model table refresh, README virality pass, repo topics + Discussions | ✅ Shipped (`3ff25ee`) |
| **v2.1 — Play & Utility** | Guess game, Quirks Museum, share permalinks (`?d=`), copy-as-code, JSON/CSV, Cost Lab, BPE trainer, guided tour + glossary, CI + CONTRIBUTING + issue templates | ✅ Shipped (`6aaed67`) |
| **v2.2 — Art & Routes** | ASCII hex self-portrait, History-API router with real paths + `404.html` fallback, hash→query migration | ✅ Shipped (this PRD) |
| **v2.3 — Polish (next)** | Demo GIF for README, PWA manifest + offline cache, `?tab=` pretty-link audit in footers, `CONTRIBUTING` screenshots | Planned |
| **v3.0 — Scale** | Gemma exact vocab (if SentencePiece pipeline added), Nova/Nemotron/Muse models, file lab multi-file + token histogram, i18n | Backlog |

---

## 19. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Vendor publishes breaking tokenizer change | Exact IDs drift | `tools/compare_tiktoken.js` re-validates against `tiktoken` npm; CI pins expected vocab sizes |
| Large vocabularies (9–10 MB) hurt mobile load | Slow battle/cost-lab | Lazy-load only on demand; Cost Lab never forces exact downloads; `~X MB` hint |
| YouTube embeds block or throttle facades | Learn Academy broken | Facade degrades to external `↗` link; `youtube-nocookie.com` + `rel=0` |
| Pretty routes 404 on hosts without fallback | Deep links break locally | `?tab=` query fallback works everywhere; `404.html` only needed on GH Pages |
| Scope creep (too many exact vocabs) | Bloat, maintenance | Gate: only HF BPE `.tiktoken`/`tokenizer.json` via existing converter; SentencePiece (Gemma) deferred |

---

## 20. Open Questions

1. Should `cohere.js` (9 MB) be code-split further or served with `content-encoding: br` on Pages?
2. Add Gemma 3 exact support — requires a SentencePiece Unigram converter (new engine path) — priority vs. Nova/Nemotron?
3. PWA offline cache for vocabularies — `CacheStorage` vs. `localStorage` size limits?
4. Star-history and share-button copy — final wording for X/Reddit virality posts?

---

## 21. Appendices

### A. File Map
```
PRD.md                          ← this document
README.md                       ← repo landing page (virality-optimized)
CONTRIBUTING.md                 ← contributor guide
404.html                        ← SPA fallback for pretty routes
index.html / landing.css        ← landing (hero + mega footer)
app.html / index.css / app.js   ← tokenizer app + router + artwork + all features
tokenizers/{vocabularies,tiktoken,bpe,wordpiece,sentencepiece}.js
tokenizers/data/{o200k_base,cl100k_base,p50k_base,llama3,qwen3,qwen35,cohere,o200k_harmony}.js
tokenizers/data/raw/            ← git-ignored sources (.tiktoken, tokenizer.json, registry.json)
tools/{convert_vocab,compare_tiktoken,validate_tiktoken}.js
test/tokenizer.test.js          ← 16 tests, CI-gated
.github/workflows/ci.yml        ← npm test on push/PR
.github/ISSUE_TEMPLATE/*.md
```

### B. Key Design Decisions (ADRs)
- **Vanilla JS, 0 deps** — keeps the repo forkable in one click and load-instant.
- **Brutalist editorial system** — hard borders + offset shadows + square radii; the visual identity *is* the brand.
- **History-API + 404.html** over hash routing — real URLs for shareability/SEO, with legacy hash compat.
- **Facade YouTube embeds** — privacy + performance; no third-party JS until play.

### C. Glossary
`BPE` — Byte-Pair Encoding. `Subword` — chunk between char and word. `Vocabulary` — fixed token list. `Context window` — max tokens per conversation. `Exact` — byte-identical to vendor's published tokenizer.

---

*End of PRD — v2.0 · 2026-08-26. Next review after v2.3 polish.*
