/**
 * Unit tests for the tokenizer engines.
 * Run with: npm test  (uses Node's built-in test runner — zero dependencies)
 */

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// Shim a browser-like global so the tokenizer modules can load in Node
global.window = global;

require("../tokenizers/vocabularies.js");
require("../tokenizers/bpe.js");
require("../tokenizers/wordpiece.js");
require("../tokenizers/sentencepiece.js");
require("../tokenizers/tiktoken.js");

// Exact vocabulary data (real tiktoken / Llama 3 files)
require("../tokenizers/data/o200k_base.js");
require("../tokenizers/data/cl100k_base.js");
require("../tokenizers/data/p50k_base.js");
require("../tokenizers/data/llama3.js");

const { models } = window.TOKENIZER_VOCABS;

// Mirrors the routing logic in app.js (exact -> real tiktoken engine)
function makeTokenizer(key) {
  const config = models[key] || models["gpt-4o"];
  if (config.exact) {
    return new window.TiktokenTokenizer(Object.assign({}, config, {
      tiktokenData: window.TIKTOKEN_DATA[config.tiktokenData]
    }));
  }
  if (key === "bert" || config.family?.includes("WordPiece")) {
    return new window.WordPieceTokenizer(config);
  }
  if (key.includes("gemini") || key === "llama-2" || config.family?.includes("SentencePiece")) {
    return new window.SentencePieceTokenizer(config);
  }
  return new window.BPETokenizer(config);
}

// Parse the model dropdown options straight from app.html so this test can
// never silently drift from the actual UI
const html = fs.readFileSync(path.join(__dirname, "..", "app.html"), "utf8");
const UI_MODEL_KEYS = [...new Set([...html.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]))];

test("every model in the UI dropdown has a real config (no silent fallback)", () => {
  assert.ok(UI_MODEL_KEYS.length >= 14, `expected at least 14 dropdown options, got ${UI_MODEL_KEYS.length}`);
  for (const key of UI_MODEL_KEYS) {
    assert.ok(models[key], `missing config for model key "${key}"`);
  }
});

test("all models expose required config fields + contextWindow", () => {
  for (const [key, cfg] of Object.entries(models)) {
    assert.ok(cfg.name, `${key}: missing name`);
    assert.ok(cfg.vocabMap, `${key}: missing vocabMap`);
    assert.ok(cfg.costPer1M?.input > 0, `${key}: missing costPer1M.input`);
    assert.ok(Number.isInteger(cfg.contextWindow) && cfg.contextWindow > 0, `${key}: missing contextWindow`);
  }
});

test("exact models route to the real tiktoken data", () => {
  const exact = Object.entries(models).filter(([, c]) => c.exact);
  assert.strictEqual(exact.length, 4, "expected exactly 4 exact models");
  assert.deepStrictEqual(exact.map(([k]) => k).sort(), ["gpt-3", "gpt-4", "gpt-4o", "llama-3"]);
  for (const [, c] of exact) {
    assert.ok(window.TIKTOKEN_DATA[c.tiktokenData], `missing tiktoken data for ${c.tiktokenData}`);
  }
});

// ---- exact engine ground truths (verified against the official tiktoken runtime) ----

test("exact: GPT-4o (o200k_base) 'Hello World!' -> [13225, 5922, 0]", () => {
  const ids = makeTokenizer("gpt-4o").tokenize("Hello World!").map(t => t.id);
  assert.deepStrictEqual(ids, [13225, 5922, 0]);
});

test("exact: GPT-4 (cl100k_base) 'Hello World!' -> [9906, 4435, 0]", () => {
  const ids = makeTokenizer("gpt-4").tokenize("Hello World!").map(t => t.id);
  assert.deepStrictEqual(ids, [9906, 4435, 0]);
});

test("exact: Llama 3 'Hello' -> [9906] and GPT-3 (p50k) 'Hello' -> [15496]", () => {
  assert.deepStrictEqual(makeTokenizer("llama-3").tokenize("Hello").map(t => t.id), [9906]);
  assert.deepStrictEqual(makeTokenizer("gpt-3").tokenize("Hello").map(t => t.id), [15496]);
});

test("exact: case-insensitive contractions ((?i: group) — 'I'M' -> [40, 28703]", () => {
  assert.deepStrictEqual(makeTokenizer("gpt-4").tokenize("I'M").map(t => t.id), [40, 28703]);
  assert.deepStrictEqual(makeTokenizer("gpt-4").tokenize("I'm").map(t => t.id), [40, 2846]);
});

test("exact: unicode & emoji encode without mangling (no replacement chars)", () => {
  const text = "नमस्ते दुनिया! こんにちは世界 🚀 👨\u200d👩\u200d👧\u200d👦";
  const tokens = makeTokenizer("gpt-4o").tokenize(text);
  assert.ok(tokens.length >= 10, "expected many subword tokens");
  assert.ok(tokens.every(t => !t.text.includes("\uFFFD")), "no U+FFFD replacement characters");
  const rebuilt = tokens.map(t => text.slice(t.start, t.end)).join("");
  assert.strictEqual(rebuilt, text, "tokens must tile the original text exactly");
});

test("exact: special tokens from the official registry are recognized", () => {
  const t = makeTokenizer("gpt-4o").tokenize("Hello <|endoftext|>");
  const ids = t.map(x => x.id);
  assert.ok(ids.includes(199999), "o200k <|endoftext|> id 199999");
  assert.strictEqual(t.find(x => x.id === 199999).type, "special");
});

// ---- approximate engines (BERT / SentencePiece / fallback BPE) ----

test("BERT wraps input in [CLS] and [SEP]", () => {
  const t = makeTokenizer("bert").tokenize("Hello");
  assert.strictEqual(t[0].displaySubword, "[CLS]");
  assert.strictEqual(t[t.length - 1].displaySubword, "[SEP]");
});

test("SentencePiece models use the ▁ space marker", () => {
  const t = makeTokenizer("gemini-2-flash").tokenize("Hello world");
  assert.ok(t.some(x => x.displaySubword.includes("▁")));
});

test("tokens reconstruct the original text (BPE round-trip)", () => {
  const text = "Hello World! How does AI tokenize 中文 text? 🤖";
  const tokens = makeTokenizer("qwen-2-5").tokenize(text);
  const rebuilt = tokens.map(x => text.slice(x.start, x.end)).join("");
  assert.strictEqual(rebuilt, text);
});

test("tokens are contiguous and non-overlapping (BPE)", () => {
  const text = "The quick brown fox jumps over the lazy dog 12345";
  const tokens = makeTokenizer("qwen-2-5").tokenize(text);
  for (let i = 0; i < tokens.length; i++) {
    assert.ok(tokens[i].start >= 0 && tokens[i].end <= text.length);
    if (i > 0) assert.strictEqual(tokens[i].start, tokens[i - 1].end);
  }
});

test("BPE merge steps are produced for multi-char text", () => {
  const steps = makeTokenizer("gpt-4o").getMergeSteps("helloo");
  assert.ok(Array.isArray(steps) && steps.length >= 2);
  assert.strictEqual(steps[0].title, "Raw Input Text");
});

test("every token exposes id, bytes, hexBytes and type", () => {
  const tokens = makeTokenizer("qwen-2-5").tokenize("Test 🚀");
  for (const t of tokens) {
    assert.ok(Number.isInteger(t.id));
    assert.ok(Array.isArray(t.bytes));
    assert.ok(Array.isArray(t.hexBytes));
    assert.ok(typeof t.type === "string");
  }
});
