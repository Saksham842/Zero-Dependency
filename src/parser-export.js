/**
 * @module parser-export
 * @description ESM export parser for ZeroPack.
 */
import { BuildError, getLineColumn } from './parser-errors.js';
import { skipWhitespaceAndComments, readWord, readString } from './parser-utils.js';

export function parseExport(rawCode, len, filePath, startI, dependencies) {
  const skip = (i) => skipWhitespaceAndComments(rawCode, len, i);
  const rWord = (i) => readWord(rawCode, len, i);
  const rStr = (i) => readString(rawCode, len, i);

  let idx = startI + 6;
  idx = skip(idx);
  let { word } = rWord(idx);

  if (word === 'default') {
    idx += 7;
    idx = skip(idx);
    let { word: nextWord } = rWord(idx);
    if (nextWord === 'function' || nextWord === 'class') {
      let peekIdx = skip(idx + nextWord.length);
      let { word: name } = rWord(peekIdx);
      if (name) {
        if (nextWord === 'function') return { replacement: `module.exports.default = ${name};\nfunction ${name}`, newIndex: peekIdx + name.length };
        else return { replacement: `const ${name} = module.exports.default = class ${name}`, newIndex: peekIdx + name.length };
      }
      return { replacement: `module.exports.default = `, newIndex: idx };
    }
    let exprEnd = idx, braceCount = 0, parenCount = 0;
    let inSq = false, inDq = false, inTl = false, isEsc = false;
    while (exprEnd < len) {
      const c = rawCode[exprEnd], nextC = rawCode[exprEnd + 1];
      if (isEsc) { isEsc = false; exprEnd++; continue; }
      if (c === '\\') { isEsc = true; exprEnd++; continue; }
      if (c === "'" && !inDq && !inTl) { inSq = !inSq; exprEnd++; continue; }
      if (c === '"' && !inSq && !inTl) { inDq = !inDq; exprEnd++; continue; }
      if (c === '`' && !inSq && !inDq) { inTl = !inTl; exprEnd++; continue; }
      if (inSq || inDq || inTl) { exprEnd++; continue; }
      if (c === '/' && nextC === '/') { exprEnd += 2; while (exprEnd < len && rawCode[exprEnd] !== '\n') exprEnd++; continue; }
      if (c === '/' && nextC === '*') { exprEnd += 2; while (exprEnd < len && !(rawCode[exprEnd] === '*' && rawCode[exprEnd+1] === '/')) exprEnd++; exprEnd += 2; continue; }
      if (c === '{') braceCount++;
      else if (c === '}') braceCount--;
      else if (c === '(') parenCount++;
      else if (c === ')') parenCount--;
      if (c === ';' && braceCount === 0 && parenCount === 0) { exprEnd++; break; }
      if (c === '\n' && braceCount === 0 && parenCount === 0) { break; }
      exprEnd++;
    }
    const expr = rawCode.slice(idx, rawCode[exprEnd - 1] === ';' ? exprEnd - 1 : exprEnd).trim();
    return { replacement: `const __defaultExport = (${expr});\nmodule.exports.default = __defaultExport;\nif (typeof __defaultExport === 'object' && __defaultExport !== null) { Object.assign(module.exports, __defaultExport); }\n`, newIndex: exprEnd };
  }

  if (word === 'const' || word === 'let' || word === 'var') {
    idx += word.length;
    idx = skip(idx);
    const firstChar = rawCode[idx];
    if (firstChar === '{' || firstChar === '[') {
      const { line, column } = getLineColumn(rawCode, idx);
      throw new BuildError({ message: `Destructured export declarations (export ${word} ${firstChar}...${firstChar === '{' ? '}' : ']'} = ...) are not supported.`, file: filePath, line, column,
        suggestion: `Declare the variable first, then export: ${word} ${firstChar}...${firstChar === '{' ? '}' : ']'} = ...; export { ... };`, category: 'Syntax' });
    }
    let curr = idx, depth = 0, inStr = false, strChar = '', isFindingName = true;
    let replacementStr = `${word} `, chunkStart = idx;
    while (curr < len) {
      const c = rawCode[curr];
      if (inStr) { if (c === '\\') curr++; else if (c === strChar) inStr = false; curr++; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = true; strChar = c; curr++; continue; }
      if (c === '{' || c === '[' || c === '(') depth++;
      else if (c === '}' || c === ']' || c === ')') depth--;
      if (depth === 0) {
        if (isFindingName) {
          const skipRes = skip(curr);
          if (skipRes > curr) { curr = skipRes; continue; }
          const wRes = rWord(curr);
          if (wRes.word) {
            const varName = wRes.word;
            replacementStr += `${varName} = module.exports.${varName} `;
            curr += varName.length; chunkStart = curr; isFindingName = false; continue;
          }
        } else {
          if (c === ',') { replacementStr += rawCode.slice(chunkStart, curr) + ', '; curr++; chunkStart = curr; isFindingName = true; continue; }
          if (c === ';' || c === '\n') { break; }
        }
      }
      curr++;
    }
    replacementStr += rawCode.slice(chunkStart, curr);
    if (rawCode[curr] === ';') { replacementStr += ';'; curr++; }
    return { replacement: replacementStr, newIndex: curr };
  }

  if (word === 'function' || word === 'class') {
    idx += word.length;
    idx = skip(idx);
    const { word: name } = rWord(idx);
    if (word === 'function') return { replacement: `module.exports.${name} = ${name};\nfunction ${name}`, newIndex: idx + name.length };
    else return { replacement: `const ${name} = module.exports.${name} = class ${name}`, newIndex: idx + name.length };
  }

  if (rawCode[idx] === '{') {
    let tokens = [];
    while (idx < len) {
      idx = skip(idx);
      const { word: tWord } = rWord(idx);
      if (tWord) { tokens.push({ type: 'word', value: tWord }); idx += tWord.length; }
      else { const c = rawCode[idx]; tokens.push({ type: 'punct', value: c }); idx++; if (c === '}') break; }
    }
    idx = skip(idx);
    let { word: fromWord } = rWord(idx);
    let reexports = [], t = 1;
    while (t < tokens.length && tokens[t].value !== '}') {
      if (tokens[t].value === ',') { t++; continue; }
      const orig = tokens[t].value; let alias = orig; t++;
      if (tokens[t] && tokens[t].value === 'as') { t++; alias = tokens[t].value; t++; }
      reexports.push({ orig, alias });
    }
    if (fromWord === 'from') {
      idx += 4; idx = skip(idx);
      if (rawCode[idx] === "'" || rawCode[idx] === '"') {
        const { str: specifier, index: afterStr } = rStr(idx);
        idx = afterStr; idx = skip(idx);
        const { word: attrWord } = rWord(idx);
        if (attrWord === 'with' || attrWord === 'assert') { idx += attrWord.length; idx = skip(idx); if (rawCode[idx] === '{') { while (idx < len && rawCode[idx] !== '}') idx++; if (rawCode[idx] === '}') idx++; } }
        if (rawCode[idx] === ';') idx++;
        dependencies.add(specifier);
        const lines = reexports.map(({ orig, alias }) => `module.exports.${alias} = require('${specifier}').${orig};`);
        return { replacement: lines.join('\n') + (lines.length > 0 ? '\n' : ''), newIndex: idx };
      }
    } else {
      if (rawCode[idx] === ';') idx++;
      const lines = reexports.map(({ orig, alias }) => `module.exports.${alias} = ${orig};`);
      return { replacement: lines.join('\n') + (lines.length > 0 ? '\n' : ''), newIndex: idx };
    }
  }

  if (rawCode[idx] === '*') {
    idx++; idx = skip(idx);
    let { word: fromWord } = rWord(idx);
    if (fromWord === 'from') {
      idx += 4; idx = skip(idx);
      if (rawCode[idx] === "'" || rawCode[idx] === '"') {
        const { str: specifier, index: afterStr } = rStr(idx);
        idx = afterStr; idx = skip(idx);
        if (rawCode[idx] === ';') idx++;
        dependencies.add(specifier);
        return { replacement: `Object.assign(module.exports, require('${specifier}'));`, newIndex: idx };
      }
    }
  }

  const { line, column } = getLineColumn(rawCode, idx);
  throw new BuildError({ message: `Unsupported export syntax`, file: filePath, line, column,
    suggestion: 'ZeroPack supports export default, export const/let/var, export function/class, and export { ... }. Check your syntax.', category: 'Syntax' });
}
