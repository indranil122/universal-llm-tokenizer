/**
 * WordPiece Tokenizer Engine (Google BERT)
 * Greedy subword matching with '##' subword prefixes
 */

window.WordPieceTokenizer = class WordPieceTokenizer {
  constructor(modelConfig) {
    this.modelConfig = modelConfig;
    this.vocabMap = modelConfig.vocabMap;
    this.subwordPrefix = modelConfig.subwordPrefix || "##";
  }

  tokenize(text) {
    if (!text) return [];

    const tokens = [];
    let tokenIndex = 0;

    const clsId = this.vocabMap.stringToId.get("[CLS]") || 101;
    tokens.push({
      index: tokenIndex++,
      id: clsId,
      text: "",
      displaySubword: "[CLS]",
      bytes: [],
      hexBytes: [],
      start: 0,
      end: 0,
      type: "special"
    });

    // Split on whitespace / punctuation boundaries while tracking offsets
    const wordRegex = /\s+|[^\s\w]+|\w+/g;
    let match;
    let lastPos = 0;

    while ((match = wordRegex.exec(text)) !== null) {
      if (match.index > lastPos) {
        this.tokenizeWord(text.slice(lastPos, match.index), lastPos, tokens, tokenIndex);
        tokenIndex = tokens.length;
      }

      const word = match[0];
      const start = match.index;

      if (/^\s+$/.test(word)) {
        // BERT skips whitespace tokens in output, uses them only as word boundaries
      } else {
        this.tokenizeWord(word, start, tokens, tokenIndex);
        tokenIndex = tokens.length;
      }

      lastPos = wordRegex.lastIndex;
      if (word.length === 0) wordRegex.lastIndex++;
    }

    if (lastPos < text.length) {
      this.tokenizeWord(text.slice(lastPos), lastPos, tokens, tokenIndex);
      tokenIndex = tokens.length;
    }

    const sepId = this.vocabMap.stringToId.get("[SEP]") || 102;
    tokens.push({
      index: tokenIndex++,
      id: sepId,
      text: "",
      displaySubword: "[SEP]",
      bytes: [],
      hexBytes: [],
      start: text.length,
      end: text.length,
      type: "special"
    });

    return tokens;
  }

  tokenizeWord(originalWord, startOffset, tokens, startIndex) {
    const word = originalWord.toLowerCase();
    let tokenIndex = startIndex;
    let isBad = false;
    let start = 0;
    const subTokens = [];

    while (start < word.length) {
      let end = word.length;
      let curSubstr = null;
      let curSubstrId = null;

      while (start < end) {
        let substr = word.slice(start, end);
        if (start > 0) {
          substr = this.subwordPrefix + substr;
        }

        if (this.vocabMap.stringToId.has(substr)) {
          curSubstr = substr;
          curSubstrId = this.vocabMap.stringToId.get(substr);
          break;
        }
        end--;
      }

      if (curSubstr === null) {
        isBad = true;
        break;
      }

      subTokens.push({
        text: originalWord.slice(start, end),
        displaySubword: curSubstr,
        id: curSubstrId,
        start: startOffset + start,
        end: startOffset + end
      });

      start = end;
    }

    if (isBad) {
      // Fallback: whole word becomes [UNK] in BERT
      const unkId = this.vocabMap.stringToId.get("[UNK]") || 100;
      const bytes = Array.from(new TextEncoder().encode(originalWord));
      tokens.push({
        index: tokenIndex++,
        id: unkId,
        text: originalWord,
        displaySubword: "[UNK]",
        bytes: bytes,
        hexBytes: bytes.map(b => "0x" + b.toString(16).padStart(2, "0").toUpperCase()),
        start: startOffset,
        end: startOffset + originalWord.length,
        type: "special"
      });
    } else {
      subTokens.forEach(st => {
        const bytes = Array.from(new TextEncoder().encode(st.text));
        tokens.push({
          index: tokenIndex++,
          id: st.id,
          text: st.text,
          displaySubword: st.displaySubword,
          bytes: bytes,
          hexBytes: bytes.map(b => "0x" + b.toString(16).padStart(2, "0").toUpperCase()),
          start: st.start,
          end: st.end,
          type: "word"
        });
      });
    }
  }
};
