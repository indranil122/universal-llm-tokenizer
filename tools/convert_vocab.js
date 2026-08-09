/**
 * Converts real tokenizer vocabularies into compact browser data files.
 *
 * Inputs (see tokenizers/data/raw/):
 *   - o200k_base.tiktoken / cl100k_base.tiktoken / p50k_base.tiktoken
 *     Format: "<base64(token bytes)> <rank>" per line, rank === token id
 *   - llama3_tokenizer.json (HuggingFace GPT2-type tokenizer)
 *
 * Output: tokenizers/data/<name>.js containing
 *   window.TIKTOKEN_DATA["<name>"] = {
 *     ranks: "key rank\n...",   // merge priority (for tiktoken files: rank === id)
 *     vocab: "key id\n...",     // id lookup (same as ranks for tiktoken files)
 *     special: { "<|endoftext|>": 100257, ... }
 *   }
 * where "key" is the GPT-2 byte-level unicode string of the token bytes
 * (space -> "Ġ", newline -> "Ċ", tab -> "Ĩ", high bytes -> U+0100+ chars).
 *
 * Run:  node tools/convert_vocab.js
 */

const fs = require("fs");
const path = require("path");

const RAW = path.join(__dirname, "..", "tokenizers", "data", "raw");
const OUT = path.join(__dirname, "..", "tokenizers", "data");

// ---- GPT-2 byte <-> unicode mapping ---------------------------------------
const bytes = [];
const chars = [];
for (let i = 0x21; i <= 0x7e; i++) { bytes.push(i); chars.push(i); }
for (let i = 0xa1; i <= 0xac; i++) { bytes.push(i); chars.push(i); }
for (let i = 0xae; i <= 0xff; i++) { bytes.push(i); chars.push(i); }
let n = 0;
for (let b = 0; b < 256; b++) {
  if (!bytes.includes(b)) { bytes.push(b); chars.push(256 + n); n++; }
}
const byteToChar = new Map(bytes.map((b, i) => [b, String.fromCharCode(chars[i])]));
const charToByte = new Map([...byteToChar].map(([b, c]) => [c, b]));

function bytesToKey(buf) {
  let s = "";
  for (const b of buf) s += byteToChar.get(b);
  return s;
}

function keyToBytes(key) {
  const out = [];
  for (const c of key) {
    const b = charToByte.get(c);
    if (b !== undefined) out.push(b);
    else out.push(...Buffer.from(c, "utf8")); // safety net for raw unicode keys
  }
  return Buffer.from(out);
}

// ---- parsers ----------------------------------------------------------------
function parseTiktoken(file) {
  const text = fs.readFileSync(file, "utf8");
  const entries = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const sp = line.indexOf(" ");
    const b64 = line.slice(0, sp);
    const id = parseInt(line.slice(sp + 1), 10);
    const key = bytesToKey(Buffer.from(b64, "base64"));
    entries.push({ key, id, rank: id });
  }
  entries.sort((a, b) => a.id - b.id);
  return entries;
}

function parseHfTokenizer(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const model = j.model || {};
  const vocab = model.vocab || {};          // tokenString -> id
  const merges = model.merges || [];         // ["Ġ t", ...]
  // merges may be arrays of pairs ("[\u0120, t]") or space-joined strings ("\u0120 t")
  const vocabSet = new Set(Object.keys(vocab));
  const rankMap = new Map(); // last occurrence wins (matches HF dict semantics)
  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];
    let mergedKey;
    if (Array.isArray(m)) mergedKey = m.join("");
    else { const sp = m.indexOf(" "); mergedKey = sp === -1 ? m : m.slice(0, sp) + m.slice(sp + 1); }
    // only merges whose result exists in the vocab are usable
    if (vocabSet.has(mergedKey)) rankMap.set(mergedKey, i);
  }
  const rankEntries = [...rankMap].map(([key, rank]) => ({ key, rank }));
  const vocabEntries = Object.entries(vocab).map(([key, id]) => ({ key, id }));
  vocabEntries.sort((a, b) => a.id - b.id);
  const special = {};
  for (const t of j.added_tokens || []) {
    if (t.special) special[t.content] = t.id;
  }
  return { rankEntries, vocabEntries, special };
}

// ---- emit --------------------------------------------------------------------
function linesToText(entries, rankMode) {
  return entries
    .map(e => `${e.key} ${rankMode ? e.rank : e.id}`)
    .join("\n");
}

function emit(name, rankEntries, vocabEntries, special, patStr) {
  // For tiktoken files rank === id, so vocab is redundant with ranks — emit once
  const same = rankEntries.length === vocabEntries.length &&
    rankEntries.every((e, i) => vocabEntries[i] && e.key === vocabEntries[i].key && e.id === vocabEntries[i].id);
  const js = `// Auto-generated from real tokenizer data by tools/convert_vocab.js — do not edit.\nwindow.TIKTOKEN_DATA = window.TIKTOKEN_DATA || {};\nwindow.TIKTOKEN_DATA[${JSON.stringify(name)}] = {\n  ranks: ${JSON.stringify(linesToText(rankEntries, true))}${same ? "" : `,\n  vocab: ${JSON.stringify(linesToText(vocabEntries, false))}`},\n  patStr: ${JSON.stringify(patStr)},\n  special: ${JSON.stringify(special)}\n};\n`;
  fs.writeFileSync(path.join(OUT, name + ".js"), js);
  const kb = (fs.statSync(path.join(OUT, name + ".js")).size / 1024).toFixed(0);
  console.log(`${name}.js  ${kb} KB  (${vocabEntries.length} vocab, ${rankEntries.length} ranks, ${Object.keys(special).length} special)`);
}

fs.mkdirSync(OUT, { recursive: true });

// OpenAI tiktoken files: rank === id, so ranks and vocab are identical.
// pat_str + special_tokens are the authoritative per-encoding values used by
// the official tiktoken registry (openai/tiktoken registry.json).
const GPT2_PAT = "(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+";
const O200K_PAT = "[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'s|'t|'re|'ve|'m|'ll|'d)?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'s|'t|'re|'ve|'m|'ll|'d)?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+";
const P50K_PAT = "'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+";

const tiktokenConfigs = {
  o200k_base: {
    special: { "<|endoftext|>": 199999, "<|endofprompt|>": 200018, "<|im_start|>": 200000, "<|im_end|>": 200001 },
    patStr: O200K_PAT
  },
  cl100k_base: {
    special: { "<|endoftext|>": 100257, "<|fim_prefix|>": 100258, "<|fim_middle|>": 100259, "<|fim_suffix|>": 100260, "<|endofprompt|>": 100276, "<|im_start|>": 100264, "<|im_end|>": 100265 },
    patStr: GPT2_PAT
  },
  p50k_base: {
    special: { "<|endoftext|>": 50256 },
    patStr: P50K_PAT
  }
};

for (const name of ["o200k_base", "cl100k_base", "p50k_base"]) {
  const entries = parseTiktoken(path.join(RAW, name + ".tiktoken"));
  const { special, patStr } = tiktokenConfigs[name];
  emit(name, entries, entries, special, patStr);
}

// Llama 3: merge ranks come from the merges array, ids from the vocab.
// Its pre_tokenizer regex is the GPT-2 pattern (from tokenizer.json).
{
  const { rankEntries, vocabEntries, special } = parseHfTokenizer(path.join(RAW, "llama3_tokenizer.json"));
  emit("llama3", rankEntries, vocabEntries, special, GPT2_PAT);
}

console.log("Done. Raw files can be deleted: tokenizers/data/raw/");
