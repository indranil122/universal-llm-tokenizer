/**
 * Universal LLM Tokenizer - Landing Page Motion Controller
 * Hero token-slicing showpiece, scroll reveals, mini live tokenizer demo,
 * and the boot-flash navigation fallback. Zero dependencies.
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ==========================================
  // 1. Hero: one word periodically slices into token chips, then reassembles.
  //    The showpiece that demonstrates the product's core idea.
  // ==========================================
  var heroTitle = document.getElementById("heroTitle");
  if (heroTitle && !REDUCED) {
    var words = heroTitle.textContent.trim().split(/\s+/);
    heroTitle.innerHTML = "";
    var wordSpans = words.map(function (w) {
      var span = document.createElement("span");
      span.className = "hero-word";
      span.textContent = w;
      heroTitle.appendChild(span);
      heroTitle.appendChild(document.createTextNode(" "));
      return span;
    });

    var PALETTE = ["0", "1", "2"];

    function sliceWord(span) {
      var text = span.textContent;
      var pieces = [];
      // Split into 2-3 pseudo-tokens like a BPE merge in reverse
      if (text.length > 4) {
        var cut1 = 1 + Math.floor(Math.random() * (text.length - 3));
        var cut2 = text.length > 7 ? cut1 + 1 + Math.floor(Math.random() * (text.length - cut1 - 2)) : -1;
        pieces.push(text.slice(0, cut1));
        if (cut2 > 0) {
          pieces.push(text.slice(cut1, cut2));
          pieces.push(text.slice(cut2));
        } else {
          pieces.push(text.slice(cut1));
        }
      } else {
        var mid = Math.max(1, Math.ceil(text.length / 2));
        pieces.push(text.slice(0, mid));
        pieces.push(text.slice(mid));
      }

      var inserted = [];
      var frag = document.createDocumentFragment();
      pieces.forEach(function (p, i) {
        var chip = document.createElement("span");
        chip.className = "ht-chip";
        chip.dataset.c = PALETTE[i % PALETTE.length];
        chip.textContent = p;
        chip.title = "id " + (1000 + Math.floor(Math.random() * 89999));
        frag.appendChild(chip);
        inserted.push(chip);
      });
      span.style.display = "none";
      span.parentNode.insertBefore(frag, span);

      // Reassemble after a beat: remove only THIS word's tagged chips
      setTimeout(function () {
        inserted.forEach(function (c) { if (c.parentNode) c.remove(); });
        span.style.display = "";
      }, 1900);
    }

    if (wordSpans.length) {
      // Scanline echo: a red bar riding the title's bottom border
      var scan = document.createElement("span");
      scan.className = "hero-scan";
      scan.setAttribute("aria-hidden", "true");
      heroTitle.appendChild(scan);

      setInterval(function () {
        if (document.hidden) return;
        var span = wordSpans[Math.floor(Math.random() * wordSpans.length)];
        if (span && span.style.display !== "none") sliceWord(span);
      }, 3400);
    }
  }

  // ==========================================
  // 2. Scroll reveals with capped stagger per section
  // ==========================================
  var revealTargets = document.querySelectorAll(".feature-card, .how-it-works, .footer-brand, .footer-col-group");
  if ("IntersectionObserver" in window && !REDUCED && revealTargets.length) {
    var groups = new Map();
    revealTargets.forEach(function (el) {
      el.classList.add("reveal");
      var key = el.parentElement || document.body;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    });
    groups.forEach(function (els) {
      els.forEach(function (el, i) {
        el.style.setProperty("--reveal-delay", Math.min(i, 8) * 60 + "ms");
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
    // Safety net: reveal everything if the observer never fires (old engines)
    setTimeout(function () {
      revealTargets.forEach(function (el) { el.classList.add("revealed"); });
    }, 2500);
  }

  // ==========================================
  // 3. Mini live demo — approximate BPE engine, 100% local
  // ==========================================
  var miniInput = document.getElementById("miniDemoInput");
  var miniOut = document.getElementById("miniDemoOut");
  var miniCount = document.getElementById("miniDemoCount");
  var miniTokenizer = null;
  try {
    if (window.BPETokenizer && window.TOKENIZER_VOCABS && window.TOKENIZER_VOCABS.models) {
      var models = window.TOKENIZER_VOCABS.models;
      var cfg = models["gpt-5-6"] || models["gpt-5"] || models[Object.keys(models)[0]];
      if (cfg) miniTokenizer = new window.BPETokenizer(Object.assign({}, cfg, { exact: false }));
    }
  } catch (e) { miniTokenizer = null; }

  function runMiniDemo() {
    if (!miniInput || !miniOut || !miniCount) return;
    var text = miniInput.value;
    var tokens = [];
    if (miniTokenizer) {
      try { tokens = miniTokenizer.tokenize(text); } catch (e) { tokens = []; }
    }
    miniCount.textContent = String(tokens.length);
    var frag = document.createDocumentFragment();
    if (!text) {
      var hint = document.createElement("span");
      hint.className = "md-hint";
      hint.textContent = "// TYPE SOMETHING...";
      frag.appendChild(hint);
    } else {
      tokens.slice(0, 40).forEach(function (t, i) {
        var chip = document.createElement("span");
        chip.className = "md-chip";
        chip.dataset.c = String(i % 4);
        chip.style.animationDelay = Math.min(i, 24) * 14 + "ms";
        chip.textContent = (t.displaySubword || t.text || "").replace(/\n/g, "\\n");
        chip.title = "id " + t.id;
        frag.appendChild(chip);
      });
      if (tokens.length > 40) {
        var more = document.createElement("span");
        more.className = "md-hint";
        more.textContent = "// +" + (tokens.length - 40) + " MORE - OPEN THE APP FOR THE FULL VIEW";
        frag.appendChild(more);
      }
    }
    miniOut.innerHTML = "";
    miniOut.appendChild(frag);
  }

  if (miniInput && miniOut) {
    var debounced;
    miniInput.addEventListener("input", function () {
      clearTimeout(debounced);
      debounced = setTimeout(runMiniDemo, 60);
    });
    runMiniDemo();
  }

  // ==========================================
  // 4. LAUNCH button: boot-flash fallback for browsers without
  //    cross-document view transitions (Chrome 126+ handles it natively)
  // ==========================================
  var launch = document.getElementById("launchBtn");
  if (launch) {
    launch.addEventListener("click", function (e) {
      if (REDUCED || document.startViewTransition) return; // native handoff or a11y
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      document.body.classList.add("boot-flash");
      setTimeout(function () { window.location.href = launch.href; }, 110);
    });
  }
})();

