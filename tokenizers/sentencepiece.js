/**
 * SentencePiece / Unigram Tokenizer Simulator
 * Uses space metastymbol ( U+2581) and probabilistic byte fallback
 */

window.SentencePieceTokenizer = class SentencePieceTokenizer {
  constructor(modelConfig) {
    this.modelConfig = modelConfig;
    this.vocabMap = modelConfig.vocabMap;
    this.spaceChar = modelConfig.spaceChar || "▁";
  }

  tokenize(text) {
    if (!text) return [];

    const tokens = [];
    let tokenIndex = 0;

    // SentencePiece replaces spaces with spaceChar, and prepends a dummy prefix
    const spText = (this.spaceChar + text).replace(/ /g, this.spaceChar);

    // Simple Viterbi / Greedy Unigram segmentation
    let pos = 0;
    while (pos < spText.length) {
      let longestMatch = null;
      let longestId = null;
      let matchLen = 0;

      for (let len = Math.min(20, spText.length - pos); len > 0; len--) {
        const sub = spText.slice(pos, pos + len);
        if (this.vocabMap.stringToId.has(sub)) {
          longestMatch = sub;
          longestId = this.vocabMap.stringToId.get(sub);
          matchLen = len;
          break;
        }
      }

      // Map positions back to original text (accounting for 1-char dummy prefix)
      const startOffset = Math.max(0, pos - 1);
      const endOffset = Math.max(0, pos + (matchLen || 1) - 1);
      
      const originalSubText = text.slice(startOffset, endOffset);
      const bytes = Array.from(new TextEncoder().encode(originalSubText));

      if (longestMatch !== null) {
        tokens.push({
          index: tokenIndex++,
          id: longestId,
          text: originalSubText, // May be empty for the dummy prefix token if matched separately
          displaySubword: longestMatch,
          bytes: bytes,
          hexBytes: bytes.map(b => "0x" + b.toString(16).padStart(2, "0").toUpperCase()),
          start: startOffset,
          end: endOffset,
          type: this.getTokenType(originalSubText)
        });
        pos += matchLen;
      } else {
        const char = spText[pos];
        const fallbackOffset = this.vocabMap.byteFallbackOffset || 190000;
        tokens.push({
          index: tokenIndex++,
          id: this.vocabMap.stringToId.get(char) || (fallbackOffset + (bytes[0] || char.charCodeAt(0))),
          text: originalSubText || char,
          displaySubword: char,
          bytes: bytes,
          hexBytes: bytes.map(b => "0x" + b.toString(16).padStart(2, "0").toUpperCase()),
          start: startOffset,
          end: endOffset,
          type: this.getTokenType(originalSubText)
        });
        pos++;
      }
    }

    return tokens;
  }

  getTokenType(str) {
    if (/^\s+$/.test(str)) return "whitespace";
    if (/^\d+$/.test(str)) return "number";
    if (/^[^\w\s]+$/.test(str)) return "symbol";
    return "word";
  }
};
