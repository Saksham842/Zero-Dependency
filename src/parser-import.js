/**
 * @module parser-import
 * @description ESM import parser for ZeroPack.
 */
import crypto from 'node:crypto';
import { BuildError, getLineColumn } from './parser-errors.js';
import { skipWhitespaceAndComments, readWord, readString } from './parser-utils.js';

export function parseImport(rawCode, len, filePath, startI, dependencies, importTempVars) {
  const skip = (i) => skipWhitespaceAndComments(rawCode, len, i);
  const rWord = (i) => readWord(rawCode, len, i);
  const rStr = (i) => readString(rawCode, len, i);

  let idx = startI + 6;
  idx = skip(idx);

  if (rawCode[idx] === '(') {
    idx++;
    idx = skip(idx);
    if (rawCode[idx] === "'" || rawCode[idx] === '"' || rawCode[idx] === '`') {
      const { str: specifier, index: afterString } = rStr(idx);
      idx = skip(afterString);
      if (rawCode[idx] === ')') {
        idx++;
        dependencies.add(specifier);
        return { replacement: `Promise.resolve(require('${specifier}'))`, newIndex: idx };
      }
    }
    const { line, column } = getLineColumn(rawCode, idx);
    throw new BuildError({ message: `Unsupported dynamic import expression`, file: filePath, line, column,
      suggestion: 'ZeroPack only supports static string literals in dynamic imports, e.g., import("./file.js").', category: 'Syntax' });
  }

  let clause = '';
  let specifier = '';

  if (rawCode[idx] === "'" || rawCode[idx] === '"') {
    const { str, index: afterStr } = rStr(idx);
    specifier = str;
    idx = skip(afterStr);
    const { word } = rWord(idx);
    if (word === 'with' || word === 'assert') {
      idx += word.length;
      idx = skip(idx);
      if (rawCode[idx] === '{') { while (idx < len && rawCode[idx] !== '}') idx++; if (rawCode[idx] === '}') idx++; }
    }
    if (rawCode[idx] === ';') idx++;
    dependencies.add(specifier);
    return { replacement: `require('${specifier}')` + (rawCode[idx-1] === ';' ? ';' : ''), newIndex: idx };
  }

  let tokens = [];
  while (idx < len) {
    idx = skip(idx);
    const { word } = rWord(idx);
    if (word === 'from') { idx += 4; break; }
    if (word) { tokens.push({ type: 'word', value: word }); idx += word.length; }
    else { const c = rawCode[idx]; tokens.push({ type: 'punct', value: c }); idx++; }
  }

  idx = skip(idx);
  if (rawCode[idx] === "'" || rawCode[idx] === '"') {
    const { str, index: afterStr } = rStr(idx);
    specifier = str;
    idx = skip(afterStr);
    const { word } = rWord(idx);
    if (word === 'with' || word === 'assert') {
      idx += word.length;
      idx = skip(idx);
      if (rawCode[idx] === '{') { while (idx < len && rawCode[idx] !== '}') idx++; if (rawCode[idx] === '}') idx++; }
    }
    if (rawCode[idx] === ';') idx++;
  } else {
    const { line, column } = getLineColumn(rawCode, idx);
    throw new BuildError({ message: `Expected string literal after 'from'`, file: filePath, line, column,
      suggestion: 'Ensure your import statement has a valid source string (e.g. from "module").', category: 'Syntax' });
  }

  dependencies.add(specifier);
  let defaultName = null, namespaceName = null, namedImports = [];
  let t = 0;
  if (tokens[t] && tokens[t].type === 'word' && tokens[t].value !== 'as') { defaultName = tokens[t].value; t++; if (tokens[t] && tokens[t].value === ',') t++; }
  if (tokens[t] && tokens[t].value === '*') {
    t++;
    if (tokens[t] && tokens[t].value === 'as') { t++; namespaceName = tokens[t].value; t++; }
  } else if (tokens[t] && tokens[t].value === '{') {
    t++;
    while (t < tokens.length && tokens[t].value !== '}') {
      if (tokens[t].value === ',') { t++; continue; }
      const orig = tokens[t].value; let alias = orig; t++;
      if (tokens[t] && tokens[t].value === 'as') { t++; alias = tokens[t].value; t++; }
      namedImports.push({ orig, alias });
    }
  }

  let tempVar = importTempVars.get(specifier);
  let isNew = false;
  if (!tempVar) {
    const h = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
    tempVar = `__mod_${h}`;
    importTempVars.set(specifier, tempVar);
    isNew = true;
  }

  let lines = [];
  if (isNew) lines.push(`const ${tempVar} = require('${specifier}');`);
  if (namespaceName) lines.push(`const ${namespaceName} = ${tempVar};`);
  if (defaultName) lines.push(`const ${defaultName} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
  if (namedImports.length > 0) {
    const renamed = namedImports.map(n => n.orig === n.alias ? n.orig : `${n.orig}: ${n.alias}`).join(', ');
    lines.push(`const { ${renamed} } = ${tempVar};`);
  }
  return { replacement: lines.join('\n') + (rawCode[idx-1] === ';' ? '' : ''), newIndex: idx };
}
