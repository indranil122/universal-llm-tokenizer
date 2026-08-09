<div align="center">

# 🤖 Universal LLM Tokenizer & Visualizer

### *See exactly how AI models "read" your text — in real time*

**Type a prompt. Watch GPT-5, Llama 4, Claude, Gemini 3, DeepSeek & 15 models split it into subword tokens — live, color-coded, with exact token IDs.**

[![Live Demo](https://img.shields.io/badge/%F0%9F%96%A5%EF%B8%8F_Live_Demo-GitHub_Pages-2ea44f?style=for-the-badge)](https://indranil122.github.io/universal-llm-tokenizer/)
[![Zero Dependencies](https://img.shields.io/badge/Zero%20Dependencies-Vanilla%20JS-f7df1e?style=for-the-badge)]()
[![No API Keys](https://img.shields.io/badge/No%20API%20Keys-100%25%20Client--side-0a66c2?style=for-the-badge)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)]()

**Open-source · Free forever · Works offline · Runs entirely in your browser**

</div>

---

## ✨ Why you'll love it

Understanding **tokenization** is the #1 hidden skill in the AI world — it decides your **costs**, your **context limits**, and even your **model's intelligence**. This tool makes it *visible* for the first time:

- ⚡ **Real-time tokenization** — every keystroke instantly re-tokenizes your prompt
- 🧩 **Color-coded token pills** with **exact token IDs** (hover for UTF-8 bytes, hex, and character ranges)
- 🎯 **EXACT tokenization** — GPT-5, GPT-4o, GPT-4, GPT-3 & Llama 4 ship the **real vocabularies** (byte-identical to official tiktoken — verified by the test suite & validation tools)
- ⚔️ **All-models battle table** — run the same prompt through all 15 models, ranked by token count, cost & context usage
- 🧾 **Context-window meter** — see exactly what % of each model's context window your prompt consumes
- 🌐 **Script detection** — instantly see which scripts (Devanagari, CJK, Arabic, Emoji…) are inflating your token count
- ▦ **Token bar view** — flip pills into byte-length bars for a screenshot-worthy overview
- 🔄 **Side-by-side model comparison** — see GPT-5 vs Llama 4 vs Gemini 3 disagree on the same sentence
- 📊 **Word ➜ Token breakdown matrix** — which words explode into multiple tokens?
- 💰 **Live API cost estimator** — how much will this prompt cost on each model?
- ⏯️ **Step-by-step BPE engine** — watch raw characters literally *merge* into subwords
- 🌍 **One-click presets** — code, multilingual, emoji, numbers, and system tags (try the famous `SolidGoldMagikarp` glitch!)
- 🖱️ **Hover-sync highlighting** — hover a token pill and watch it light up inside your text

> 💡 **The "aha" moment:** type `Hello World!` in English, then switch to a Devanagari or Japanese word — and watch one word explode into 10+ tokens. *That's* why AI is bad at non-English languages.

---

## 🧠 Supported Models

The lineup tracks the **models that are actually live right now** (July/Aug 2026). Retired or deprecated models are kept — clearly labeled — because their tokenizers are still worth studying and the exact vocabulary files are byte-identical to the official ones.

| Model | Tokenizer Engine | Vocab Size | Context | Status |
|---|---|---|---|---|
| OpenAI **GPT-5** / GPT-5.x family | ✅ Exact BPE (`o200k_base`) | 200,000 | 400k | 🟢 Current |
| OpenAI GPT-4o / GPT-4o-mini | ✅ Exact BPE (`o200k_base`) | 200,000 | 128k | 🟡 Legacy API |
| OpenAI GPT-4 / GPT-3.5 Turbo | ✅ Exact BPE (`cl100k_base`) | 100,000 | 8k | 🟡 Legacy |
| OpenAI GPT-3 / GPT-2 / Codex | ✅ Exact BPE (`p50k_base`) | 50,000 | 2,049 | ⚪ Retired |
| Meta **Llama 4** Scout / Maverick | ✅ Exact Tiktoken BPE (Llama 3 128k vocab) | 128,256 | 1M (Scout: 10M) | 🟢 Current |
| Meta Llama 2 / Llama 1 | SentencePiece | 32,000 | 4k | ⚪ Retired |
| Anthropic **Claude Opus 5** | Claude BPE* | 100,000+ | 1M | 🟢 Current |
| Anthropic **Claude Sonnet 5** | Claude BPE* | 100,000+ | 200k | 🟢 Current |
| Google **Gemini 3 Pro** / 3 Flash | SentencePiece (Unigram)* | 256,000 | 1M | 🟢 Current |
| Google BERT | WordPiece | 30,522 | 512 | ⚪ Retired |
| DeepSeek **V4** / V3.2 | Byte-fallback BPE* | 128,000 | 1M | 🟢 Current |
| Alibaba **Qwen 3.5** / Qwen Coder | Byte-fallback BPE* | 151,646 | 256k | 🟢 Current |
| Mistral **Large 3** / Small | Tekken BPE* | 131,072 | 256k | 🟢 Current |
| xAI **Grok 4** / Grok 4.5 | BPE* | 131,000 | 500k | 🟢 Current |
| Cohere **Command A+** | BPE* | 256,000 | 128k | 🟢 Current |

**15 models · 4 tokenizer engines (real tiktoken, BPE, WordPiece, SentencePiece) · 0 servers**

> ✅ **Exact** = the real vocabulary file is embedded and token IDs are byte-identical to the official tokenizer.
> 🟢 **Current** = actively served by the vendor today. 🟡 = available but deprecated.
> \* = these vendors don't publish their tokenizer files, so their engine is a faithful approximation (clearly labeled in-app). Anthropic's Claude 3.x, Google's Gemini 2.0/1.5, and xAI's Grok 2 have been retired by their vendors and were replaced with their current successors above.

---

## 🚀 Quick Start

**Option 1 — Just use it:** open the [live demo](https://indranil122.github.io/universal-llm-tokenizer/). No install, no API keys, no signup.

**Option 2 — Run locally:**

```bash
# Clone it
git clone https://github.com/indranil122/universal-llm-tokenizer.git
cd universal-llm-tokenizer

# Serve it (pick one)
python -m http.server 8080     # then open http://localhost:8080
npx serve .                    # or this
```

That's it — there are **no dependencies, no build step, no node_modules**.

---

## 🛠️ How It Works

The project ships **four real tokenizer engines** implemented from scratch in vanilla JavaScript:

- **`tokenizers/tiktoken.js`** — the *actual* byte-level BPE algorithm (merge-rank greedy merging, per-encoding `pat_str` regexes, case-insensitive contraction groups, official special tokens) — verified byte-identical to OpenAI's official `tiktoken` runtime for **o200k_base**, **cl100k_base** and **p50k_base**, and to **Llama 3/4**'s 128k tokenizer
- **`tokenizers/bpe.js`** — approximate Byte-Pair Encoding (Claude, DeepSeek, Qwen, Grok, Cohere, Mistral) with greedy longest-match subword splitting and byte-fallback for unknown characters
- **`tokenizers/sentencepiece.js`** — SentencePiece-style engine (Gemini's Unigram, Llama 2) with `▁` space markers
- **`tokenizers/wordpiece.js`** — WordPiece engine (BERT) with `##` subword prefixes

Every token exposes its **ID, UTF-8 bytes, hex representation, and character range** — so you can inspect exactly how any model encodes any string, including multi-byte Unicode and emoji. The exact vocabularies (real `o200k/cl100k/p50k` files + Llama's `tokenizer.json`, ~10 MB) are lazy-loaded on demand — the page stays instant, then streams the exact data only when you pick an exact model or open the battle tab.

```
Text:  "Hello World!"
       ↓  BPE pre-tokenization regex
Words: ["Hello", " World", "!"]
       ↓  Greedy vocabulary lookup + merge
Tokens:[Hello(13225)] [ World(2024)] [!(0)]
```

---

## 📁 Project Structure

```
├── app.html                 # Main UI (playground, compare, BPE, all-models battle)
├── index.html               # Landing page
├── landing.css              # Landing page styling
├── app.js                   # Main controller: tokenization, sync, metrics, popovers
├── index.css                # App styling (light brutalist theme)
├── favicon.svg              # Site icon
├── social-preview.png       # Social share image
├── test/
│   └── tokenizer.test.js    # Zero-dependency node:test suite (npm test)
├── tokenizers/
│   ├── vocabularies.js      # 15 model configs (context windows, costs, exact flags)
│   ├── tiktoken.js          # Exact byte-BPE engine (verified vs official tiktoken)
│   ├── bpe.js               # Approximate Byte-Pair Encoding engine
│   ├── wordpiece.js         # WordPiece engine (BERT)
│   ├── sentencepiece.js     # SentencePiece engine (Gemini, Llama 2)
│   └── data/                # Real vocabularies (o200k, cl100k, p50k, llama3)
│       └── raw/             # Original source files (.tiktoken, tokenizer.json)
├── tools/
│   ├── convert_vocab.js     # Converts official tokenizer files -> data/*.js
│   ├── compare_tiktoken.js  # Validates engine vs the official npm tiktoken package
│   └── validate_tiktoken.js # Round-trip / offset integrity checks
└── package.json             # npm test (zero-dependency node:test suite)
```

---

## 🧪 Verified Accuracy

`npm test` runs a zero-dependency suite with **hardcoded ground-truth token IDs** (each originally verified against the official tiktoken runtime): `"Hello World!"` → `[9906, 4435, 0]` on cl100k, case-insensitive contractions (`"I'M"` → `[40, 28703]`), Devanagari/CJK/emoji round-trips, and a guard that every dropdown model in `app.html` has a real config (so the UI can never silently drift from the model database). `tools/compare_tiktoken.js` can re-verify the whole engine against the official npm package any time.

---

## 🤝 Contributing

Have an idea to make this more viral? PRs are welcome!

- 🌐 **More models** — add new vocabularies (e.g., Phi, Nemotron, Kimi) or refresh model names as new versions ship
- 🎯 **More exact vocabularies** — Anthropic/xAI/Google don't publish theirs, but any tokenizer with a public file can be swapped in via `tools/convert_vocab.js`
- 📈 **Token-efficient prompt tips** — in-app optimization suggestions
- ✨ **Anything** that makes tokenization more fun to learn

---

## 📜 License

[MIT](LICENSE) — free to use, fork, and remix. If this helped you, a ⭐ would make my day!

---

<div align="center">

**Made with ❤️ for the open-source AI community**

[![GitHub stars](https://img.shields.io/github/stars/indranil122/universal-llm-tokenizer?style=social)](https://github.com/indranil122/universal-llm-tokenizer)

</div>
