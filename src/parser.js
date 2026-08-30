import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger, colors } from './cli.js';


export class BuildError extends Error {
  constructor({ message, file, line, column, suggestion, category }) {
    super(message);
    this.name = 'BuildError';
    this.file = file;
    this.line = line;
    this.column = column;
    this.suggestion = suggestion;
    this.category = category || 'Build';
  }
}

export function getLineColumn(code, index) {
  if (index < 0) index = 0;
  if (index > code.length) index = code.length;
  const before = code.substring(0, index);
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

/**
 * Resolves a module specifier relative to the importing file.
 * Checks for extensions (.js, .mjs, .cjs, .ts, .json) and directory indexes.
 */
export function resolveModulePath(fromFile, specifier, rootDir = process.cwd()) {
  let candidate = '';

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    candidate = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // Treat bare specifier as relative to root or node_modules-like structure
    candidate = path.resolve(rootDir, specifier);
  }

  // 1. Exact file match
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    checkUnsupportedExtension(candidate);
    return candidate;
  }

  // 2. Try file extensions
  const extensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.css'];
  for (const ext of extensions) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 3. Try directory index file
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.css']) {
      const indexFile = path.join(candidate, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        checkUnsupportedExtension(indexFile);
        return indexFile;
      }
    }
  }
  
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    throw new BuildError({
      message: `Unable to resolve bare module specifier '${specifier}'`,
      file: fromFile,
      suggestion: 'ZeroPack does not currently support full npm package resolution from node_modules. Please use relative paths for local files.',
      category: 'Resolution'
    });
  }

  throw new BuildError({
    message: `Cannot resolve module '${specifier}' requested by '${path.relative(rootDir, fromFile)}'`,
    file: fromFile,
    suggestion: 'Check that the file exists and that the import path is correct.',
    category: 'Resolution'
  });
}

function checkUnsupportedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts' || ext === '.tsx' || ext === '.jsx') {
    throw new BuildError({
      message: `Unsupported syntax`,
      file: filePath,
      suggestion: `ZeroPack currently resolves ${ext} files but does not transform TypeScript or JSX.`,
      category: 'Syntax'
    });
  }
}

/**
 * Minifies a CSS string: strips comments and collapses whitespace.
 * Pure stdlib — no external packages.
 */
export function minifyCss(css) {
  // Remove /* ... */ block comments
  let out = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Collapse whitespace sequences (newlines, tabs, multiple spaces) to single space
  out = out.replace(/\s+/g, ' ');
  // Remove spaces around structural tokens: { } : ; ,
  out = out.replace(/\s*([{}:;,>~+])\s*/g, '$1');
  return out.trim();
}

/**
 * Extracts import/require specifiers and transforms ESM syntax into runtime CJS format.
 */
