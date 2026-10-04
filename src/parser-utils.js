/**
 * @module parser-utils
 * @description Shared string scanning utilities for the ZeroPack parser.
 */

export function skipWhitespaceAndComments(rawCode, len, index) {
  while (index < len) {
    const char = rawCode[index];
    const nextChar = rawCode[index + 1];
    if (/\s/.test(char)) { index++; continue; }
    if (char === '/' && nextChar === '/') {
      index += 2;
      while (index < len && rawCode[index] !== '\n') index++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      index += 2;
      while (index < len && !(rawCode[index] === '*' && rawCode[index + 1] === '/')) index++;
      index += 2;
      continue;
    }
    break;
  }
  return index;
}

export function readWord(rawCode, len, index) {
  let word = '';
  while (index < len && /[a-zA-Z_$0-9]/.test(rawCode[index])) {
    word += rawCode[index++];
  }
  return { word, index };
}

export function readString(rawCode, len, index) {
  const quote = rawCode[index++];
  let str = '';
  let esc = false;
  while (index < len) {
    const c = rawCode[index++];
    if (esc) { str += c; esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === quote) break;
    str += c;
  }
  return { str, index, quote };
}
