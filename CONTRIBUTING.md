# Contributing

Thanks for helping make tokenization visible! This repo is deliberately **zero-dependency vanilla JS** — no build step, no frameworks, no node_modules. If you can edit a file and refresh a browser, you can contribute.

## Getting set up

```bash
git clone https://github.com/indranil122/universal-llm-tokenizer.git
cd universal-llm-tokenizer
python -m http.server 8080   # or: npx serve .
npm test                     # zero-dependency node:test suite
```

## The one rule that matters

There is a **guard test** that reads every `<option value="...">` from `app.html` and asserts each has a real config in `tokenizers/vocabularies.js` — so the UI can never silently drift from the model database. If you add a model, add it in **both** places, then run `npm test`.

## Good first contributions

- 🌐 **Add a model** — config in `tokenizers/vocabularies.js` + option in `app.html`
- 🎯 **Add an exact vocabulary** — any tokenizer with a public file (HF `tokenizer.json` BPE or `.tiktoken` format) can be converted with `node tools/convert_vocab.js`. Drop the raw file into `tokenizers/data/raw/`, extend the converter, regenerate, flip the model to `exact: true`
- 🧩 **Museum exhibits / game phrases** — great content PRs, no algorithm knowledge needed
- 🌍 **i18n** of the landing page
- 🐛 Bug fixes & CSS polish

## Ground truths

Exact models must stay byte-identical to their official tokenizers. If you touch `tokenizers/tiktoken.js`, verify with `tools/compare_tiktoken.js` against the official npm package before submitting.

## Submitting

1. Fork → create a branch → make your change
2. `npm test` must pass
3. Open a PR — include before/after screenshots for visual changes

Hacktoberfest participants: all of the above counts. Have fun!
