<div align="center">

# 🤖 Universal LLM Tokenizer & Visualizer

### *See exactly how AI models "read" your text — in real time*

**Type a prompt. Watch GPT-4o, Llama 3, Claude, Gemini, DeepSeek & 14 models split it into subword tokens — live, color-coded, with exact token IDs.**

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
- 🔄 **Side-by-side model comparison** — see GPT-4o vs Llama 3 vs Gemini disagree on the same sentence
- 📊 **Word ➜ Token breakdown matrix** — which words explode into multiple tokens?
- 💰 **Live API cost estimator** — how much will this prompt cost on each model?
- ⏯️ **Step-by-step BPE engine** — watch raw characters literally *merge* into subwords
- 🌍 **One-click presets** — code, multilingual, emoji, numbers, and system tags (try the famous `SolidGoldMagikarp` glitch!)
- 🖱️ **Hover-sync highlighting** — hover a token pill and watch it light up inside your text

> 💡 **The "aha" moment:** type `Hello World!` in English, then switch to a Devanagari or Japanese word — and watch one word explode into 10+ tokens. *That's* why AI is bad at non-English languages.

---

## 🧠 Supported Models

| Model | Tokenizer Engine | Vocab Size |
|---|---|---|
| OpenAI **GPT-4o** / GPT-4o-mini | BPE (`o200k_base`) | 200,000 |
| OpenAI **GPT-4** / GPT-3.5 Turbo | BPE (`cl100k_base`) | 100,000 |
| OpenAI GPT-3 / GPT-2 / Codex | BPE (`p50k`/`r50k`) | 50,000 |
| Meta **Llama 3.3 / 3.2 / 3.1** | Tiktoken BPE | 128,256 |
| Meta Llama 2 / Llama 1 | SentencePiece | 32,000 |
| Anthropic **Claude 3.5** Sonnet / Haiku | Claude BPE | 100,000+ |
| Anthropic Claude 3 Opus | Claude BPE | 100,000+ |
| Google **Gemini 2.0** Flash / 1.5 Pro | SentencePiece (Unigram) | 256,000 |
| Google BERT | WordPiece | 30,522 |
| DeepSeek **R1** / V3 | Byte-fallback BPE | 128,000 |
| Alibaba **Qwen 2.5** / Qwen Coder | Byte-fallback BPE | 151,646 |
| Mistral **Large** / Mixtral | Tekken BPE | 131,000 |
| xAI **Grok 2** / Grok 1.5 | BPE | 131,000 |
| Cohere Command R+ | BPE | 256,000 |

**14 models. 3 tokenizer engines (BPE, WordPiece, SentencePiece). 0 servers.**

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

The project ships **three real tokenizer engines** implemented from scratch in vanilla JavaScript:

- **`tokenizers/bpe.js`** — Byte-Pair Encoding (OpenAI tiktoken-style, Llama 3, DeepSeek, Qwen, Grok, Cohere) with greedy longest-match subword splitting and byte-fallback for unknown characters
- **`tokenizers/sentencepiece.js`** — SentencePiece-style engine (Gemini's Unigram, Llama 2) with `▁` space markers
- **`tokenizers/wordpiece.js`** — WordPiece engine (BERT) with `##` subword prefixes

Every token exposes its **ID, UTF-8 bytes, hex representation, and character range** — so you can inspect exactly how any model encodes any string, including multi-byte Unicode and emoji.

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
├── index.html               # Single-page UI (playground, compare, BPE views)
├── app.js                   # Main controller: tokenization, sync, metrics, popovers
├── index.css                # Dark theme styling
├── tokenizers/
│   ├── vocabularies.js      # Model configs + realistic vocabulary/ID database
│   ├── bpe.js               # Byte-Pair Encoding engine
│   ├── wordpiece.js         # WordPiece engine (BERT)
│   └── sentencepiece.js     # SentencePiece engine (Gemini, Llama 2)
└── package.json             # Dev scripts (static server)
```

---

## 🤝 Contributing

Have an idea to make this more viral? PRs are welcome!

- 🌐 **More models** — add new vocabularies (e.g., Phi-3, Nemotron, Kimi)
- 🎯 **Exact vocabularies** — swap in official `tiktoken` / HuggingFace vocab JSONs
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