export function transformModuleCode(rawCode, filePath) {
  const dependencies = new Set();
  let output = '';
  const importTempVars = new Map();

  if (filePath.endsWith('.json')) {
    return {
      code: `module.exports = ${rawCode.trim() || '{}'};`,
      dependencies: []
    };
  }

  // CSS module: minify and generate a style-injection JS module
  if (filePath.endsWith('.css')) {
    const minified = minifyCss(rawCode);
    // Escape backticks and backslashes so the CSS is safe inside a template literal
    const escaped = minified.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    const code = [
      `const __css = \`${escaped}\`;`,
      `if (typeof document !== 'undefined') {`,
      `  const __style = document.createElement('style');`,
      `  __style.setAttribute('data-zeropack', ${JSON.stringify(filePath)});`,
      `  __style.textContent = __css;`,
      `  document.head.appendChild(__style);`,
      `}`,
      `module.exports = __css;`
    ].join('\n');
    return { code, dependencies: [] };
  }

  let i = 0;
  const len = rawCode.length;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateLiteral = false;
  let inRegex = false;
  let isEscaped = false;

  function skipWhitespaceAndComments(index) {
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

  function readWord(index) {
    let word = '';
    while (index < len && /[a-zA-Z_$0-9]/.test(rawCode[index])) {
      word += rawCode[index++];
    }
    return { word, index };
  }

  function readString(index) {
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

  function parseImport(startI) {
    let idx = startI + 6;
    idx = skipWhitespaceAndComments(idx);
    
    if (rawCode[idx] === '(') {
      idx++;
      idx = skipWhitespaceAndComments(idx);
      if (rawCode[idx] === "'" || rawCode[idx] === '"' || rawCode[idx] === '`') {
        const { str: specifier, index: afterString } = readString(idx);
        idx = skipWhitespaceAndComments(afterString);
        if (rawCode[idx] === ')') {
          idx++;
          dependencies.add(specifier);
          return {
            replacement: `Promise.resolve(require('${specifier}'))`,
            newIndex: idx
          };
        }
      }
      const { line, column } = getLineColumn(rawCode, idx);
      throw new BuildError({
        message: `Unsupported dynamic import expression`,
        file: filePath,
        line,
        column,
        suggestion: 'ZeroPack only supports static string literals in dynamic imports, e.g., import("./file.js").',
        category: 'Syntax'
      });
    }

    let clause = '';
    let specifier = '';
    
    if (rawCode[idx] === "'" || rawCode[idx] === '"') {
      const { str, index: afterStr } = readString(idx);
      specifier = str;
      idx = skipWhitespaceAndComments(afterStr);
      
      const { word } = readWord(idx);
      if (word === 'with' || word === 'assert') {
         idx += word.length;
         idx = skipWhitespaceAndComments(idx);
         if (rawCode[idx] === '{') {
            while (idx < len && rawCode[idx] !== '}') idx++;
            if (rawCode[idx] === '}') idx++;
         }
      }
      if (rawCode[idx] === ';') idx++;
      
      dependencies.add(specifier);
      return {
        replacement: `require('${specifier}')` + (rawCode[idx-1] === ';' ? ';' : ''),
        newIndex: idx
      };
    }

    let tokens = [];
    while (idx < len) {
      idx = skipWhitespaceAndComments(idx);
      const { word } = readWord(idx);
      if (word === 'from') {
        idx += 4;
        break;
      }
      if (word) {
        tokens.push({ type: 'word', value: word });
        idx += word.length;
      } else {
        const c = rawCode[idx];
        tokens.push({ type: 'punct', value: c });
        idx++;
      }
    }

    idx = skipWhitespaceAndComments(idx);
    if (rawCode[idx] === "'" || rawCode[idx] === '"') {
      const { str, index: afterStr } = readString(idx);
      specifier = str;
      idx = skipWhitespaceAndComments(afterStr);
      const { word } = readWord(idx);
      if (word === 'with' || word === 'assert') {
         idx += word.length;
         idx = skipWhitespaceAndComments(idx);
         if (rawCode[idx] === '{') {
            while (idx < len && rawCode[idx] !== '}') idx++;
            if (rawCode[idx] === '}') idx++;
         }
      }
      if (rawCode[idx] === ';') idx++;
    } else {
      const { line, column } = getLineColumn(rawCode, idx);
      throw new BuildError({
        message: `Expected string literal after 'from'`,
        file: filePath,
        line,
        column,
        suggestion: 'Ensure your import statement has a valid source string (e.g. from "module").',
        category: 'Syntax'
      });
    }

    dependencies.add(specifier);

    let defaultName = null;
    let namespaceName = null;
    let namedImports = [];

    let t = 0;
    if (tokens[t] && tokens[t].type === 'word' && tokens[t].value !== 'as') {
      defaultName = tokens[t].value;
      t++;
      if (tokens[t] && tokens[t].value === ',') t++;
    }
    
    if (tokens[t] && tokens[t].value === '*') {
      t++;
      if (tokens[t] && tokens[t].value === 'as') {
        t++;
        namespaceName = tokens[t].value;
        t++;
      }
    } else if (tokens[t] && tokens[t].value === '{') {
      t++;
      while (t < tokens.length && tokens[t].value !== '}') {
        if (tokens[t].value === ',') { t++; continue; }
        const orig = tokens[t].value;
        let alias = orig;
        t++;
        if (tokens[t] && tokens[t].value === 'as') {
          t++;
          alias = tokens[t].value;
          t++;
        }
        namedImports.push({ orig, alias });
      }
    }

    let tempVar = importTempVars.get(specifier);
    let isNew = false;
    if (!tempVar) {
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      tempVar = `__mod_${specifierHash}`;
      importTempVars.set(specifier, tempVar);
      isNew = true;
    }
    
    let lines = [];
    if (isNew) {
      lines.push(`const ${tempVar} = require('${specifier}');`);
    }
    
    if (namespaceName) {
      lines.push(`const ${namespaceName} = ${tempVar};`);
    }
    if (defaultName) {
      lines.push(`const ${defaultName} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
    }
    if (namedImports.length > 0) {
      const renamed = namedImports.map(n => n.orig === n.alias ? n.orig : `${n.orig}: ${n.alias}`).join(', ');
      lines.push(`const { ${renamed} } = ${tempVar};`);
    }
    
    return {
      replacement: lines.join('\n') + (rawCode[idx-1] === ';' ? '' : ''),
      newIndex: idx
    };
  }

  function parseExport(startI) {
    let idx = startI + 6;
    idx = skipWhitespaceAndComments(idx);
    
    let { word } = readWord(idx);
    
    if (word === 'default') {
      idx += 7;
      idx = skipWhitespaceAndComments(idx);
      
      let { word: nextWord } = readWord(idx);
      if (nextWord === 'function' || nextWord === 'class') {
        let peekIdx = skipWhitespaceAndComments(idx + nextWord.length);
        let { word: name } = readWord(peekIdx);
        if (name) {
          if (nextWord === 'function') {
            return {
              replacement: `module.exports.default = ${name};\nfunction ${name}`,
              newIndex: peekIdx + name.length
            };
          } else {
            return {
              replacement: `const ${name} = module.exports.default = class ${name}`,
              newIndex: peekIdx + name.length
            };
          }
        }
        return {
          replacement: `module.exports.default = `,
          newIndex: idx
        };
      }
      
      let exprEnd = idx;
      let braceCount = 0;
      let parenCount = 0;
      let inSq = false;
      let inDq = false;
      let inTl = false;
      let isEsc = false;

      while (exprEnd < len) {
        const c = rawCode[exprEnd];
        const nextC = rawCode[exprEnd + 1];
        
        if (isEsc) { isEsc = false; exprEnd++; continue; }
        if (c === '\\') { isEsc = true; exprEnd++; continue; }
        
        if (c === "'" && !inDq && !inTl) { inSq = !inSq; exprEnd++; continue; }
        if (c === '"' && !inSq && !inTl) { inDq = !inDq; exprEnd++; continue; }
        if (c === '`' && !inSq && !inDq) { inTl = !inTl; exprEnd++; continue; }
        if (inSq || inDq || inTl) { exprEnd++; continue; }
        
        if (c === '/' && nextC === '/') {
           exprEnd += 2;
           while (exprEnd < len && rawCode[exprEnd] !== '\n') exprEnd++;
           continue;
        }
        if (c === '/' && nextC === '*') {
           exprEnd += 2;
           while (exprEnd < len && !(rawCode[exprEnd] === '*' && rawCode[exprEnd+1] === '/')) exprEnd++;
           exprEnd += 2;
           continue;
        }
        
        if (c === '{') braceCount++;
        else if (c === '}') braceCount--;
        else if (c === '(') parenCount++;
        else if (c === ')') parenCount--;
        
        if (c === ';' && braceCount === 0 && parenCount === 0) {
          exprEnd++;
          break;
        }
        if (c === '\n' && braceCount === 0 && parenCount === 0) {
          break;
        }
        exprEnd++;
      }
      const expr = rawCode.slice(idx, rawCode[exprEnd - 1] === ';' ? exprEnd - 1 : exprEnd).trim();
      return {
        replacement: `const __defaultExport = (${expr});\nmodule.exports.default = __defaultExport;\nif (typeof __defaultExport === 'object' && __defaultExport !== null) { Object.assign(module.exports, __defaultExport); }\n`,
        newIndex: exprEnd
      };
    }
    
    if (word === 'const' || word === 'let' || word === 'var') {
      idx += word.length;
      idx = skipWhitespaceAndComments(idx);
      const { word: varName } = readWord(idx);
      while (idx < len && rawCode[idx] !== '=') idx++;
      if (rawCode[idx] === '=') idx++;
      return {
        replacement: `${word} ${varName} = module.exports.${varName} =`,
        newIndex: idx
      };
    }
    
    if (word === 'function' || word === 'class') {
      idx += word.length;
      idx = skipWhitespaceAndComments(idx);
      const { word: name } = readWord(idx);
      if (word === 'function') {
        return {
          replacement: `module.exports.${name} = ${name};\nfunction ${name}`,
          newIndex: idx + name.length
        };
      } else {
        return {
          replacement: `const ${name} = module.exports.${name} = class ${name}`,
          newIndex: idx + name.length
        };
      }
    }
    
    if (rawCode[idx] === '{') {
      let tokens = [];
      while (idx < len) {
        idx = skipWhitespaceAndComments(idx);
        const { word: tWord } = readWord(idx);
        if (tWord) {
          tokens.push({ type: 'word', value: tWord });
          idx += tWord.length;
        } else {
          const c = rawCode[idx];
          tokens.push({ type: 'punct', value: c });
          idx++;
          if (c === '}') break;
        }
      }
      
      idx = skipWhitespaceAndComments(idx);
      let { word: fromWord } = readWord(idx);
      
      let reexports = [];
      let t = 1; 
      while (t < tokens.length && tokens[t].value !== '}') {
        if (tokens[t].value === ',') { t++; continue; }
        const orig = tokens[t].value;
        let alias = orig;
        t++;
        if (tokens[t] && tokens[t].value === 'as') {
          t++;
          alias = tokens[t].value;
          t++;
        }
        reexports.push({ orig, alias });
      }
      
      if (fromWord === 'from') {
        idx += 4;
        idx = skipWhitespaceAndComments(idx);
        if (rawCode[idx] === "'" || rawCode[idx] === '"') {
          const { str: specifier, index: afterStr } = readString(idx);
          idx = afterStr;
          idx = skipWhitespaceAndComments(idx);
          const { word: attrWord } = readWord(idx);
          if (attrWord === 'with' || attrWord === 'assert') {
             idx += attrWord.length;
             idx = skipWhitespaceAndComments(idx);
             if (rawCode[idx] === '{') {
                while (idx < len && rawCode[idx] !== '}') idx++;
                if (rawCode[idx] === '}') idx++;
             }
          }
          if (rawCode[idx] === ';') idx++;
          
          dependencies.add(specifier);
          let lines = [];
          for (const { orig, alias } of reexports) {
            lines.push(`module.exports.${alias} = require('${specifier}').${orig};`);
          }
          return {
            replacement: lines.join('\n') + (lines.length > 0 ? '\n' : ''),
            newIndex: idx
          };
        }
      } else {
        if (rawCode[idx] === ';') idx++;
        let lines = [];
        for (const { orig, alias } of reexports) {
          lines.push(`module.exports.${alias} = ${orig};`);
        }
        return {
          replacement: lines.join('\n') + (lines.length > 0 ? '\n' : ''),
          newIndex: idx
        };
      }
    }

    if (rawCode[idx] === '*') {
      idx++;
      idx = skipWhitespaceAndComments(idx);
      let { word: fromWord } = readWord(idx);
      if (fromWord === 'from') {
        idx += 4;
        idx = skipWhitespaceAndComments(idx);
        if (rawCode[idx] === "'" || rawCode[idx] === '"') {
          const { str: specifier, index: afterStr } = readString(idx);
          idx = afterStr;
          idx = skipWhitespaceAndComments(idx);
          if (rawCode[idx] === ';') idx++;
          
          dependencies.add(specifier);
          return {
            replacement: `Object.assign(module.exports, require('${specifier}'));`,
            newIndex: idx
          };
        }
      }
    }

    const { line, column } = getLineColumn(rawCode, idx);
    throw new BuildError({
      message: `Unsupported export syntax`,
      file: filePath,
      line,
      column,
      suggestion: 'ZeroPack supports export default, export const/let/var, export function/class, and export { ... }. Check your syntax.',
      category: 'Syntax'
    });
  }

  let lastRegexNonWhitespace = '';

  while (i < len) {
    const char = rawCode[i];
    const nextChar = rawCode[i + 1];
    
    if (isEscaped) {
      output += char;
      isEscaped = false;
      i++;
      continue;
    }
    
    if (char === '\\' && (inSingleQuote || inDoubleQuote || inTemplateLiteral || inRegex)) {
      output += char;
      isEscaped = true;
      i++;
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inTemplateLiteral && !inRegex) {
      inSingleQuote = !inSingleQuote;
      output += char;
      i++;
      continue;
    }
    if (char === '"' && !inSingleQuote && !inTemplateLiteral && !inRegex) {
      inDoubleQuote = !inDoubleQuote;
      output += char;
      i++;
      continue;
    }
    if (char === '\`' && !inSingleQuote && !inDoubleQuote && !inRegex) {
      inTemplateLiteral = !inTemplateLiteral;
      output += char;
      i++;
      continue;
    }
    
    if (inSingleQuote || inDoubleQuote || inTemplateLiteral) {
      output += char;
      i++;
      continue;
    }

    if (char === '/' && nextChar === '/' && !inRegex) {
      output += char + nextChar;
      i += 2;
      while (i < len && rawCode[i] !== '\n') {
        output += rawCode[i];
        i++;
      }
      continue;
    }
    if (char === '/' && nextChar === '*' && !inRegex) {
      output += char + nextChar;
      i += 2;
      while (i < len && !(rawCode[i] === '*' && rawCode[i + 1] === '/')) {
        output += rawCode[i];
        i++;
      }
      if (i < len) {
        output += '*/';
        i += 2;
      }
      continue;
    }

    if (char === '/' && !inRegex) {
      const isRegexStart = /[(,=:[!&|?{};]/.test(lastRegexNonWhitespace) || /\breturn$/.test(output.trim());
      if (isRegexStart) {
        inRegex = true;
        output += char;
        i++;
        continue;
      }
    } else if (char === '/' && inRegex) {
      inRegex = false;
      output += char;
      i++;
      continue;
    }
    if (inRegex) {
      output += char;
      i++;
      continue;
    }

    if (!/\s/.test(char)) {
      lastRegexNonWhitespace = char;
    }

    if (/[a-zA-Z_$]/.test(char)) {
      let prevIdx = i - 1;
      while (prevIdx >= 0 && /\s/.test(rawCode[prevIdx])) prevIdx--;
      const prevChar = prevIdx >= 0 ? rawCode[prevIdx] : '';

      const { word, index: afterWord } = readWord(i);
      if (prevChar === '.') {
         output += word;
         i = afterWord;
         continue;
      }
      if (word === 'require') {
         let rIdx = skipWhitespaceAndComments(afterWord);
         if (rawCode[rIdx] === '(') {
           rIdx++;
           rIdx = skipWhitespaceAndComments(rIdx);
           if (rawCode[rIdx] === "'" || rawCode[rIdx] === '"' || rawCode[rIdx] === '`') {
             const { str: specifier } = readString(rIdx);
             dependencies.add(specifier);
           }
         }
         output += word;
         i = afterWord;
      } else if (word === 'import') {
         const { replacement, newIndex } = parseImport(i);
         output += replacement;
         i = newIndex;
      } else if (word === 'export') {
         const { replacement, newIndex } = parseExport(i);
         output += replacement;
         i = newIndex;
      } else {
         output += word;
         i = afterWord;
      }
      continue;
    }

    output += char;
    i++;
  }

  return {
    code: output,
    dependencies: Array.from(dependencies)
  };
}

/**
 * Builds the complete dependency graph starting from entry file.
 * Returns an array of module node objects.
 */
export function buildDependencyGraph(entryPath, rootDir = process.cwd()) {
  const absoluteEntry = path.isAbsolute(entryPath) ? entryPath : path.resolve(rootDir, entryPath);

  if (!fs.existsSync(absoluteEntry)) {
    throw new BuildError({
      message: `Entry file not found: ${absoluteEntry}`,
      file: absoluteEntry,
      suggestion: 'Ensure the entry path specified in the CLI exists.',
      category: 'Build'
    });
  }

  let nextId = 0;
  const fileToIdMap = new Map();
  const graph = [];
  const visitedFiles = new Set();
  const recursionStack = new Set();

  function createModule(absoluteFilePath) {
    let rawContent;
    try {
      rawContent = fs.readFileSync(absoluteFilePath, 'utf8');
    } catch (err) {
      throw new BuildError({
        message: `Failed to read file: ${err.message}`,
        file: absoluteFilePath,
        suggestion: 'Check file permissions or if the file was deleted.',
        category: 'FileSystem'
      });
    }
    const hash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const { code, dependencies } = transformModuleCode(rawContent, absoluteFilePath);

    const id = nextId++;
    fileToIdMap.set(absoluteFilePath, id);

    const moduleNode = {
      id,
      filePath: absoluteFilePath,
      relativePath: path.relative(rootDir, absoluteFilePath).replace(/\\/g, '/'),
      code,
      dependencies,
      mapping: {},
      hash
    };

    return moduleNode;
  }

  function traverse(absoluteFilePath, parentFile = null) {
    if (recursionStack.has(absoluteFilePath)) {
      logger.warn(`Circular dependency detected: ${colors.yellow(path.relative(rootDir, absoluteFilePath))} (imported by ${colors.gray(parentFile ? path.relative(rootDir, parentFile) : 'root')})`);
      return fileToIdMap.get(absoluteFilePath);
    }

    if (visitedFiles.has(absoluteFilePath)) {
      return fileToIdMap.get(absoluteFilePath);
    }

    visitedFiles.add(absoluteFilePath);
    recursionStack.add(absoluteFilePath);

    const moduleNode = createModule(absoluteFilePath);
    graph.push(moduleNode);

    for (const depSpecifier of moduleNode.dependencies) {
      try {
        const resolvedDepPath = resolveModulePath(absoluteFilePath, depSpecifier, rootDir);
        const childId = traverse(resolvedDepPath, absoluteFilePath);
        moduleNode.mapping[depSpecifier] = childId;
      } catch (err) {
        logger.error(`Module resolution failed for '${depSpecifier}' in '${path.relative(rootDir, absoluteFilePath)}': ${err.message}`);
        if (err.name === 'BuildError') throw err;
        throw new BuildError({
          message: `Cannot resolve module '${depSpecifier}' imported from '${path.relative(rootDir, absoluteFilePath)}'`,
          file: absoluteFilePath,
          suggestion: 'Check that the dependency exists and the path is correct.',
          category: 'Resolution'
        });
      }
    }

    recursionStack.delete(absoluteFilePath);
    return moduleNode.id;
  }

  traverse(absoluteEntry);

  return graph;
}
