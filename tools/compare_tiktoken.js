// Compare our engine against the official tiktoken npm package.
// Run: NODE_PATH=/tmp/node_modules node tools/compare_tiktoken.js
global.window = global;
require("../tokenizers/data/o200k_base.js");
require("../tokenizers/data/cl100k_base.js");
require("../tokenizers/data/p50k_base.js");
require("../tokenizers/tiktoken.js");

const tk = require("tiktoken");
const ours = window.TIKTOKEN_DATA;

const REGEX = /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

const encodings = ["cl100k_base", "o200k_base", "p50k_base"];

const samples = [
  "Hello World!",
  "hello world",
  "Hello",
  " world",
  "The quick brown fox jumps over 12345 🚀",
  "नमस्ते दुनिया! こんにちは世界",
  "def calculate_tokens(prompt: str) -> list[int]:",
  "👨\u200d👩\u200d👧\u200d👦 family emoji!",
];

let allPass = true;
for (const name of encodings) {
  const enc = tk.get_encoding(name);
  const mine = new window.TiktokenTokenizer({ tiktokenData: ours[name], regex: REGEX });
  for (const s of samples) {
    const expected = Array.from(enc.encode(s));
    const got = mine.tokenize(s).map(t => t.id);
    const pass = JSON.stringify(expected) === JSON.stringify(got);
    if (!pass) allPass = false;
    console.log((pass ? "PASS" : "FAIL") + " | " + name + " | " + JSON.stringify(s) +
      "\n      official: " + JSON.stringify(expected) +
      "\n      ours:     " + JSON.stringify(got));
  }
}
console.log(allPass ? "\nALL MATCH OFFICIAL TIKTOKEN ✓" : "\nMISMATCHES FOUND ✗");
