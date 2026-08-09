const regex = /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
const text = `Hello World! How does AI convert human text into tokens? Let's check: tokenization, def main(): and dY - emojis!`;
let match;
console.time('regex');
while ((match = regex.exec(text)) !== null) {
  if(match[0].length === 0) regex.lastIndex++;
}
console.timeEnd('regex');
