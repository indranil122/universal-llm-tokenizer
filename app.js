/**
 * Universal LLM Tokenizer & Visualizer - Main Controller
 * Handles real-time input tokenization, prompt word highlighting, 
 * side-by-side model comparison, and interactive BPE stepping.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Model Instances
  const modelConfigs = window.TOKENIZER_VOCABS.models;
  let activeModelKey = "gpt-4o";
  let compareModelKey = "llama-3";
  let activeTokenizer = null;
  let compareTokenizer = null;

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

  // Mapping Table & Popover
  const mappingTableBody = document.getElementById("mappingTableBody");
  const tokenPopover = document.getElementById("tokenPopover");

  // Navigation Tabs
  const tabPlayground = document.getElementById("tabPlayground");
  const tabCompare = document.getElementById("tabCompare");
  const tabStepBPE = document.getElementById("tabStepBPE");
  const tabDecoder = document.getElementById("tabDecoder");

  const playgroundView = document.getElementById("playgroundView");
  const bpeStepView = document.getElementById("bpeStepView");
  const decoderView = document.getElementById("decoderView");

  // Current Tokens State
  let currentTokens = [];
  let currentCompareTokens = [];

  // ==========================================
  // Real-Time Tokenization & UI Sync
  // ==========================================
  function updateTokenization() {
    const text = promptInput.value;

    // Run active tokenizer
    currentTokens = activeTokenizer.tokenize(text);

    // 1. Render Token Pills
    renderTokenPills(tokensDisplayBox, currentTokens);

    // 2. Render Prompt Highlight Backdrop
    renderPromptHighlights(text, currentTokens);

    // 3. Render Prompt Word Mapping Table
    renderMappingTable(text, currentTokens);

    // 4. Update Metrics Bar
    updateMetrics(text, currentTokens);

    // 5. If Compare View is active, run compare tokenizer
    if (!compareContainer.classList.contains("hidden")) {
      currentCompareTokens = compareTokenizer.tokenize(text);
      renderTokenPills(compareTokensDisplayBox, currentCompareTokens);
    }

    // 6. Update BPE Step View if active
    updateBPESteps(text);
  }

  // ==========================================
  // Render Token Pills
  // ==========================================
  function renderTokenPills(container, tokens) {
    container.innerHTML = "";

    if (tokens.length === 0) {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">Type or paste text above to see tokens live...</span>`;
      return;
    }

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
      tdCount.style.color = matchingTokens.length > 1 ? "#FFFFFF" : "#A3A3A3";
      tdCount.textContent = `${matchingTokens.length} token${matchingTokens.length > 1 ? 's' : ''}`;

      tr.appendChild(tdWord);
      tr.appendChild(tdTokens);
      tr.appendChild(tdCount);
      mappingTableBody.appendChild(tr);
    }
  }

  // ==========================================
  // Metrics & Cost Calculator
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

    // Estimate API Cost per 1M input tokens
    const config = modelConfigs[activeModelKey];
    if (config && config.costPer1M) {
      const estCost = ((tokenCount / 1000000) * config.costPer1M.input).toFixed(6);
      costEstimateElem.textContent = `$${estCost}`;
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
  // Model Selectors & Event Listeners
  // ==========================================
  modelSelect.addEventListener("change", (e) => {
    activeModelKey = e.target.value;
    activeTokenizer = createTokenizer(activeModelKey);
    updateTokenization();
  });

  compareModelSelect.addEventListener("change", (e) => {
    compareModelKey = e.target.value;
    compareTokenizer = createTokenizer(compareModelKey);
    updateTokenization();
  });

  function createTokenizer(key) {
    const config = modelConfigs[key] || modelConfigs["gpt-4o"];
    if (key === "bert" || config.family?.includes("WordPiece")) {
      return new window.WordPieceTokenizer(config);
    }
    if (key.includes("gemini") || key === "llama-2" || config.family?.includes("SentencePiece")) {
      return new window.SentencePieceTokenizer(config);
    }
    return new window.BPETokenizer(config);
  }

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

  function switchTab(tabName) {
    [tabPlayground, tabCompare, tabStepBPE].forEach(btn => btn.classList.remove("active"));
    [playgroundView, bpeStepView].forEach(view => view.classList.add("hidden"));

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
  activeTokenizer = createTokenizer(activeModelKey);
  compareTokenizer = createTokenizer(compareModelKey);
  updateTokenization();
});
