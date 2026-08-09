// Round-trip + offset-integrity validation for the exact tiktoken engine.
// Verifies: token IDs are integers, and token start/end offsets tile the
// original text exactly (no gaps, no overlaps, no byte-mangling).
// The authoritative id-level check is tools/compare_tiktoken.js (vs the
// official npm tiktoken package); this script validates our offset math.
global.window = global;
require("../tokenizers/data/o200k_base.js");
require("../tokenizers/data/cl100k_base.js");
require("../tokenizers/data/p50k_base.js");
require("../tokenizers/data/llama3.js");
require("../tokenizers/tiktoken.js");

const samples = [
  "Hello World!",
  "The quick brown fox jumps over 12345 🚀",
  "नमस्ते दुनिया! こんにちは世界",
  "مرحبا بالعالم Привет мир 안녕하세요",
  "👨\u200d👩\u200d👧\u200d👦 family emoji!",
  "def calculate_tokens(prompt: str) -> list[int]:",
  "  spaced  out  \n\ttabs\there",
  "I'M YOU'RE IT'S don't can't",
];

let allPass = true;
for (const name of Object.keys(window.TIKTOKEN_DATA)) {
  const T = new window.TiktokenTokenizer({ tiktokenData: window.TIKTOKEN_DATA[name] });
  for (const s of samples) {
    const tokens = T.tokenize(s);
    const rebuilt = tokens.map(t => s.slice(t.start, t.end)).join("");
    const tilingOk = rebuilt === s;
    const intsOk = tokens.every(t => Number.isInteger(t.id) && t.id >= 0);
    const orderOk = tokens.every((t, i) => i === 0 || t.start === tokens[i - 1].end);
    const pass = tilingOk && intsOk && orderOk;
    if (!pass) allPass = false;
    console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(s.slice(0, 28))} | tokens=${tokens.length}`);
    if (!pass) {
      console.log(`      rebuilt: ${JSON.stringify(rebuilt)}`);
      console.log(`      ids: ${tokens.map(t => t.id).join(",")}`);
    }
  }
}
console.log(allPass ? "\nALL ROUND-TRIPS PASS ✓" : "\nROUND-TRIP FAILURES ✗");
process.exit(allPass ? 0 : 1);
