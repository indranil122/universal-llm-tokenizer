// Temp validation for the exact tiktoken engine (node tools/validate_tiktoken.js)
global.window = global;
require("../tokenizers/data/o200k_base.js");
require("../tokenizers/data/cl100k_base.js");
require("../tokenizers/data/p50k_base.js");
require("../tokenizers/data/llama3.js");
require("../tokenizers/tiktoken.js");

const D = window.TIKTOKEN_DATA;

function tok(name, extra) {
  return new window.TiktokenTokenizer({
    tiktokenData: D[name],
    regex: /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu,
    ...extra
  });
}

function ids(t) { return t.map(x => x.id); }
function roundtrip(name, text) {
  const t = tok(name).tokenize(text);
  const rebuilt = t.map(x => text.slice(x.start, x.end)).join("");
  return { ok: rebuilt === text, ids: ids(t), rebuilt };
}

const checks = [
  ["cl100k Hello World!", () => ids(tok("cl100k_base").tokenize("Hello World!")), [15496, 2159, 0]],
  ["o200k Hello World!", () => ids(tok("o200k_base").tokenize("Hello World!")), null],
  ["llama3 Hello", () => ids(tok("llama3").tokenize("Hello")), null],
  ["p50k hello world", () => ids(tok("p50k_base").tokenize("hello world")), null],
  ["cl100k special", () => ids(tok("cl100k_base").tokenize("say <|endoftext|> now")), null],
];

for (const [label, fn, expected] of checks) {
  try {
    const got = fn();
    const pass = expected === null ? "?" : JSON.stringify(got) === JSON.stringify(expected);
    console.log((pass === true ? "PASS" : pass === "?" ? "INFO" : "FAIL") + " | " + label + " | " + JSON.stringify(got) + (expected ? " | expected " + JSON.stringify(expected) : ""));
  } catch (e) { console.log("ERROR | " + label + " | " + e.message); }
}

console.log("--- roundtrips ---");
for (const text of ["Hello World! How does AI tokenize 中文 text? 🤖", "The quick brown fox jumps over 12345 🚀", "नमस्ते दुनिया! こんにちは世界"]) {
  for (const name of ["o200k_base", "cl100k_base", "llama3", "p50k_base"]) {
    const r = roundtrip(name, text);
    console.log((r.ok ? "PASS" : "FAIL") + " | " + name + " | " + JSON.stringify(text.slice(0, 20)) + " | tokens=" + r.ids.length + (r.ok ? "" : " | rebuilt=" + JSON.stringify(r.rebuilt)));
  }
}
