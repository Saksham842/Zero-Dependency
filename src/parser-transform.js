/**
 * @module parser-transform
 * @description Single-pass ESM→CJS transformer for ZeroPack.
 *
 * Replaces: @babel/core, esbuild transform API
 * Standard library: pure string scanning, node:crypto (sha256 temp vars)
 */
import { transformCssModule } from './parser-css.js';
import { readWord, skipWhitespaceAndComments, readString } from './parser-utils.js';
import { parseImport } from './parser-import.js';
import { parseExport } from './parser-export.js';

/**
 * Single-pass ESM→CJS transformer.
 *
 * @param {string} rawCode   Full source text.
 * @param {string} filePath  Absolute file path.
 * @returns {{ code: string, dependencies: string[] }}
 */
export function transformModuleCode(rawCode, filePath) {
  const dependencies = new Set();
  let output = '';
  const importTempVars = new Map();

  if (filePath.endsWith('.json')) {
    return { code: `module.exports = ${rawCode.trim() || '{}'};`, dependencies: [] };
  }

  if (filePath.endsWith('.css')) {
    return transformCssModule(rawCode, filePath);
  }

  let i = 0;
  const len = rawCode.length;
  let inSingleQuote = false, inDoubleQuote = false, inTemplateLiteral = false, inRegex = false, isEscaped = false;
  let lastRegexNonWhitespace = '';

  while (i < len) {
    const char = rawCode[i];
    const nextChar = rawCode[i + 1];

    if (isEscaped) { output += char; isEscaped = false; i++; continue; }
    if (char === '\\' && (inSingleQuote || inDoubleQuote || inTemplateLiteral || inRegex)) { output += char; isEscaped = true; i++; continue; }
    if (char === "'" && !inDoubleQuote && !inTemplateLiteral && !inRegex) { inSingleQuote = !inSingleQuote; output += char; i++; continue; }
    if (char === '"' && !inSingleQuote && !inTemplateLiteral && !inRegex) { inDoubleQuote = !inDoubleQuote; output += char; i++; continue; }
    if (char === '`' && !inSingleQuote && !inDoubleQuote && !inRegex) { inTemplateLiteral = !inTemplateLiteral; output += char; i++; continue; }
    if (inSingleQuote || inDoubleQuote || inTemplateLiteral) { output += char; i++; continue; }

    if (char === '/' && nextChar === '/' && !inRegex) {
      output += char + nextChar; i += 2;
      while (i < len && rawCode[i] !== '\n') { output += rawCode[i]; i++; }
      continue;
    }
    if (char === '/' && nextChar === '*' && !inRegex) {
      output += char + nextChar; i += 2;
      while (i < len && !(rawCode[i] === '*' && rawCode[i + 1] === '/')) { output += rawCode[i]; i++; }
      if (i < len) { output += '*/'; i += 2; }
      continue;
    }

    if (char === '/' && !inRegex) {
      const isRegexStart = /[(,=:[!&|?{};]/.test(lastRegexNonWhitespace) || /\breturn$/.test(output.trim());
      if (isRegexStart) { inRegex = true; output += char; i++; continue; }
    } else if (char === '/' && inRegex) {
      inRegex = false; output += char; i++; continue;
    }
    if (inRegex) { output += char; i++; continue; }

    if (!/\s/.test(char)) lastRegexNonWhitespace = char;

    if (/[a-zA-Z_$]/.test(char)) {
      let prevIdx = i - 1;
      while (prevIdx >= 0 && /\s/.test(rawCode[prevIdx])) prevIdx--;
      const prevChar = prevIdx >= 0 ? rawCode[prevIdx] : '';
      const { word, index: afterWord } = readWord(rawCode, len, i);
      if (prevChar === '.') { output += word; i = afterWord; continue; }
      if (word === 'require') {
        let rIdx = skipWhitespaceAndComments(rawCode, len, afterWord);
        if (rawCode[rIdx] === '(') {
          rIdx++;
          rIdx = skipWhitespaceAndComments(rawCode, len, rIdx);
          if (rawCode[rIdx] === "'" || rawCode[rIdx] === '"' || rawCode[rIdx] === '`') {
            const { str: specifier } = readString(rawCode, len, rIdx);
            dependencies.add(specifier);
          }
        }
        output += word; i = afterWord;
      } else if (word === 'import') {
        const { replacement, newIndex } = parseImport(rawCode, len, filePath, i, dependencies, importTempVars);
        output += replacement; i = newIndex;
      } else if (word === 'export') {
        const { replacement, newIndex } = parseExport(rawCode, len, filePath, i, dependencies);
        output += replacement; i = newIndex;
      } else { output += word; i = afterWord; }
      continue;
    }

    output += char;
    i++;
  }

  return { code: output, dependencies: Array.from(dependencies) };
}
