/**
 * Universal LLM Tokenizer & Visualizer - Main Controller
 * Handles real-time input tokenization, prompt word highlighting,
 * side-by-side model comparison, interactive BPE stepping, exact
 * tiktoken routing, token bars, context meter, script detection,
 * and the all-models battle table.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // Motion & A11y Foundation (FRONTEND_UX_PLAN.md Phase 0)
  // REDUCED: CSS kill-switches can't stop rAF-driven motion,
  // so JS utilities must check the media query themselves.
  // ==========================================
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // Tween a numeric counter element old -> new. Tracks el.__val as source of truth.
  function animateCount(el, to) {
    if (!el) return;
    const from = typeof el.__val === "number" ? el.__val : parseInt(String(el.textContent).replace(/[^\d.-]/g, ""), 10) || 0;
    el.__val = to;
    if (REDUCED || from === to) {
      el.textContent = to.toLocaleString();
      return;
    }
    if (el.__raf) cancelAnimationFrame(el.__raf);
    const dur = 260;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (p < 1) el.__raf = requestAnimationFrame(tick);
    };
    el.__raf = requestAnimationFrame(tick);
  }

  // Apply an entrance class with capped stagger delays (inline animation-delay).
  function stagger(nodes, stepMs, cap) {
    if (!nodes || !nodes.length) return;
    const step = stepMs || 18;
    const limit = cap || 40;
    nodes.forEach((el, i) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.animationDelay = Math.min(i, limit) * step + "ms";
      el.classList.add("anim-enter");
    });
  }

  // Brutalist toast: black box, red left border, slides in bottom-right.
  const toastStack = document.createElement("div");
  toastStack.className = "toast-stack";
  toastStack.setAttribute("aria-live", "polite");
  document.body.appendChild(toastStack);
  function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = msg;
    toastStack.appendChild(toast);
    if (!REDUCED) {
      requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("toast-on")));
      setTimeout(() => {
        toast.classList.remove("toast-on");
        setTimeout(() => toast.remove(), 220);
      }, 2200);
    } else {
      setTimeout(() => toast.remove(), 2200);
    }
  }

  // Model Instances
  const modelConfigs = window.TOKENIZER_VOCABS.models;
  let activeModelKey = "gpt-5-6";
  let compareModelKey = "llama-4";
  let activeTokenizer = null;
  let compareTokenizer = null;
  let viewMode = "pills"; // "pills" | "bars"

  // DOM Elements
  const promptInput = document.getElementById("promptInput");
  const highlightBackdrop = document.getElementById("highlightBackdrop");
  const tokensDisplayBox = document.getElementById("tokensDisplayBox");
  const modelSelect = document.getElementById("modelSelect");
  const compareModelSelect = document.getElementById("compareModelSelect");
  const compareContainer = document.getElementById("compareContainer");
  const compareTokensDisplayBox = document.getElementById("compareTokensDisplayBox");

  // Metrics
  const tokenCountElem = document.getElementById("tokenCount");
  const wordCountElem = document.getElementById("wordCount");
  const charCountElem = document.getElementById("charCount");
  const ratioCountElem = document.getElementById("ratioCount");
  const costEstimateElem = document.getElementById("costEstimate");
  const contextBar = document.getElementById("contextBar");
  const contextLabel = document.getElementById("contextLabel");
  const scriptChips = document.getElementById("scriptChips");
  const exactBadge = document.getElementById("exactBadge");

  // Mapping Table & Popover
  const mappingTableBody = document.getElementById("mappingTableBody");
  const tokenPopover = document.getElementById("tokenPopover");

  // Navigation Tabs
  const tabPlayground = document.getElementById("tabPlayground");
  const tabCompare = document.getElementById("tabCompare");
  const tabStepBPE = document.getElementById("tabStepBPE");
  const tabBattle = document.getElementById("tabBattle");
  const tabGuess = document.getElementById("tabGuess");
  const tabLearn = document.getElementById("tabLearn");

  const playgroundView = document.getElementById("playgroundView");
  const bpeStepView = document.getElementById("bpeStepView");
  const battleView = document.getElementById("battleView");
  const learnView = document.getElementById("learnView");
  const guessView = document.getElementById("guessView");
  const battleTableWrap = document.getElementById("battleTableWrap");
  const viewToggle = document.getElementById("viewToggle");

  // Current Tokens State
  let currentTokens = [];
  let currentCompareTokens = [];
  let refreshVersion = 0;

  // ==========================================
  // Tokenizer Construction (async for exact models)
  // ==========================================
  function configFor(key) {
    return modelConfigs[key] || modelConfigs["gpt-5"];
  }

  function dataLoaded(key) {
    const cfg = configFor(key);
    return !(cfg.exact && window.loadTiktokenData && !(window.TIKTOKEN_DATA && window.TIKTOKEN_DATA[cfg.tiktokenData]));
  }

  async function ensureLoaded(key) {
    const cfg = configFor(key);
    if (cfg.exact && window.loadTiktokenData && !(window.TIKTOKEN_DATA && window.TIKTOKEN_DATA[cfg.tiktokenData])) {
      await window.loadTiktokenData(cfg.tiktokenData);
    }
  }

  function createTokenizer(key) {
    const config = configFor(key);
    let tok;
    if (config.exact && window.TiktokenTokenizer && window.TIKTOKEN_DATA && window.TIKTOKEN_DATA[config.tiktokenData]) {
      // exact: real vocabulary (o200k/cl100k/p50k/llama3) — byte-identical to official tiktoken
      tok = new window.TiktokenTokenizer(Object.assign({}, config, { tiktokenData: window.TIKTOKEN_DATA[config.tiktokenData] }));
    } else if (key === "bert" || config.family && config.family.includes("WordPiece")) {
      tok = new window.WordPieceTokenizer(config);
    } else if (key.includes("gemini") || key === "llama-2" || config.family && config.family.includes("SentencePiece")) {
      tok = new window.SentencePieceTokenizer(config);
    } else {
      tok = new window.BPETokenizer(config);
    }
    tok._modelKey = key;
    return tok;
  }

  // ==========================================
  // Real-Time Tokenization & UI Sync
  // ==========================================
  async function updateTokenization() {
    const v = ++refreshVersion;
    const text = promptInput.value;

    // Build/replace the active tokenizer (async when exact data needs loading)
    if (activeTokenizer === null || activeTokenizer._modelKey !== activeModelKey) {
      if (!dataLoaded(activeModelKey)) {
        currentTokens = [];
        const cfg = configFor(activeModelKey);
        const sizes = { o200k_base: "3.6", o200k_harmony: "3.7", cl100k_base: "1.5", p50k_base: "0.7", llama3: "4.2", qwen3: "5.2", qwen35: "9.7", cohere: "9.0" };
        tokensDisplayBox.__rendered = [];
        tokensDisplayBox.innerHTML =
          `<div class="loading-hint">⏳ Loading exact tokenizer data (<code>${cfg.tiktokenData}</code>, ` +
          `~${sizes[cfg.tiktokenData] || "1"} MB) — one-time download…</div>`;
      }
      await ensureLoaded(activeModelKey);
      if (v !== refreshVersion) return;
      try { activeTokenizer = createTokenizer(activeModelKey); } catch (e) { activeTokenizer = createTokenizer("gpt-5"); }
    }

    // Tokenize active model
    let tokens = [];
    try { tokens = activeTokenizer.tokenize(text); } catch (e) { tokens = []; }
    currentTokens = tokens;

    // Compare model (only when the compare panel is visible)
    if (!compareContainer.classList.contains("hidden")) {
      if (compareTokenizer === null || compareTokenizer._modelKey !== compareModelKey) {
        await ensureLoaded(compareModelKey);
        if (v !== refreshVersion) return;
        compareTokenizer = createTokenizer(compareModelKey);
      }
      try { currentCompareTokens = compareTokenizer.tokenize(text); } catch (e) { currentCompareTokens = []; }
    }

    if (v !== refreshVersion) return;

    // Render everything (batched into one frame; input events are debounced)
    requestAnimationFrame(() => {
      renderTokenPills(tokensDisplayBox, currentTokens);
      renderPromptHighlights(text, currentTokens);
      renderMappingTable(text, currentTokens);
      updateMetrics(text, currentTokens);
      updateScriptChips(text);
      if (!compareContainer.classList.contains("hidden")) {
        renderTokenPills(compareTokensDisplayBox, currentCompareTokens);
      }
      updateBPESteps(text);
      updateExactBadge();
    });
  }

  // ==========================================
  // Render Token Pills / Bars
  // ==========================================
  function renderTokenPills(container, tokens) {
    container.__tokens = tokens;
    const CAP = 500;
    const list = container.__showAll ? tokens : tokens.slice(0, CAP);

    if (tokens.length === 0) {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">Type or paste text above to see tokens live...</span>`;
      container.__rendered = [];
      return;
    }

    // will-change hygiene: apply only during DOM mutation, remove after paint
    if (!REDUCED) {
      container.style.willChange = "transform";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { container.style.willChange = ""; });
      });
    }

    if (viewMode === "bars") {
      renderTokenBars(container, list);
      return;
    }

    container.classList.remove("bar-mode");

    // --- Diff rendering: reuse unchanged pills, only mutate the changed tail ---
    const prev = container.__rendered || [];
    const same = (a, t) => a.token.id === t.id && a.token.text === t.text && a.token.start === t.start;
    let reuse = 0;
    while (reuse < prev.length && reuse < list.length && same(prev[reuse], list[reuse])) reuse++;

    for (let j = reuse; j < prev.length; j++) prev[j].el.remove();
    if (reuse === 0) container.innerHTML = "";

    const frag = document.createDocumentFragment();
    let made = 0;
    const madeEls = [];
    for (let idx = reuse; idx < list.length; idx++) {
      const token = list[idx];
      const pill = document.createElement("div");
      const colorIndex = idx % 6;
      pill.className = `token-pill ${token.type === 'special' ? 'special-token' : ''}`;
      pill.dataset.color = colorIndex;
      pill.dataset.tokenIdx = idx;

      // Handle visible space & newline representation
      let displayText = token.displaySubword || token.text;
      displayText = displayText.replace(/\n/g, "\\n").replace(/\t/g, "\\t");

      pill.innerHTML = `
        <span>${escapeHtml(displayText)}</span>
        <span class="token-id-badge">${token.id}</span>
      `;

      // Entrance: pop-in with capped stagger (new pills only)
      if (!REDUCED && made < 48) {
        pill.style.animationDelay = made * 14 + "ms";
        pill.classList.add("pill-pop");
      }

      // Hover Interaction: Link to prompt editor substring
      pill.addEventListener("mouseenter", (e) => {
        pill.classList.add("hovered");
        highlightPromptRange(token.start, token.end);
        showPopover(e, token);
      });

      pill.addEventListener("mouseleave", () => {
        pill.classList.remove("hovered");
        clearPromptHighlights();
        hidePopover();
      });

      frag.appendChild(pill);
      madeEls.push(pill);
      made++;
    }
    container.appendChild(frag);

    const rendered = [];
    for (let j = 0; j < reuse; j++) rendered.push(prev[j]);
    for (let j = 0; j < madeEls.length; j++) rendered.push({ token: list[reuse + j], el: madeEls[j] });
    container.__rendered = rendered;

    // Overflow control for very large inputs
    const oldNote = container.querySelector(".tokens-overflow");
    if (oldNote) oldNote.remove();
    if (!container.__showAll && tokens.length > CAP) {
      const more = document.createElement("button");
      more.className = "preset-btn tokens-overflow";
      more.type = "button";
      more.textContent = `[ SHOW ALL ${tokens.length.toLocaleString()} TOKENS — FIRST ${CAP} RENDERED ]`;
      more.addEventListener("click", () => {
        container.__showAll = true;
        renderTokenPills(container, container.__tokens || tokens);
      });
      container.appendChild(more);
    }
  }

  function renderTokenBars(container, tokens) {
    container.classList.add("bar-mode");
    container.innerHTML = "";
    container.__rendered = []; // bars wipe pills — prevent stale reuse later
    const wrap = document.createElement("div");
    wrap.className = "token-bars";
    const maxBytes = Math.max.apply(null, tokens.map(t => (t.bytes && t.bytes.length) || 1));

    tokens.forEach((token, idx) => {
      const bar = document.createElement("div");
      bar.className = "token-bar";
      bar.dataset.color = idx % 6;
      bar.dataset.tokenIdx = idx;
      // width proportional to byte length — longer subwords = wider bars
      const w = Math.max(3, Math.round((((token.bytes && token.bytes.length) || 1) / maxBytes) * 100));
      bar.style.width = w + "%";
      bar.title = `${token.displaySubword || token.text}  (id ${token.id})`;

      bar.addEventListener("mouseenter", (e) => {
        bar.classList.add("hovered");
        highlightPromptRange(token.start, token.end);
        showPopover(e, token);
      });
      bar.addEventListener("mouseleave", () => {
        bar.classList.remove("hovered");
        clearPromptHighlights();
        hidePopover();
      });
      wrap.appendChild(bar);
    });

    container.appendChild(wrap);
    const oldNote = container.querySelector(".tokens-overflow");
    if (oldNote) oldNote.remove();
    if (!container.__showAll && container.__tokens && container.__tokens.length > 500) {
      const more = document.createElement("button");
      more.className = "preset-btn tokens-overflow";
      more.type = "button";
      more.textContent = `[ SHOW ALL ${container.__tokens.length.toLocaleString()} TOKENS — FIRST 500 RENDERED ]`;
      more.addEventListener("click", () => {
        container.__showAll = true;
        renderTokenPills(container, container.__tokens);
      });
      container.appendChild(more);
    }
  }

  viewToggle.addEventListener("click", () => {
    viewMode = viewMode === "pills" ? "bars" : "pills";
    viewToggle.textContent = viewMode === "pills" ? "▦ Token Bars" : "🧩 Token Pills";
    renderTokenPills(tokensDisplayBox, currentTokens);
    if (!compareContainer.classList.contains("hidden")) {
      renderTokenPills(compareTokensDisplayBox, currentCompareTokens);
    }
  });

  // ==========================================
  // Render Prompt Highlights behind Textarea
  // ==========================================
  function renderPromptHighlights(text, tokens) {
    if (!text) {
      highlightBackdrop.innerHTML = "";
      return;
    }

    let html = "";
    let lastIdx = 0;

    tokens.forEach((token, idx) => {
      // Add any un-tokenized gap text
      if (token.start > lastIdx) {
        html += escapeHtml(text.slice(lastIdx, token.start));
      }

      const colorIndex = idx % 6;
      const tokenText = text.slice(token.start, token.end);
      html += `<span class="prompt-hl-span" data-token-idx="${idx}" style="background-color: var(--token-color-${colorIndex}); border-bottom: 2px solid var(--token-border-${colorIndex});">${escapeHtml(tokenText)}</span>`;

      lastIdx = token.end;
    });

    if (lastIdx < text.length) {
      html += escapeHtml(text.slice(lastIdx));
    }

    highlightBackdrop.innerHTML = html;
  }

  // Sync scrolling between textarea and highlight backdrop
  promptInput.addEventListener("scroll", () => {
    highlightBackdrop.scrollTop = promptInput.scrollTop;
    highlightBackdrop.scrollLeft = promptInput.scrollLeft;
  });

  function highlightPromptRange(start, end) {
    const spans = highlightBackdrop.querySelectorAll(".prompt-hl-span");
    spans.forEach(span => {
      const idx = parseInt(span.dataset.tokenIdx);
      const token = currentTokens[idx];
      if (token && token.start >= start && token.end <= end) {
        span.classList.add("hovered");
      }
    });
  }

  function clearPromptHighlights() {
    const spans = highlightBackdrop.querySelectorAll(".prompt-hl-span");
    spans.forEach(span => span.classList.remove("hovered"));
  }

  // ==========================================
  // Render Word to Token Mapping Matrix
  // ==========================================
  function renderMappingTable(text, tokens) {
    mappingTableBody.innerHTML = "";
    if (!text || tokens.length === 0) return;

    let currentTokenIdx = 0;
    const wordRegex = /\s+|[^\s\w]+|\w+/g;
    let match;
    let rowCount = 0;
    const ROW_CAP = 200;

    while ((match = wordRegex.exec(text)) !== null) {
      if (rowCount >= ROW_CAP) break;
      const word = match[0];
      const start = match.index;
      const end = start + word.length;

      if (!word.trim()) continue;

      const matchingTokens = [];
      while (currentTokenIdx < tokens.length) {
        const token = tokens[currentTokenIdx];
        if (token.start >= end) break;
        matchingTokens.push(token);
        currentTokenIdx++;
        if (token.end >= end) break;
      }

      const tr = document.createElement("tr");

      const tdWord = document.createElement("td");
      tdWord.className = "word-cell";
      tdWord.textContent = word;

      const tdTokens = document.createElement("td");
      const tokensGroup = document.createElement("div");
      tokensGroup.className = "mapping-tokens-group";

      matchingTokens.forEach((t, i) => {
        const badge = document.createElement("span");
        badge.className = "token-pill";
        badge.dataset.color = t.index % 6;
        badge.style.fontSize = "0.78rem";
        badge.innerHTML = `${escapeHtml(t.displaySubword)} <span class="token-id-badge">${t.id}</span>`;
        tokensGroup.appendChild(badge);
      });

      tdTokens.appendChild(tokensGroup);

      const tdCount = document.createElement("td");
      tdCount.style.fontFamily = "var(--font-code)";
      tdCount.style.fontWeight = "bold";
      tdCount.style.color = matchingTokens.length > 1 ? "var(--border-active)" : "var(--text-secondary)";
      tdCount.textContent = `${matchingTokens.length} token${matchingTokens.length > 1 ? 's' : ''}`;

      tr.appendChild(tdWord);
      tr.appendChild(tdTokens);
      tr.appendChild(tdCount);
      mappingTableBody.appendChild(tr);
      rowCount++;
    }

    if (rowCount >= ROW_CAP) {
      const note = document.createElement("tr");
      note.innerHTML = `<td colspan="3" class="map-cap-note">// SHOWING FIRST ${ROW_CAP} WORDS — GET THE FULL BREAKDOWN VIA JSON/CSV EXPORT</td>`;
      mappingTableBody.appendChild(note);
    }
  }

  // ==========================================
  // Metrics, Cost & Context Meter
  // ==========================================
  function updateMetrics(text, tokens) {
    const charCount = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const tokenCount = tokens.length;
    const ratio = words > 0 ? (tokenCount / words).toFixed(2) : "0.00";

    animateCount(tokenCountElem, tokenCount);
    animateCount(wordCountElem, words);
    animateCount(charCountElem, charCount);
    ratioCountElem.textContent = `${ratio} tokens/word`;

    const config = configFor(activeModelKey);
    if (config && config.costPer1M) {
      const estCost = ((tokenCount / 1000000) * config.costPer1M.input).toFixed(6);
      costEstimateElem.textContent = `$${estCost}`;
    }

    // Context window meter (width transition handled in CSS; state change flashes)
    const ctx = config && config.contextWindow;
    if (ctx && contextBar && contextLabel) {
      const pct = Math.min(100, (tokenCount / ctx) * 100);
      contextBar.style.width = pct.toFixed(3) + "%";
      contextLabel.textContent = `${pct.toFixed(2)}% / ${ctx.toLocaleString()}`;
      const state = pct > 90 ? "danger" : pct > 50 ? "warn" : "";
      if (state !== contextBar.__state) {
        contextBar.__state = state;
        contextBar.classList.remove("flash");
        if (state && !REDUCED) {
          void contextBar.offsetWidth; // restart animation
          contextBar.classList.add("flash");
        }
      }
      contextBar.classList.toggle("warn", pct > 50 && pct <= 90);
      contextBar.classList.toggle("danger", pct > 90);
      contextLabel.classList.toggle("danger-text", pct > 90);
    }
  }

  // ==========================================
  // Script / Language Detection
  // ==========================================
  const SCRIPT_CHECKS = [
    ["Latin", /[A-Za-z]/],
    ["Devanagari", /[\u0900-\u097F]/],
    ["CJK Han", /[\u3400-\u4DBF\u4E00-\u9FFF]/],
    ["Hiragana", /[\u3040-\u309F]/],
    ["Katakana", /[\u30A0-\u30FF]/],
    ["Hangul", /[\uAC00-\uD7AF]/],
    ["Arabic", /[\u0600-\u06FF]/],
    ["Cyrillic", /[\u0400-\u04FF]/],
    ["Greek", /[\u0370-\u03FF]/],
    ["Thai", /[\u0E00-\u0E7F]/],
    ["Hebrew", /[\u0590-\u05FF]/],
    ["Tamil", /[\u0B80-\u0BFF]/],
    ["Bengali", /[\u0980-\u09FF]/],
    ["Emoji", /\p{Extended_Pictographic}/u],
    ["Numbers", /\d/],
  ];

  function detectScripts(text) {
    const found = [];
    for (const [label, re] of SCRIPT_CHECKS) {
      if (re.test(text)) found.push(label);
    }
    return found;
  }

  function updateScriptChips(text) {
    if (!scriptChips) return;
    scriptChips.innerHTML = "";
    if (!text.trim()) {
      scriptChips.innerHTML = `<span class="script-chip muted">Type text to detect scripts</span>`;
      return;
    }
    detectScripts(text).forEach(s => {
      const chip = document.createElement("span");
      chip.className = "script-chip";
      chip.textContent = s;
      scriptChips.appendChild(chip);
    });
  }

  function updateExactBadge() {
    if (!exactBadge) return;
    const cfg = configFor(activeModelKey);
    exactBadge.classList.toggle("hidden", !cfg.exact);
    if (cfg.exact) {
      exactBadge.textContent = `✅ Exact — official ${cfg.tiktokenData} vocabulary`;
      exactBadge.title = "This model uses the real vocabulary file — token IDs match official tiktoken.";
    }
  }

  // ==========================================
  // Floating Tooltip Popover
  // ==========================================
  function showPopover(e, token) {
    clearTimeout(popoverHideTimer);
    tokenPopover.style.display = "flex";
    requestAnimationFrame(() => tokenPopover.classList.add("open"));

    document.getElementById("popoverSubword").textContent = token.displaySubword || token.text;
    document.getElementById("popoverId").textContent = token.id;
    document.getElementById("popoverHex").textContent = token.hexBytes.join(" ");
    document.getElementById("popoverBytes").textContent = `[${token.bytes.join(", ")}]`;
    document.getElementById("popoverRange").textContent = `${token.start} – ${token.end}`;

    const rect = tokenPopover.getBoundingClientRect();
    let left = e.clientX + 15;
    let top = e.clientY + 15;

    if (left + rect.width > window.innerWidth) {
      left = e.clientX - rect.width - 15;
    }
    if (top + rect.height > window.innerHeight) {
      top = e.clientY - rect.height - 15;
    }

    tokenPopover.style.left = `${left}px`;
    tokenPopover.style.top = `${top}px`;
  }

  let popoverHideTimer = null;
  function hidePopover() {
    tokenPopover.classList.remove("open");
    clearTimeout(popoverHideTimer);
    popoverHideTimer = setTimeout(() => { tokenPopover.style.display = "none"; }, 170);
  }

  // ==========================================
  // BPE Step-by-Step Engine
  // ==========================================
  function updateBPESteps(text) {
    const bpeStepsContainer = document.getElementById("bpeStepsContainer");
    if (!bpeStepsContainer || !activeTokenizer.getMergeSteps) return;

    const steps = activeTokenizer.getMergeSteps(text);
    bpeStepsContainer.innerHTML = "";

    const controls = document.createElement("div");
    controls.className = "bpe-controls";
    controls.innerHTML = `
      <span class="control-label" id="bpeProgress">${steps.length} MERGE STEPS DETECTED — WATCH VOCABULARY EMERGE FROM RAW BYTES</span>
      <button id="bpePlay" class="preset-btn" type="button">[ \u25B6 PLAY STEPS ]</button>`;
    bpeStepsContainer.appendChild(controls);

    steps.forEach(st => {
      const card = document.createElement("div");
      card.className = "bpe-step-card";

      card.innerHTML = `
        <div class="bpe-step-header">Step ${st.step}: ${st.title}</div>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">${st.description}</p>
        <div class="bpe-tokens-wrap">
          ${st.state.map((sub, i) => `<span class="token-pill" data-color="${i % 6}">${escapeHtml(sub)}</span>`).join("")}
        </div>
      `;
      bpeStepsContainer.appendChild(card);
    });

    // Entrance stagger (capped)
    stagger(bpeStepsContainer.querySelectorAll(".bpe-step-card"));

    // Auto-advance player: reveals steps one at a time, ~600ms cadence, PAUSE/RESUME + progress ticks + merged-pair flash
    const playBtn = controls.querySelector("#bpePlay");
    const progressLabel = controls.querySelector("#bpeProgress");
    if (playBtn) {
      let timer = null;
      let k = 0;
      let playing = false;

      playBtn.addEventListener("click", () => {
        const cards = bpeStepsContainer.querySelectorAll(".bpe-step-card");
        if (REDUCED || !cards.length) return;

        if (playing) {
          playing = false;
          clearInterval(timer);
          playBtn.textContent = "[ \u25B6 RESUME ]";
          showToast("PLAYBACK PAUSED");
          return;
        }

        playing = true;
        playBtn.textContent = "[ \u23F8 PAUSE ]";

        if (k === 0 || k >= cards.length) {
          k = 0;
          cards.forEach(c => {
            c.classList.remove("anim-enter", "bpe-active");
            c.style.animationDelay = "";
            c.classList.add("bpe-wait");
          });
        }

        timer = setInterval(() => {
          if (k >= cards.length) {
            clearInterval(timer);
            playing = false;
            playBtn.textContent = "[ \u25B6 REPLAY STEPS ]";
            progressLabel.innerHTML = `<b>${steps.length} / ${steps.length}</b> MERGES COMPLETED`;
            return;
          }

          progressLabel.innerHTML = `STEP <b>${k + 1} / ${steps.length}</b> \u2014 WATCH VOCABULARY EMERGE`;
          cards[k].classList.remove("bpe-wait");
          cards[k].classList.add("bpe-active");
          cards[k].scrollIntoView({ block: "nearest", behavior: "smooth" });
          k++;
        }, 600);
      });
    }
  }

  // ==========================================
  // All-Models Battle Table
  // ==========================================
  async function renderBattle() {
    const text = promptInput.value;
    const total = Object.keys(modelConfigs).length;
    battleTableWrap.innerHTML = `<div class="loading-hint">⚔️ Tokenizing with all ${total} models…</div>`;

    // Preload any exact vocab data in parallel (one-time per encoding)
    try {
      const exactData = [...new Set(Object.values(modelConfigs).filter(c => c.exact && c.tiktokenData).map(c => c.tiktokenData))];
      await Promise.all(exactData.map(d => (window.loadTiktokenData ? window.loadTiktokenData(d) : Promise.resolve())));
    } catch (e) { /* fall back to approximate engine */ }

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const rows = [];

    for (const [key, cfg] of Object.entries(modelConfigs)) {
      let count = 0;
      try { count = createTokenizer(key).tokenize(text).length; } catch (e) { count = 0; }
      const ratio = words > 0 ? count / words : 0;
      const cost = cfg.costPer1M ? (count / 1000000) * cfg.costPer1M.input : 0;
      const ctxPct = cfg.contextWindow ? (count / cfg.contextWindow) * 100 : null;
      rows.push({ key, cfg, count, ratio, cost, ctxPct });
    }

    rows.sort((a, b) => a.count - b.count);
    const maxCount = Math.max(1, ...rows.map(r => r.count));

    let html = `<div class="battle-note">Sorted by <strong>fewest tokens</strong> (cheapest & fastest wins). 🏆 = lowest token count. Click a row to inspect it in the playground.</div>`;
    html += `<table class="battle-table">
      <thead><tr>
        <th>#</th><th>Model</th><th>Tokenizer</th><th>Tokens</th><th>Tokens/Word</th><th>Est. Cost (input)</th><th>Context Used</th>
      </tr></thead><tbody>`;

    rows.forEach((r, i) => {
      const active = r.key === activeModelKey ? ' class="battle-row-active"' : "";
      const trophy = i === 0 && r.count > 0 ? ' <span class="trophy" aria-hidden="true">🏆</span>' : "";
      const delay = Math.min(i, 40) * 20;
      const barPct = Math.max(2, Math.round((r.count / maxCount) * 100));
      html += `<tr${active} data-key="${r.key}" style="--row-delay:${delay}ms">
        <td>${i + 1}${trophy}</td>
        <td>${r.cfg.name}${r.cfg.exact ? ` <span class="exact-tag" title="Real vocabulary — matches official tiktoken">EXACT</span>` : ""}</td>
        <td class="battle-mono">${r.cfg.family}</td>
        <td class="battle-mono battle-strong">${r.count.toLocaleString()}<span class="battle-bar" aria-hidden="true"><i class="battle-bar-fill" style="width:${barPct}%; animation-delay:${delay}ms"></i></span></td>
        <td class="battle-mono">${r.ratio.toFixed(2)}</td>
        <td class="battle-mono">$${r.cost.toFixed(4)}</td>
        <td class="battle-mono">${r.ctxPct === null ? "—" : r.ctxPct.toFixed(2) + "%"}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    battleTableWrap.innerHTML = html;

    battleTableWrap.querySelectorAll("tr[data-key]").forEach(tr => {
      tr.addEventListener("click", () => {
        activeModelKey = tr.dataset.key;
        activeTokenizer = null;
        modelSelect.value = activeModelKey;
        switchTab("playground");
      });
    });
  }

  // ==========================================
  // Model Selectors & Event Listeners
  // ==========================================
  modelSelect.addEventListener("change", (e) => {
    activeModelKey = e.target.value;
    activeTokenizer = null;
    updateTokenization();
  });

  compareModelSelect.addEventListener("change", (e) => {
    compareModelKey = e.target.value;
    compareTokenizer = null;
    updateTokenization();
  });

  promptInput.addEventListener("input", debounce(updateTokenization, 60));

  // Preset Buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetType = btn.dataset.preset;
      switch (presetType) {
        case "code":
          promptInput.value = `def calculate_tokens(prompt: str) -> list[int]:\n    # Convert prompt to subword token IDs\n    return [15496, 2159, 1059]`;
          break;
        case "multilingual":
          promptInput.value = `Hello World! नमस्ते दुनिया! こんにちは世界! AI is universal.`;
          break;
        case "emoji":
          promptInput.value = `AI Tokenizer 🤖🚀✨ Family Emoji: 👨‍👩‍👧‍👦 Code: 🐍🔥`;
          break;
        case "numbers":
          promptInput.value = `Constants: pi = 3.1415926535, e = 2.71828182845, count = 1000000`;
          break;
        case "glitch":
          promptInput.value = `<|im_start|>system\nYou are a helpful AI assistant.<|im_end|>\n<|im_start|>user\nSolidGoldMagikarp token test.<|im_end|>`;
          break;
      }
      updateTokenization();
    });
  });

  // Dark/Light Theme Toggle
  const themeToggleBtnApp = document.getElementById('themeToggleBtnApp');
  if (themeToggleBtnApp) {
    themeToggleBtnApp.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('tokenizer-theme', newTheme);
    });
  }

  // Navigation Tabs
  tabPlayground.addEventListener("click", () => switchTab("playground"));
  tabCompare.addEventListener("click", () => switchTab("compare"));
  tabStepBPE.addEventListener("click", () => switchTab("bpe"));
  tabBattle.addEventListener("click", () => switchTab("battle"));
  tabGuess.addEventListener("click", () => switchTab("guess"));
  tabLearn.addEventListener("click", () => switchTab("learn"));

  // Sliding tab indicator (transform-based, --dur-2 --ease-snap)
  const navTabsEl = document.querySelector(".nav-tabs");
  const tabIndicator = document.createElement("span");
  tabIndicator.className = "tab-indicator";
  tabIndicator.setAttribute("aria-hidden", "true");
  if (navTabsEl) navTabsEl.appendChild(tabIndicator);
  function moveTabIndicator() {
    const active = document.querySelector(".tab-btn.active");
    if (!active || !tabIndicator || !navTabsEl) return;
    tabIndicator.style.width = active.offsetWidth + "px";
    tabIndicator.style.transform = `translateX(${active.offsetLeft}px)`;
  }
  window.addEventListener("resize", debounce(moveTabIndicator, 120));
  moveTabIndicator();

  // View containers are keyboard-focusable targets on tab switch (a11y)
  [playgroundView, bpeStepView, battleView, learnView, guessView].forEach(v => {
    v.setAttribute("tabindex", "-1");
    v.classList.add("app-view");
  });

  // Sticky header elevation on scroll (hard offset shadow, --dur-1)
  const appHeaderEl = document.querySelector(".app-header");
  let headerScrolled = false;
  window.addEventListener("scroll", () => {
    const s = window.scrollY > 4;
    if (s !== headerScrolled) {
      headerScrolled = s;
      if (appHeaderEl) appHeaderEl.classList.toggle("scrolled", s);
    }
  }, { passive: true });

  // ==========================================
  // ASCII / Hex Artwork — "TOKENS" drawn with its own UTF-8 codes
  // ==========================================
  const HEX_FONT = {
    T: "54", O: "4F", K: "4B", E: "45", N: "4E", S: "53",
    glyphs: {
      T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
      O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
      K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
      E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
      N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
      S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."]
    }
  };
  const asciiArtEl = document.getElementById("asciiArt");

  function renderAsciiArt() {
    const word = "TOKENS";
    const lines = [];
    for (let row = 0; row < 7; row++) {
      let line = "";
      for (let li = 0; li < word.length; li++) {
        const ch = word[li];
        const glyph = HEX_FONT.glyphs[ch];
        if (li > 0) line += "  ";
        for (let c = 0; c < 5; c++) {
          line += glyph[row][c] === "#" ? HEX_FONT[ch] : "\u00B7\u00B7";
          if (c < 4) line += " ";
        }
      }
      lines.push(line);
    }
    return lines.join("\n");
  }

  if (asciiArtEl) {
    // Static paint + CSS sweep overlay (perf: no periodic innerHTML rebuilds;
    // the scanline motion lives in .ascii-art::after in index.css)
    asciiArtEl.innerHTML = escapeHtml(renderAsciiArt()).split("\n")
      .map(row => `<span class="aa-row">${row}</span>`)
      .join("\n");

    // companion hex dump of the product name — real UTF-8 bytes
    const dumpEl = document.getElementById("asciiDump");
    const dumpBytes = Array.from(new TextEncoder().encode("UNIVERSAL LLM TOKENIZER"));
    dumpEl.textContent = dumpBytes.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  }

  // ==========================================
  // Router — History API with real path segments
  //   /playground  /compare  /bpe  /battle  /guess  /learn
  // Pretty URLs resolve on GitHub Pages via the root 404.html fallback;
  // `?tab=` query params work everywhere else (local servers, file hosts).
  // ==========================================
  const ROUTES = {
    playground: "playground",
    compare: "compare",
    bpe: "bpe",
    battle: "battle",
    guess: "guess",
    learn: "learn"
  };
  const ROUTE_TO_TAB = Object.fromEntries(Object.entries(ROUTES).map(([tab, seg]) => [seg, tab]));
  const BASE_PATH = (function () {
    // Project pages live at "/<repo>/app.html" on GitHub Pages; "/" locally.
    const p = location.pathname;
    if (/\/app\.html$/.test(p)) return p.slice(0, -"app.html".length);
    return p.endsWith("/") ? p : p + "/";
  })();

  function routeFromLocation() {
    // Priority: ?d= permalink payload > ?tab= > pretty pathname > legacy hashes
    const params = new URLSearchParams(location.search);
    if (params.get("tab") && ROUTE_TO_TAB[params.get("tab")]) return { tab: ROUTE_TO_TAB[params.get("tab")] };
    if (params.get("d")) return { tab: "playground", payload: params.get("d"), push: false, replace: true };

    const seg = location.pathname.slice(BASE_PATH.length).replace(/\/+$/, "");
    if (seg && ROUTE_TO_TAB[seg] && !/\.html?$/.test(seg)) return { tab: ROUTE_TO_TAB[seg] };

    const h = location.hash || "";
    if (h === "#learn") return { tab: "learn", replace: true };
    if (h.startsWith("#d=")) return { tab: "playground", payload: h.slice(3), replace: true };
    return null;
  }

  function applyPayload(payload) {
    try {
      const state = JSON.parse(b64uDecode(payload));
      if (typeof state.t === "string" && modelConfigs[state.m]) {
        promptInput.value = state.t;
        activeModelKey = state.m;
        modelSelect.value = state.m;
        activeTokenizer = null;
        if (state.c && modelConfigs[state.c]) {
          compareModelKey = state.c;
          compareModelSelect.value = state.c;
          compareTokenizer = null;
          return true; // needs compare view
        }
      }
    } catch (e) { /* malformed payload — ignore */ }
    return false;
  }

  function navigate(tabName, opts) {
    const options = opts || {};
    switchTabInternal(tabName);
    if (!options.silent) {
      const url = BASE_PATH + ROUTES[tabName] + location.search.replace(/^\?/, "") ;
      const cleanUrl = BASE_PATH + ROUTES[tabName];
      if (options.replace) history.replaceState({ tab: tabName }, "", cleanUrl);
      else history.pushState({ tab: tabName }, "", cleanUrl);
    }
  }

  window.addEventListener("popstate", () => {
    const r = routeFromLocation();
    if (r) {
      const useCompare = r.payload ? applyPayload(r.payload) : false;
      switchTabInternal(useCompare ? "compare" : r.tab);
    }
  });

  function switchTab(tabName, opts) {
    navigate(tabName, opts);
  }

  function switchTabInternal(tabName) {
    const apply = () => {
      [tabPlayground, tabCompare, tabStepBPE, tabBattle, tabGuess, tabLearn].forEach(btn => btn.classList.remove("active"));
      [playgroundView, bpeStepView, battleView, learnView, guessView].forEach(view => view.classList.add("hidden"));

      let revealed = null;
      if (tabName === "playground") {
        tabPlayground.classList.add("active");
        playgroundView.classList.remove("hidden");
        compareContainer.classList.add("hidden");
        revealed = playgroundView;
      } else if (tabName === "compare") {
        tabCompare.classList.add("active");
        playgroundView.classList.remove("hidden");
        compareContainer.classList.remove("hidden");
        revealed = playgroundView;
      } else if (tabName === "bpe") {
        tabStepBPE.classList.add("active");
        bpeStepView.classList.remove("hidden");
        revealed = bpeStepView;
      } else if (tabName === "battle") {
        tabBattle.classList.add("active");
        battleView.classList.remove("hidden");
        revealed = battleView;
        renderBattle();
      } else if (tabName === "guess") {
        tabGuess.classList.add("active");
        guessView.classList.remove("hidden");
        revealed = guessView;
        initGuessGame();
      } else if (tabName === "learn") {
        tabLearn.classList.add("active");
        learnView.classList.remove("hidden");
        revealed = learnView;
      }

      // Fallback entrance animation when View Transitions API is unavailable
      if (revealed && !REDUCED && !document.startViewTransition) {
        revealed.classList.remove("view-enter");
        void revealed.offsetWidth; // restart
        revealed.classList.add("view-enter");
      }
      if (revealed) revealed.focus({ preventScroll: true });

      updateTokenization();
    };

    // View Transitions API (Chrome 111+/Edge 111+/Firefox 144+/Safari 18+);
    // styled via ::view-transition-old/new(root) in index.css
    if (document.startViewTransition && !REDUCED) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
    moveTabIndicator();
  }

  // Initial route resolution:
  //   1. sessionStorage hand-off from the 404.html fallback (pretty deep links)
  //   2. ?d= permalink payloads / ?tab= params
  //   3. pretty pathname segments (/learn, /battle, ...)
  //   4. legacy #learn / #d= hashes (kept for old shared links)
  (function initRoute() {
    let r = null;
    const stored = sessionStorage.getItem("tokenizer-route");
    if (stored) {
      sessionStorage.removeItem("tokenizer-route");
      if (ROUTE_TO_TAB[stored]) r = { tab: ROUTE_TO_TAB[stored] };
    }
    if (!r) r = routeFromLocation();
    if (!r) return;
    const useCompare = r.payload ? applyPayload(r.payload) : false;
    switchTabInternal(useCompare ? "compare" : r.tab);
    history.replaceState({ tab: r.tab }, "", BASE_PATH + ROUTES[useCompare ? "compare" : r.tab]);
  })();

  // UTF-8-safe base64url helpers for share permalinks
  function b64uEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64uDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // Learn Academy: inline YouTube player (facade pattern — the iframe is only
  // injected on first click, so the page loads with zero third-party JS)
  document.querySelectorAll(".learn-card[data-yt]").forEach(card => {
    const play = () => {
      if (card.classList.contains("playing")) return;
      const id = card.getAttribute("data-yt");
      const titleEl = card.querySelector(".learn-card-title");
      const media = card.querySelector(".learn-media");
      if (!id || !media) return;
      const frame = document.createElement("iframe");
      frame.className = "yt-frame";
      frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
      frame.title = titleEl ? titleEl.textContent : "YouTube video";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      media.innerHTML = "";
      media.appendChild(frame);
      card.classList.add("playing");
      const cta = card.querySelector(".learn-cta");
      if (cta) cta.textContent = "// NOW PLAYING";
    };
    card.addEventListener("click", (e) => {
      if (e.target.closest(".media-ext")) return;
      play();
    });
    card.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".media-ext")) {
        e.preventDefault();
        play();
      }
    });
  });

  // Utility to escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // Share Permalink + Copy-as-Code + JSON/CSV Export
  // ==========================================
  function copyToClipboard(text, done) {
    const finish = () => { if (done) done(true); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(finish).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); if (done) done(true); } catch (e) { if (done) done(false); }
    document.body.removeChild(ta);
  }
  function flashBtn(btn, ok) {
    showToast(ok ? "COPIED TO CLIPBOARD" : "COPY FAILED");
    if (ok && !REDUCED) {
      btn.classList.remove("flash-ok");
      void btn.offsetWidth; // restart flash animation
      btn.classList.add("flash-ok");
    }
  }

  const btnShareLink = document.getElementById("btnShareLink");
  btnShareLink.addEventListener("click", () => {
    const payload = b64uEncode(JSON.stringify({ t: promptInput.value, m: activeModelKey }));
    const url = location.origin + BASE_PATH + "playground?d=" + payload;
    history.replaceState({ tab: "playground" }, "", BASE_PATH + "playground?d=" + payload);
    copyToClipboard(url, ok => flashBtn(btnShareLink, ok));
  });

  const btnCopyPy = document.getElementById("btnCopyPy");
  btnCopyPy.addEventListener("click", () => {
    const cfg = configFor(activeModelKey);
    const ids = currentTokens.map(t => t.id);
    let py;
    if (cfg.exact && cfg.tiktokenData) {
      py = `import tiktoken\n\nenc = tiktoken.get_encoding("${cfg.tiktokenData}")\nids = enc.encode(${JSON.stringify(promptInput.value)})\nprint(len(ids), ids)\n# -> ${JSON.stringify(ids)}`;
    } else {
      py = `# NOTE: ${cfg.name} does not publish its tokenizer file.\n# These IDs are this tool's approximation — treat counts, not exact IDs, as reliable.\nids = ${JSON.stringify(ids)}\ntext = ${JSON.stringify(promptInput.value)}\nprint(len(ids))`;
    }
    copyToClipboard(py, ok => flashBtn(btnCopyPy, ok));
  });

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  document.getElementById("btnExportJson").addEventListener("click", () => {
    const data = {
      model: configFor(activeModelKey).name,
      modelKey: activeModelKey,
      exact: !!configFor(activeModelKey).exact,
      text: promptInput.value,
      tokenCount: currentTokens.length,
      tokens: currentTokens.map((t, i) => ({
        i, id: t.id, text: t.text, bytes: t.bytes,
        hex: (t.hexBytes || []).join(" "),
        start: t.start, end: t.end, type: t.type
      }))
    };
    downloadFile(`tokens-${activeModelKey}.json`, JSON.stringify(data, null, 2), "application/json");
  });

  document.getElementById("btnExportCsv").addEventListener("click", () => {
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    let csv = "i,text,id,hex_bytes,start,end,type\n";
    currentTokens.forEach((t, i) => {
      csv += [i, esc(t.text), t.id, esc((t.hexBytes || []).join(" ")), t.start, t.end, esc(t.type)].join(",") + "\n";
    });
    downloadFile(`tokens-${activeModelKey}.csv`, csv, "text/csv");
  });

  // ==========================================
  // Cost Lab: Drag & Drop File Analyzer
  // ==========================================
  const fileDropZone = document.getElementById("fileDropZone");
  const fileInput = document.getElementById("fileInput");
  const fileAnalysisWrap = document.getElementById("fileAnalysisWrap");

  function analyzeTextFile(name, text) {
    if (!text || !text.length) {
      fileAnalysisWrap.classList.remove("hidden");
      fileAnalysisWrap.innerHTML = `<div class="loading-hint">⚠ THAT FILE LOOKS EMPTY OR IS NOT READABLE TEXT.</div>`;
      return;
    }
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split(/\r\n|\r|\n/).length;
    const rows = [];
    for (const [key, cfg] of Object.entries(modelConfigs)) {
      // Only run exact engines whose vocab is already loaded — never force big downloads here
      if (cfg.exact && !(window.TIKTOKEN_DATA && window.TIKTOKEN_DATA[cfg.tiktokenData])) {
        rows.push({ key, cfg, count: null });
        continue;
      }
      let count = null;
      try { count = createTokenizer(key).tokenize(text).length; } catch (e) { count = null; }
      rows.push({ key, cfg, count });
    }
    rows.sort((a, b) => (a.count ?? Infinity) - (b.count ?? Infinity));
    const loaded = rows.filter(r => r.count !== null);
    const maxCount = loaded.length ? Math.max(...loaded.map(r => r.count)) : 1;

    let html = `<div class="battle-note">
      <strong>${escapeHtml(name)}</strong> — ${(text.length / 1024).toFixed(1)} KB ·
      ${words.toLocaleString()} words · ${lines.toLocaleString()} lines ·
      analyzed locally across ${loaded.length} loaded models.
      <button id="fdUseInPlayground" class="preset-btn">[ USE THIS TEXT IN PLAYGROUND ]</button>
    </div><table class="battle-table"><thead><tr>
      <th>#</th><th>Model</th><th>Tokens</th><th>Chars/Token</th><th>Est. Cost (input)</th><th>Context Used</th>
    </tr></thead><tbody>`;
    rows.forEach((r, i) => {
      if (r.count === null) {
        html += `<tr><td>—</td><td>${r.cfg.name}</td><td class="battle-mono" colspan="4">exact vocab not loaded — pick it in the playground once to enable</td></tr>`;
        return;
      }
      const cpt = r.count ? (text.length / r.count).toFixed(2) : "—";
      const cost = r.cfg.costPer1M ? ((r.count / 1000000) * r.cfg.costPer1M.input).toFixed(4) : "—";
      const pct = r.cfg.contextWindow ? ((r.count / r.cfg.contextWindow) * 100).toFixed(2) + "%" : "—";
      const delay = Math.min(i, 40) * 18;
      const barPct = Math.max(2, Math.round((r.count / maxCount) * 100));
      html += `<tr style="--row-delay:${delay}ms"><td>${i + 1}${i === 0 && rows[0].count ? " 🏆" : ""}</td>
        <td>${r.cfg.name}</td>
        <td class="battle-mono battle-strong">${r.count.toLocaleString()}<span class="battle-bar" aria-hidden="true"><i class="battle-bar-fill" style="width:${barPct}%; animation-delay:${delay}ms"></i></span></td>
        <td class="battle-mono">${cpt}</td>
        <td class="battle-mono">$${cost}</td>
        <td class="battle-mono">${pct}</td></tr>`;
    });
    html += `</tbody></table>`;
    fileAnalysisWrap.innerHTML = html;
    fileAnalysisWrap.classList.remove("hidden");
    if (!REDUCED) {
      fileAnalysisWrap.querySelectorAll("tbody tr").forEach(tr => {
        if (tr.hasAttribute("style")) {
          tr.classList.add("anim-enter");
        }
      });
    }
    document.getElementById("fdUseInPlayground").addEventListener("click", () => {
      promptInput.value = text;
      switchTab("playground");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      fileAnalysisWrap.classList.remove("hidden");
      fileAnalysisWrap.innerHTML = `<div class="loading-hint">⚠ FILE TOO LARGE (${(file.size / 1048576).toFixed(1)} MB). KEEP IT UNDER 2 MB FOR LIVE ANALYSIS.</div>`;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => analyzeTextFile(file.name, String(reader.result));
    reader.onerror = () => {
      fileAnalysisWrap.classList.remove("hidden");
      fileAnalysisWrap.innerHTML = `<div class="loading-hint">⚠ COULD NOT READ THAT FILE. TRY A PLAIN-TEXT FORMAT.</div>`;
    };
    reader.readAsText(file);
  }

  fileDropZone.addEventListener("dragover", e => { e.preventDefault(); fileDropZone.classList.add("dragging"); });
  fileDropZone.addEventListener("dragleave", () => fileDropZone.classList.remove("dragging"));
  fileDropZone.addEventListener("drop", e => {
    e.preventDefault();
    fileDropZone.classList.remove("dragging");
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  });
  fileDropZone.addEventListener("click", () => fileInput.click());
  fileDropZone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener("change", () => handleFile(fileInput.files && fileInput.files[0]));

  // ==========================================
  // Guess-the-Tokens Game
  // ==========================================
  const GUESS_MODEL = "gpt-5-6";
  const GUESS_PHRASES = [
    "Hello World!", "tokenizer", "Artificial Intelligence", "नमस्ते दुनिया",
    "こんにちは世界", "🤖🚀", "👨‍👩‍👧‍👦", "1234567890",
    "def main():", "import numpy as np", "The quick brown fox jumps over the lazy dog",
    "SolidGoldMagikarp", "strawberry", "supercalifragilisticexpialidocious",
    "<|endoftext|>", "print('hello world')", "€100 costs €120 in 2026",
    "naïve café résumé", "مرحبا بالعالم", "안녕하세요", "LLMs read tokens not words",
    "x = x + 1", "{json: true}", "https://example.com/path?q=1"
  ];
  let gDeck = [];
  let gPtr = 0;
  let gAnswer = 0;
  let gState = { round: 0, score: 0, streak: 0, best: parseInt(localStorage.getItem("guess-best") || "0", 10) };
  let guessInitialized = false;

  const gRound = document.getElementById("gRound");
  const gScore = document.getElementById("gScore");
  const gStreak = document.getElementById("gStreak");
  const gBest = document.getElementById("gBest");
  const gPhrase = document.getElementById("gPhrase");
  const gInput = document.getElementById("gInput");
  const gFeedback = document.getElementById("gFeedback");
  const btnGuessSubmit = document.getElementById("btnGuessSubmit");
  const btnGuessNext = document.getElementById("btnGuessNext");

  function nextFromDeck() {
    if (gPtr >= gDeck.length) {
      gDeck = GUESS_PHRASES.slice().sort(() => Math.random() - 0.5);
      gPtr = 0;
    }
    return gDeck[gPtr++];
  }

  async function startGuessRound() {
    await ensureLoaded(GUESS_MODEL);
    const phrase = nextFromDeck();
    gAnswer = createTokenizer(GUESS_MODEL).tokenize(phrase).length;
    gPhrase.textContent = phrase;
    gPhrase.classList.remove("shaking", "stamped");
    gInput.value = "";
    gFeedback.classList.add("hidden");
    gFeedback.innerHTML = "";
    btnGuessSubmit.classList.remove("hidden");
    btnGuessNext.classList.add("hidden");
    gRound.textContent = gState.round;
    animateCount(gScore, gState.score);
    animateCount(gStreak, gState.streak);
    animateCount(gBest, gState.best);
  }

  function initGuessGame() {
    if (guessInitialized) return;
    guessInitialized = true;
    startGuessRound();
  }

  btnGuessSubmit.addEventListener("click", () => {
    const guess = parseInt(gInput.value, 10);
    if (isNaN(guess) || guess < 0) return;
    gState.round++;
    const correct = guess === gAnswer;
    const tokens = createTokenizer(GUESS_MODEL).tokenize(gPhrase.textContent);
    if (correct) {
      gState.score++;
      gState.streak++;
      if (gState.streak > gState.best) {
        gState.best = gState.streak;
        localStorage.setItem("guess-best", String(gState.best));
      }
    } else {
      gState.streak = 0;
    }
    animateCount(gScore, gState.score);
    animateCount(gStreak, gState.streak);
    animateCount(gBest, gState.best);

    // Motion feedback: shake on a miss, red stamp bar on a hit
    if (!REDUCED) {
      gPhrase.classList.remove("shaking", "stamped");
      void gPhrase.offsetWidth;
      gPhrase.classList.add(correct ? "stamped" : "shaking");
    }

    const delta = guess - gAnswer;
    gFeedback.innerHTML = `
      <div class="gf-verdict ${correct ? "gf-ok" : "gf-no"}">
        ${correct ? "&#10003; EXACT! YOU THINK IN TOKENS NOW." : `&#10007; OFF BY ${Math.abs(delta)} — YOU GUESSED ${guess > gAnswer ? "HIGH" : "LOW"}.`}
      </div>
      <p class="gf-line">ACTUAL TOKEN COUNT: <b>${gAnswer}</b></p>
      <div class="tokens-display-box gf-tokens"></div>
      ${correct && !REDUCED ? '<div class="gf-stamp" aria-hidden="true">&#10003; CORRECT</div>' : ""}`;
    renderTokenPills(gFeedback.querySelector(".gf-tokens"), tokens.slice(0, 60));
    gFeedback.classList.remove("hidden");
    btnGuessSubmit.classList.add("hidden");
    btnGuessNext.classList.remove("hidden");
    gInput.blur();
  });
  gInput.addEventListener("keydown", e => { if (e.key === "Enter") btnGuessSubmit.click(); });
  btnGuessNext.addEventListener("click", startGuessRound);

  // ==========================================
  // Quirks Museum — load exhibits into the playground
  // ==========================================
  const MUSEUM_EXHIBITS = {
    "strawberry": { m: "gpt-5-6", t: "How many r's are in strawberry? Really count them carefully." },
    "trailing-space": { m: "gpt-4", t: "Here is a tagline for an ice cream shop: " },
    "magikarp": { m: "gpt-3", t: "SolidGoldMagikarp SolidGoldMagikarp petertoddd StreamGraph" },
    "nonenglish": { m: "gpt-5-6", t: "Hello World! नमस्ते दुनिया! こんにちは世界! مرحبا بالعالم" },
    "numbers": { m: "gpt-5-6", t: "pi = 3.14159265358979, count = 1234567890, huge = 9876543210123456789" },
    "zwjemoji": { m: "gpt-5-6", t: "Family: 👨‍👩‍👧‍👦 Flag: 🏳️‍🌈 Rocket: 🚀" }
  };
  document.querySelectorAll(".museum-card").forEach(card => {
    const btn = card.querySelector(".museum-load");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const ex = MUSEUM_EXHIBITS[card.getAttribute("data-exhibit")];
      if (!ex || !modelConfigs[ex.m]) return;
      promptInput.value = ex.t;
      activeModelKey = ex.m;
      modelSelect.value = ex.m;
      activeTokenizer = null;
      switchTab("playground");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // ==========================================
  // Laboratory: Train Your Own BPE Tokenizer (minbpe-style, in JS)
  // ==========================================
  let trainedBpe = null;

  function bytesToDisplay(byteArr) {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(byteArr))
        .replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/ /g, "\u00B7");
    } catch (e) { return "?"; }
  }

  function trainBpe(rawCorpus, numMerges) {
    const corpus = rawCorpus.slice(0, 6000);
    let seq = Array.from(new TextEncoder().encode(corpus));
    const merges = [];
    let nextId = 256;
    for (let step = 0; step < numMerges; step++) {
      const counts = new Map();
      for (let j = 0; j < seq.length - 1; j++) {
        const k = seq[j] + "," + seq[j + 1];
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      let bestK = null, bestC = 1;
      for (const [k, c] of counts) { if (c > bestC) { bestC = c; bestK = k; } }
      if (bestK === null) break;
      const parts = bestK.split(",");
      const a = Number(parts[0]), b = Number(parts[1]);
      const out = [];
      for (let j = 0; j < seq.length; j++) {
        if (j < seq.length - 1 && seq[j] === a && seq[j + 1] === b) { out.push(nextId); j++; }
        else out.push(seq[j]);
      }
      seq = out;
      merges.push({ a, b, id: nextId, count: bestC });
      nextId++;
    }
    const vocab = new Map();
    for (let i = 0; i < 256; i++) vocab.set(i, [i]);
    for (const mg of merges) {
      const left = vocab.get(mg.a) || [];
      const right = vocab.get(mg.b) || [];
      vocab.set(mg.id, left.concat(right));
    }
    return { merges, seq, vocab };
  }

  function encodeWithMerges(merges, text) {
    let seq = Array.from(new TextEncoder().encode(text));
    for (const mg of merges) {
      const out = [];
      for (let j = 0; j < seq.length; j++) {
        if (j < seq.length - 1 && seq[j] === mg.a && seq[j + 1] === mg.b) { out.push(mg.id); j++; }
        else out.push(seq[j]);
      }
      seq = out;
    }
    return seq;
  }

  const trainCorpusEl = document.getElementById("trainCorpus");
  const trainMergesEl = document.getElementById("trainMerges");
  const btnTrainBPE = document.getElementById("btnTrainBPE");
  const trainStatus = document.getElementById("trainStatus");
  const trainBPEOutput = document.getElementById("trainBPEOutput");

  btnTrainBPE.addEventListener("click", () => {
    const numMerges = Math.min(200, Math.max(1, parseInt(trainMergesEl.value, 10) || 24));
    if (!trainCorpusEl.value.trim()) {
      trainStatus.textContent = "FEED ME SOME TEXT FIRST.";
      return;
    }
    trainStatus.textContent = "TRAINING…";
    setTimeout(() => {
      const result = trainBpe(trainCorpusEl.value, numMerges);
      trainedBpe = result;
      const rawLen = Array.from(new TextEncoder().encode(trainCorpusEl.value.slice(0, 6000))).length;
      const afterLen = result.seq.length;
      let html = `<div class="battle-note">TRAINED ON ${(rawLen / 1024).toFixed(1)} KB OF BYTES —
        LEARNED <b>${result.merges.length}</b> MERGES.
        COMPRESSION: ${rawLen} BYTES &rarr; ${afterLen} TOKENS (${(rawLen / afterLen).toFixed(2)} BYTES/TOKEN).
        SCROLL TO WATCH VOCABULARY EMERGE FROM RAW BYTES:</div>`;
      html += `<div class="bpe-step-container">`;
      result.merges.forEach((mg, idx) => {
        const dispA = mg.a < 256 ? bytesToDisplay([mg.a]) : bytesToDisplay(result.vocab.get(mg.a));
        const dispB = mg.b < 256 ? bytesToDisplay([mg.b]) : bytesToDisplay(result.vocab.get(mg.b));
        const dispNew = bytesToDisplay(result.vocab.get(mg.id));
        html += `<div class="bpe-step-card">
          <h4 class="bpe-step-header">MERGE #${idx + 1} — PAIR [${escapeHtml(dispA)}] + [${escapeHtml(dispB)}]</h4>
          <p class="train-merge-meta">SEEN <b>${mg.count}×</b> IN THE CORPUS &nbsp;&rarr;&nbsp; NEW TOKEN ID <b>${mg.id}</b> = "${escapeHtml(dispNew)}"</p>
        </div>`;
      });
      html += `</div>`;
      trainBPEOutput.innerHTML = html;
      trainBPEOutput.classList.remove("hidden");
      stagger(trainBPEOutput.querySelectorAll(".bpe-step-card"), 18, 60);
      const compression = rawLen ? (rawLen / afterLen).toFixed(2) : "0";
      trainStatus.textContent = `DONE — ${result.merges.length} MERGES · ${compression} BYTES/TOKEN`;
    }, 30);
  });

  const encodeSampleEl = document.getElementById("encodeSample");
  const encodeSampleResult = document.getElementById("encodeSampleResult");
  document.getElementById("btnEncodeSample").addEventListener("click", () => {
    if (!trainedBpe || !trainedBpe.merges.length) {
      trainStatus.textContent = "TRAIN A TOKENIZER FIRST.";
      return;
    }
    const ids = encodeWithMerges(trainedBpe.merges, encodeSampleEl.value || "");
    encodeSampleResult.innerHTML = "";
    const frag = document.createDocumentFragment();
    ids.forEach(id => {
      const pill = document.createElement("span");
      pill.className = "token-pill";
      pill.dataset.color = id % 6;
      const display = trainedBpe.vocab.has(id) ? bytesToDisplay(trainedBpe.vocab.get(id)) : "?" + id;
      pill.innerHTML = `<span>${escapeHtml(display)}</span><span class="token-id-badge">${id}</span>`;
      frag.appendChild(pill);
    });
    encodeSampleResult.appendChild(frag);
    stagger(encodeSampleResult.querySelectorAll(".token-pill"), 14, 48);
    encodeSampleResult.classList.remove("hidden");
  });

  // ==========================================
  // First-Visit Guided Tour
  // ==========================================
  const TOUR_KEY = "tokenizer-tour-v1";
  const TOUR_STEPS = [
    { sel: "#promptInput", title: "PROMPT EDITOR", body: "Type or paste anything — code, Hindi, emoji, secrets. Every keystroke re-tokenizes instantly, right here in your browser." },
    { sel: "#tokensDisplayBox", title: "LIVE TOKEN PILLS", body: "Each pill is one token with its exact ID. Hover any pill for UTF-8 bytes, hex and character range." },
    { sel: "#modelSelect", title: "24 MODELS, ONE DROPDOWN", body: "Switch between GPT-5.6, Claude, Gemini, Llama, Kimi and more. Models marked EXACT use byte-identical official vocabularies." },
    { sel: ".export-bar", title: "SHARE & EXPORT", body: "Copy a permalink to this exact tokenization, grab a ready-to-run Python snippet, or export every token as JSON/CSV." },
    { sel: "#tabLearn", title: "LEARN ACADEMY", body: "Karpathy & 3Blue1Brown courses that play inside the app, plus the Quirks Museum of famous tokenizer glitches." }
  ];
  let tourIdx = 0;
  const tourOverlay = document.getElementById("tourOverlay");
  const tourCard = document.getElementById("tourCard");
  const tourStepTag = document.getElementById("tourStepTag");
  const tourTitle = document.getElementById("tourTitle");
  const tourBody = document.getElementById("tourBody");
  const tourProgress = document.getElementById("tourProgress");

  function showTourStep() {
    const step = TOUR_STEPS[tourIdx];
    const target = document.querySelector(step.sel);
    document.querySelectorAll(".tour-highlight").forEach(el => el.classList.remove("tour-highlight"));
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.classList.add("tour-highlight");
      const rect = target.getBoundingClientRect();
      requestAnimationFrame(() => positionTourCard(rect));
    } else {
      positionTourCard(null);
    }
    tourStepTag.textContent = `TOUR // STEP ${tourIdx + 1}`;
    tourTitle.textContent = step.title;
    tourBody.textContent = step.body;
    tourProgress.textContent = `${tourIdx + 1} / ${TOUR_STEPS.length}`;
  }

  function positionTourCard(rect) {
    const cardW = Math.min(360, window.innerWidth - 24);
    tourCard.style.width = cardW + "px";
    let x = rect ? rect.left + rect.width / 2 - cardW / 2 : window.innerWidth / 2 - cardW / 2;
    let y = rect ? rect.bottom + 14 : window.innerHeight / 2 - 80;
    x = Math.max(12, Math.min(x, window.innerWidth - cardW - 12));
    y = Math.max(12, Math.min(y, window.innerHeight - tourCard.offsetHeight - 12));
    tourCard.style.left = x + "px";
    tourCard.style.top = y + "px";
  }

  let tourReturnFocus = null;
  function endTour() {
    tourOverlay.classList.add("hidden");
    document.querySelectorAll(".tour-highlight").forEach(el => el.classList.remove("tour-highlight"));
    localStorage.setItem(TOUR_KEY, "done");
    if (tourReturnFocus && typeof tourReturnFocus.focus === "function") {
      tourReturnFocus.focus();
    }
    tourReturnFocus = null;
  }

  function startTour() {
    tourReturnFocus = document.activeElement;
    tourIdx = 0;
    tourOverlay.classList.remove("hidden");
    showTourStep();
    // Make overlay focusable for keydown capture
    tourOverlay.setAttribute("tabindex", "-1");
    tourOverlay.focus({ preventScroll: true });
    const first = tourCard.querySelector("button");
    if (first) first.focus();
  }

  // Escape closes the tour; Tab cycles focus between Next/Skip (a11y focus trap)
  tourOverlay.addEventListener("keydown", (e) => {
    if (tourOverlay.classList.contains("hidden")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      endTour();
      return;
    }
    if (e.key === "Tab") {
      const focusables = tourCard.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])");
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.getElementById("tourNext").addEventListener("click", () => {
    tourIdx++;
    if (tourIdx >= TOUR_STEPS.length) endTour();
    else showTourStep();
  });
  document.getElementById("tourSkip").addEventListener("click", endTour);
  document.getElementById("btnTour").addEventListener("click", startTour);
  if (!localStorage.getItem(TOUR_KEY)) setTimeout(startTour, 900);

  // Initial Run
  activeTokenizer = null;
  compareTokenizer = null;
  updateTokenization();

  // Fetch real-time updates from GitHub API
  const githubModalOverlay = document.getElementById("githubModalOverlay");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const githubModalBody = document.getElementById("githubModalBody");
  const btnCheckUpdates = document.getElementById("btnCheckUpdates");
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      githubModalOverlay.classList.add("hidden");
    });
  }

  async function fetchGitHubStatus() {
    if (btnCheckUpdates) {
      btnCheckUpdates.innerHTML = 'Fetching...';
      btnCheckUpdates.disabled = true;
    }

    if (githubModalOverlay && githubModalBody) {
      githubModalOverlay.classList.remove("hidden");
      githubModalBody.innerHTML = "Loading latest commit data...";
    }

    try {
      // Backend-first: when served by server.js, /api/github/commits is a
      // cached proxy that beats GitHub's unauthenticated rate limits.
      // Fallback: direct API call (GitHub Pages / file hosts have no backend).
      let response;
      try {
        response = await fetch("/api/github/commits?per_page=1");
      } catch (backendErr) {
        response = await fetch("https://api.github.com/repos/indranil122/universal-llm-tokenizer/commits?per_page=1");
      }
      if (response.ok) {
        const data = await response.json();
        const date = new Date(data[0].commit.author.date);
        const escapedMsg = escapeHtml(data[0].commit.message).replace(/\n/g, '<br>');
        
        if (githubModalBody) {
          githubModalBody.innerHTML = `
            <div style="margin-bottom: 1rem;">
              <strong style="color: var(--text-primary); font-size: 1.1rem;">Latest Commit on ${date.toLocaleDateString()}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                by <span style="color: var(--accent-cyan);">${escapeHtml(data[0].commit.author.name)}</span>
              </div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-sm); font-family: var(--font-code); font-size: 0.9rem; border: 1px solid var(--border-color); max-height: 200px; overflow-y: auto;">
              ${escapedMsg}
            </div>
            <div style="margin-top: 1.25rem; text-align: right;">
              <a href="${data[0].html_url}" target="_blank" class="github-btn" style="background: var(--accent-cyan); color: #000; border: none; padding: 0.5rem 1rem;">View on GitHub &rarr;</a>
            </div>
          `;
        }
      } else {
        if (githubModalBody) {
          githubModalBody.innerHTML = '<span style="color: #ff5555;">Error: Failed to fetch the latest commit. Rate limit might be exceeded.</span>';
        }
      }
    } catch (err) {
      if (githubModalBody) {
        githubModalBody.innerHTML = '<span style="color: #ff5555;">Error: Failed to fetch the latest commit. Check your connection.</span>';
      }
    } finally {
      if (btnCheckUpdates) {
        btnCheckUpdates.innerHTML = `
          <svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
          </svg>
          Check Live Updates
        `;
        btnCheckUpdates.disabled = false;
      }
    }
  }
  
  if (btnCheckUpdates) {
    btnCheckUpdates.addEventListener("click", fetchGitHubStatus);
  }
});
