/**
 * Universal LLM Tokenizer & Visualizer - Main Controller
 * Handles real-time input tokenization, prompt word highlighting,
 * side-by-side model comparison, interactive BPE stepping, exact
 * tiktoken routing, token bars, context meter, script detection,
 * and the all-models battle table.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Model Instances
  const modelConfigs = window.TOKENIZER_VOCABS.models;
  let activeModelKey = "gpt-5";
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

  const playgroundView = document.getElementById("playgroundView");
  const bpeStepView = document.getElementById("bpeStepView");
  const battleView = document.getElementById("battleView");
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
        const sizes = { o200k_base: "3.6", cl100k_base: "1.5", p50k_base: "0.7", llama3: "4.2" };
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

    // Render everything
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
  }

  // ==========================================
  // Render Token Pills / Bars
  // ==========================================
  function renderTokenPills(container, tokens) {
    container.innerHTML = "";

    if (tokens.length === 0) {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">Type or paste text above to see tokens live...</span>`;
      return;
    }

    if (viewMode === "bars") {
      renderTokenBars(container, tokens);
      return;
    }

    container.classList.remove("bar-mode");

    tokens.forEach((token, idx) => {
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

      container.appendChild(pill);
    });
  }

  function renderTokenBars(container, tokens) {
    container.classList.add("bar-mode");
    const wrap = document.createElement("div");
    wrap.className = "token-bars";
    const maxBytes = Math.max.apply(null, tokens.map(t => (t.bytes && t.bytes.length) || 1));

    tokens.forEach((token, idx) => {
      const bar = document.createElement("div");
      bar.className = "token-bar";
      bar.dataset.color = idx % 6;
      bar.dataset.tokenIdx = idx;
      // width proportional to byte length — longer subwords = wider bars
      const w = Math.max(3, Math.round((((t.bytes && t.bytes.length) || 1) / maxBytes) * 100));
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

    while ((match = wordRegex.exec(text)) !== null) {
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

    charCountElem.textContent = charCount.toLocaleString();
    wordCountElem.textContent = words.toLocaleString();
    tokenCountElem.textContent = tokenCount.toLocaleString();
    ratioCountElem.textContent = `${ratio} tokens/word`;

    const config = configFor(activeModelKey);
    if (config && config.costPer1M) {
      const estCost = ((tokenCount / 1000000) * config.costPer1M.input).toFixed(6);
      costEstimateElem.textContent = `$${estCost}`;
    }

    // Context window meter
    const ctx = config && config.contextWindow;
    if (ctx && contextBar && contextLabel) {
      const pct = Math.min(100, (tokenCount / ctx) * 100);
      contextBar.style.width = pct.toFixed(3) + "%";
      contextLabel.textContent = `${pct.toFixed(2)}% / ${ctx.toLocaleString()}`;
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
    tokenPopover.style.display = "flex";

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

  function hidePopover() {
    tokenPopover.style.display = "none";
  }

  // ==========================================
  // BPE Step-by-Step Engine
  // ==========================================
  function updateBPESteps(text) {
    const bpeStepsContainer = document.getElementById("bpeStepsContainer");
    if (!bpeStepsContainer || !activeTokenizer.getMergeSteps) return;

    const steps = activeTokenizer.getMergeSteps(text);
    bpeStepsContainer.innerHTML = "";

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

    let html = `<div class="battle-note">Sorted by <strong>fewest tokens</strong> (cheapest & fastest wins). 🏆 = lowest token count. Click a row to inspect it in the playground.</div>`;
    html += `<table class="battle-table">
      <thead><tr>
        <th>#</th><th>Model</th><th>Tokenizer</th><th>Tokens</th><th>Tokens/Word</th><th>Est. Cost (input)</th><th>Context Used</th>
      </tr></thead><tbody>`;

    rows.forEach((r, i) => {
      const active = r.key === activeModelKey ? ' class="battle-row-active"' : "";
      const trophy = i === 0 && r.count > 0 ? " 🏆" : "";
      html += `<tr${active} data-key="${r.key}">
        <td>${i + 1}${trophy}</td>
        <td>${r.cfg.name}${r.cfg.exact ? ` <span class="exact-tag" title="Real vocabulary — matches official tiktoken">EXACT</span>` : ""}</td>
        <td class="battle-mono">${r.cfg.family}</td>
        <td class="battle-mono battle-strong">${r.count.toLocaleString()}</td>
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

  promptInput.addEventListener("input", updateTokenization);

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

  // Navigation Tabs
  tabPlayground.addEventListener("click", () => switchTab("playground"));
  tabCompare.addEventListener("click", () => switchTab("compare"));
  tabStepBPE.addEventListener("click", () => switchTab("bpe"));
  tabBattle.addEventListener("click", () => switchTab("battle"));

  function switchTab(tabName) {
    [tabPlayground, tabCompare, tabStepBPE, tabBattle].forEach(btn => btn.classList.remove("active"));
    [playgroundView, bpeStepView, battleView].forEach(view => view.classList.add("hidden"));

    if (tabName === "playground") {
      tabPlayground.classList.add("active");
      playgroundView.classList.remove("hidden");
      compareContainer.classList.add("hidden");
    } else if (tabName === "compare") {
      tabCompare.classList.add("active");
      playgroundView.classList.remove("hidden");
      compareContainer.classList.remove("hidden");
    } else if (tabName === "bpe") {
      tabStepBPE.classList.add("active");
      bpeStepView.classList.remove("hidden");
    } else if (tabName === "battle") {
      tabBattle.classList.add("active");
      battleView.classList.remove("hidden");
      renderBattle();
      return;
    }
    updateTokenization();
  }

  // Utility to escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

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
      const response = await fetch("https://api.github.com/repos/indranil122/universal-llm-tokenizer/commits?per_page=1");
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
