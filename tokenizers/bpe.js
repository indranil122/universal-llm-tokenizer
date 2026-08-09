/**
 * Byte-Pair Encoding (BPE) Tokenizer Engine
 * Supports OpenAI Tiktoken (cl100k_base, o200k_base), Meta Llama 3 (128k BPE), DeepSeek, Qwen
 */

window.BPETokenizer = class BPETokenizer {
  constructor(modelConfig) {
    this.modelConfig = modelConfig;
    this.vocabMap = modelConfig.vocabMap;
    this.spaceChar = modelConfig.spaceChar || "Ġ";
  }

  /**
   * Converts input text into a list of token objects with offsets, IDs, and UTF-8 byte details
   * @param {string} text 
   * @returns {Array<Object>} tokens
   */
  tokenize(text) {
    if (!text) return [];

    const tokens = [];
    const regex = this.modelConfig.regex || /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
    
    // Pre-tokenize text using Regex
    let match;
    const matches = [];
    regex.lastIndex = 0;

    let lastPos = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastPos) {
        matches.push({ text: text.slice(lastPos, match.index), start: lastPos, end: match.index });
      }
      matches.push({ text: match[0], start: match.index, end: match.index + match[0].length });
      lastPos = regex.lastIndex;

      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
    if (lastPos < text.length) {
      matches.push({ text: text.slice(lastPos), start: lastPos, end: text.length });
    }

    if (matches.length === 0 && text.length > 0) {
      matches.push({ text: text, start: 0, end: text.length });
    }

    // Subword BPE lookup for each chunk
    let tokenIndex = 0;
    for (const chunk of matches) {
      const chunkText = chunk.text;
      const startOffset = chunk.start;

      // Try multiple space representations (e.g. " World", "ĠWorld", "World")
      const candidateStr1 = chunkText;
      const candidateStr2 = this.spaceChar && chunkText.startsWith(" ") ? (this.spaceChar + chunkText.slice(1)) : null;

      let matchedId = null;
      let matchedDisplay = null;

      if (this.vocabMap.stringToId.has(candidateStr1)) {
        matchedId = this.vocabMap.stringToId.get(candidateStr1);
        matchedDisplay = candidateStr1;
      } else if (candidateStr2 && this.vocabMap.stringToId.has(candidateStr2)) {
        matchedId = this.vocabMap.stringToId.get(candidateStr2);
        matchedDisplay = candidateStr2;
      }

      if (matchedId !== null) {
        const bytes = this.textToUtf8Bytes(chunkText);
        tokens.push({
          index: tokenIndex++,
          id: matchedId,
          text: chunkText,
          displaySubword: matchedDisplay,
          bytes: bytes,
          hexBytes: bytes.map(b => "0x" + b.toString(16).padStart(2, "0").toUpperCase()),
          start: startOffset,
          end: chunk.end,
          type: this.getTokenType(chunkText)
        });
      } else {
        // Greedy BPE subword splitting / Byte fallback
        let currentPos = 0;
        while (currentPos < chunkText.length) {
          let longestMatch = null;
          let longestMatchId = null;
          let longestLength = 0;

            // Try longest matching substring in vocabulary
            for (let len = chunkText.length - currentPos; len > 0; len--) {
              let sub1 = chunkText.slice(currentPos, currentPos + len);
              let sub2 = currentPos === 0 && this.spaceChar && sub1.startsWith(" ") ? (this.spaceChar + sub1.slice(1)) : null;

              if (this.vocabMap.stringToId.has(sub1)) {
                longestMatch = sub1;
                longestMatchId = this.vocabMap.stringToId.get(sub1);
                longestLength = len;
                break;
              } else if (sub2 && this.vocabMap.stringToId.has(sub2)) {
                longestMatch = sub2;
                longestMatchId = this.vocabMap.stringToId.get(sub2);
                longestLength = len;
                break;
              }
            }

          if (longestMatch !== null) {
            const rawSubText = chunkText.slice(currentPos, currentPos + longestLength);
            const bytes = this.textToUtf8Bytes(rawSubText);
            tokens.push({
              index: tokenIndex++,
              id: longestMatchId,
              text: rawSubText,
              displaySubword: longestMatch,
              bytes: bytes,
              hexBytes: bytes.map(b => "0x" + b.toString(16).padStart(2, "0").toUpperCase()),
              start: startOffset + currentPos,
              end: startOffset + currentPos + longestLength,
              type: this.getTokenType(rawSubText)
            });
            currentPos += longestLength;
          } else {
            // Character / Byte Fallback with real ID mapping
            const char = chunkText[currentPos];
            const bytes = this.textToUtf8Bytes(char);
            
            // Check if character exists in vocabulary (e.g., 'H', 'e', 'l', 'o', '!')
            let charId = this.vocabMap.stringToId.get(char);
            if (charId === undefined && this.spaceChar && char === " ") {
              charId = this.vocabMap.stringToId.get(this.spaceChar);
            }
            if (charId === undefined) {
              const fallbackOffset = this.vocabMap.byteFallbackOffset || 190000;
              charId = fallbackOffset + (bytes[0] || char.charCodeAt(0));
            }

            tokens.push({
              index: tokenIndex++,
              id: charId,
              text: char,
              displaySubword: char === " " ? (this.spaceChar || " ") : char,
              bytes: bytes,
              hexBytes: bytes.map(b => "0x" + b.toString(16).padStart(2, "0").toUpperCase()),
              start: startOffset + currentPos,
              end: startOffset + currentPos + 1,
              type: this.getTokenType(char)
            });
            currentPos++;
          }
        }
      }
    }

    return tokens;
  }

  textToUtf8Bytes(str) {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
  }

  getTokenType(str) {
    if (/^\s+$/.test(str)) return "whitespace";
    if (/^<\|.*\|>|\[.*\]|<s>|<\/s>$/.test(str)) return "special";
    if (/^\d+$/.test(str)) return "number";
    if (/^[^\w\s]+$/.test(str)) return "symbol";
    if (/[\u1000-\uFFFF]/.test(str)) return "unicode";
    return "word";
  }

  getMergeSteps(text) {
    if (!text) return [];

    const encoder = new TextEncoder();
    const initialChars = Array.from(text);

    const steps = [
      { step: 1, title: "Raw Input Text", description: `"${text}"`, state: [text] },
      { step: 2, title: "Character / Byte Split", description: "Split into initial character bytes", state: initialChars },
    ];

    let currentState = [...initialChars];
    let stepNum = 3;

    while (currentState.length > 1 && stepNum <= 7) {
      const pairCounts = new Map();
      for (let i = 0; i < currentState.length - 1; i++) {
        const pair = JSON.stringify([currentState[i], currentState[i+1]]);
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }

      let bestPair = null;
      let maxCount = 0;
      for (const [pair, count] of pairCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestPair = pair;
        }
      }

      if (!bestPair || maxCount < 2) break;

      const [first, second] = JSON.parse(bestPair);
      const merged = first + second;
      const nextState = [];

      let i = 0;
      let mergedThisStep = false;
      while (i < currentState.length) {
        if (i < currentState.length - 1 && currentState[i] === first && currentState[i+1] === second) {
          nextState.push(merged);
          i += 2;
          mergedThisStep = true;
        } else {
          nextState.push(currentState[i]);
          i++;
        }
      }

      if (!mergedThisStep) break;

      steps.push({
        step: stepNum++,
        title: `BPE Pair Merge: "${first}" + "${second}" ➔ "${merged}"`,
        description: `Merged frequent adjacent pair into subword token`,
        mergedPair: { first, second, result: merged },
        state: nextState
      });

      currentState = nextState;
    }

    return steps;
  }
};
