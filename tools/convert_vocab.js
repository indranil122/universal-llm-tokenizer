/**
 * Converts real tokenizer vocabularies into compact browser data files.
 *
 * Inputs (see tokenizers/data/raw/, git-ignored — re-download to regenerate):
 *   - o200k_base.tiktoken / cl100k_base.tiktoken / p50k_base.tiktoken
 *     Format: "<base64(token bytes)> <rank>" per line, rank === token id
 *     URLs:  https://openaipublic.blob.core.windows.net/encodings/<name>.tiktoken
 *   - llama3_tokenizer.json (HuggingFace GPT2-type tokenizer)
 *     URL:   https://huggingface.co/unsloth/Llama-3.1-8B/resolve/main/tokenizer.json
 *   - registry.json (official openai/tiktoken JS registry: authoritative
 *     pat_str regexes + special token ids per encoding)
 *     Source: the npm "tiktoken" package (encoders/registry.json)
 *
 * Output: tokenizers/data/<name>.js containing
 *   window.TIKTOKEN_DATA["<name>"] = {
 *     ranks: "key rank\n...",   // merge priority (for tiktoken files: rank === id)
 *     vocab: "key id\n...",     // id lookup (same as ranks for tiktoken files)
 *     patStr: "...",            // official pre-tokenizer regex (raw, backslashes intact)
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
  const merges = model.merges || [];         // ["Ġ t", ...] or [["Ġ","t"], ...]
  // only merges whose result exists in the vocab are usable
  const vocabSet = new Set(Object.keys(vocab));
  const rankMap = new Map(); // last occurrence wins (matches HF dict semantics)
  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];
    let mergedKey;
    if (Array.isArray(m)) mergedKey = m.join("");
    else { const sp = m.indexOf(" "); mergedKey = sp === -1 ? m : m.slice(0, sp) + m.slice(sp + 1); }
    if (vocabSet.has(mergedKey)) rankMap.set(mergedKey, i);
  }
  const rankEntries = [...rankMap].map(([key, rank]) => ({ key, rank }));
  const vocabEntries = Object.entries(vocab).map(([key, id]) => ({ key, id }));
  vocabEntries.sort((a, b) => a.id - b.id);
  const special = {};
  for (const t of j.added_tokens || []) {
    if (t.special) special[t.content] = t.id;
  }
  // the GPT-2 style pre-tokenizer split regex lives in pre_tokenizer.
  // Some tokenizers (e.g. Cohere) use a Sequence of Splits — prefer the
  // LONGEST regex, which is always the main word pattern (digit-grouping
  // side-rules are subsumed by the main pattern's \p{N}{1,3}).
  const splitRegex = (function find(o) {
    let best = null;
    (function walk(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "Split" && node.pattern && node.pattern.Regex) {
        if (!best || node.pattern.Regex.length > best.length) best = node.pattern.Regex;
      }
      for (const k of Object.keys(node)) { if (node[k] && typeof node[k] === "object") walk(node[k]); }
    })(o);
    return best;
  })(j.pre_tokenizer);
  return { rankEntries, vocabEntries, special, splitRegex };
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

// ---- authoritative configs ----------------------------------------------------
// pat_str + special_tokens come from the official openai/tiktoken registry —
// exactly matching the npm tiktoken runtime we validate against (note: the
// registry does NOT reserve <|im_start|>/<|im_end|> for cl100k/o200k, so the
// real runtime encodes them as ordinary subword tokens).
const REGISTRY = JSON.parse(fs.readFileSync(path.join(RAW, "registry.json"), "utf8"));

function specialsFor(name) {
  return Object.assign({}, (REGISTRY[name] || {}).special_tokens || {});
}

for (const name of ["o200k_base", "cl100k_base", "p50k_base"]) {
  const entries = parseTiktoken(path.join(RAW, name + ".tiktoken"));
  const patStr = (REGISTRY[name] || {}).pat_str || "";
  emit(name, entries, entries, specialsFor(name), patStr);
}

// Llama 3: merge ranks come from the merges array, ids from the vocab;
// its pre-tokenizer regex is extracted from tokenizer.json itself.
{
  const { rankEntries, vocabEntries, special, splitRegex } = parseHfTokenizer(path.join(RAW, "llama3_tokenizer.json"));
  const patStr = splitRegex || (REGISTRY["cl100k_base"] || {}).pat_str || "";
  emit("llama3", rankEntries, vocabEntries, special, patStr);
}

// Qwen3 (Qwen3-0.6B): HF GPT2-type BPE — same pipeline as Llama 3.
if (fs.existsSync(path.join(RAW, "qwen3_tokenizer.json"))) {
  const { rankEntries, vocabEntries, special, splitRegex } = parseHfTokenizer(path.join(RAW, "qwen3_tokenizer.json"));
  const patStr = splitRegex || (REGISTRY["o200k_base"] || {}).pat_str || "";
  emit("qwen3", rankEntries, vocabEntries, special, patStr);
}

// Qwen3.5: expanded ~248k vocabulary, same HF GPT2-type BPE pipeline.
if (fs.existsSync(path.join(RAW, "qwen35_tokenizer.json"))) {
  const { rankEntries, vocabEntries, special, splitRegex } = parseHfTokenizer(path.join(RAW, "qwen35_tokenizer.json"));
  const patStr = splitRegex || (REGISTRY["o200k_base"] || {}).pat_str || "";
  emit("qwen35", rankEntries, vocabEntries, special, patStr);
}

// Cohere Command A+ : officially published tokenizer (255k BPE).
if (fs.existsSync(path.join(RAW, "cohere_tokenizer.json"))) {
  const { rankEntries, vocabEntries, special, splitRegex } = parseHfTokenizer(path.join(RAW, "cohere_tokenizer.json"));
  const patStr = splitRegex || (REGISTRY["o200k_base"] || {}).pat_str || "";
  emit("cohere", rankEntries, vocabEntries, special, patStr);
}

// o200k_harmony (gpt-oss): identical mergeable ranks + pat_str as o200k_base,
// with the extended harmony special-token block (official openai_public.py).
{
  const harmonySpecials = {
    "<|startoftext|>": 199998,
    "<|endoftext|>": 199999,
    "<|return|>": 200002,
    "<|constrain|>": 200003,
    "<|channel|>": 200005,
    "<|start|>": 200006,
    "<|end|>": 200007,
    "<|message|>": 200008,
    "<|call|>": 200012
  };
  for (let i = 200000; i <= 201087; i++) {
    if (!Object.values(harmonySpecials).includes(i)) harmonySpecials[`<|reserved_${i}|>`] = i;
  }
  if (fs.existsSync(path.join(RAW, "o200k_base.tiktoken"))) {
    const entries = parseTiktoken(path.join(RAW, "o200k_base.tiktoken"));
    const patStr = (REGISTRY["o200k_base"] || {}).pat_str || "";
    // reserved tokens are not in the .tiktoken file; keep them out of ranks/vocab
    // and expose them only through `special` (same as the official runtime does).
    emit("o200k_harmony", entries, entries, harmonySpecials, patStr);
  }
}

console.log("Done. Raw files can be deleted: tokenizers/data/raw/");
