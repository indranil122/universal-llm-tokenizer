/**
 * Unit tests for the tokenizer engines.
 * Run with: npm test  (uses Node's built-in test runner — zero dependencies)
 */

const { test } = require("node:test");
const assert = require("node:assert");

// Shim a browser-like global so the tokenizer modules can load in Node
global.window = global;

require("../tokenizers/vocabularies.js");
require("../tokenizers/bpe.js");
require("../tokenizers/wordpiece.js");
require("../tokenizers/sentencepiece.js");

const { models } = window.TOKENIZER_VOCABS;

// Mirrors the routing logic in app.js
function makeTokenizer(key) {
  const config = models[key] || models["gpt-4o"];
  if (key === "bert" || config.family?.includes("WordPiece")) {
    return new window.WordPieceTokenizer(config);
  }
  if (key.includes("gemini") || key === "llama-2" || config.family?.includes("SentencePiece")) {
    return new window.SentencePieceTokenizer(config);
  }
  return new window.BPETokenizer(config);
}

// Every model the UI dropdown offers must have a real config
const UI_MODEL_KEYS = [
  "gpt-4o", "gpt-4", "gpt-3", "llama-3", "llama-2",
  "claude-3-5", "claude-3-opus", "gemini-2-flash", "bert",
  "deepseek-r1", "qwen-2-5", "mistral-large", "grok-2", "cohere-command-r",
];

test("all 14 UI models have real configs (no silent GPT-4o fallback)", () => {
  for (const key of UI_MODEL_KEYS) {
    assert.ok(models[key], `missing config for model key "${key}"`);
  }
  assert.strictEqual(Object.keys(models).length, 14);
});

test("GPT-4o tokenizes 'Hello World!' with known IDs", () => {
  const t = makeTokenizer("gpt-4o").tokenize("Hello World!");
  const ids = t.map(x => x.id);
  assert.ok(ids.includes(13225), "expected 'Hello' id 13225"); // Hello
  assert.ok(ids.includes(2024), "expected ' World' id 2024");  // " World"
  assert.strictEqual(t[t.length - 1].id, 0);                   // "!"
});

test("GPT-4 tokenizes 'Hello World!' with cl100k IDs", () => {
  const t = makeTokenizer("gpt-4").tokenize("Hello World!");
  const ids = t.map(x => x.id);
  assert.ok(ids.includes(15496)); // Hello
  assert.ok(ids.includes(2159));  // " World"
});

test("Llama 3 maps 'Hello' to 9906", () => {
  const t = makeTokenizer("llama-3").tokenize("Hello");
  assert.ok(t.map(x => x.id).includes(9906));
});

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
  const tokens = makeTokenizer("gpt-4o").tokenize(text);
  const rebuilt = tokens.map(x => text.slice(x.start, x.end)).join("");
  assert.strictEqual(rebuilt, text);
});

test("tokens are contiguous and non-overlapping (BPE)", () => {
  const text = "The quick brown fox jumps over the lazy dog 12345";
  const tokens = makeTokenizer("gpt-4o").tokenize(text);
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
