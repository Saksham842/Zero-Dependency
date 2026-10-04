import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { StringDecoder } from 'node:string_decoder';
import { logger, colors } from './cli.js';
import { generateSourceMap } from './sourcemap.js';


// Precomputed lookup tables for ultra-high minifier throughput
const IS_WORD = new Uint8Array(128);
for (let c = 48; c <= 57; c++) IS_WORD[c] = 1; // 0-9
for (let c = 65; c <= 90; c++) IS_WORD[c] = 1; // A-Z
for (let c = 97; c <= 122; c++) IS_WORD[c] = 1; // a-z
IS_WORD[95] = 1; // _
IS_WORD[36] = 1; // $

const CAN_PRECEDE_REGEX_CHAR = new Uint8Array(128);
const regexPrecedeChars = '(=:[!&|?{};,^~<>+-*/%';
for (let idx = 0; idx < regexPrecedeChars.length; idx++) {
  CAN_PRECEDE_REGEX_CHAR[regexPrecedeChars.charCodeAt(idx)] = 1;
}

const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'case', 'typeof', 'yield', 'await', 'delete',
  'void', 'throw', 'default', 'do', 'else', 'instanceof', 'in', 'new'
]);

const CAN_END_ASI_CHAR = new Uint8Array(128);
for (let c = 0; c < 128; c++) if (IS_WORD[c]) CAN_END_ASI_CHAR[c] = 1;
const asiEndChars = ')]}"\'`';
for (let idx = 0; idx < asiEndChars.length; idx++) {
  CAN_END_ASI_CHAR[asiEndChars.charCodeAt(idx)] = 1;
}

const CAN_START_ASI_CHAR = new Uint8Array(128);
for (let c = 0; c < 128; c++) if (IS_WORD[c]) CAN_START_ASI_CHAR[c] = 1;
const asiStartChars = '(/[{';
for (let idx = 0; idx < asiStartChars.length; idx++) {
  CAN_START_ASI_CHAR[asiStartChars.charCodeAt(idx)] = 1;
}

function isWordCode(code) {
  return code < 128 ? IS_WORD[code] === 1 : code >= 0x80;
}

function canPrecedeRegex(tok) {
  if (!tok) return true;
  const lastCode = tok.charCodeAt(tok.length - 1);
  if (lastCode < 128 && CAN_PRECEDE_REGEX_CHAR[lastCode] === 1) return true;
  return REGEX_PRECEDING_KEYWORDS.has(tok);
}

/**
 * High-performance state-machine minifier using array chunks, lookup tables, and single slices.
 */
export function minifyCode(code, options = {}) {
  const { sourcemap = false, initialLineMappings = null } = options;
  const len = code.length;
  const chunks = [];
  let i = 0;

  const stack = ['CODE'];
  const braceStack = [];

  let lastSignificantToken = '';
  let hadNewline = false;

  let inLine = 0;
  let inCol = 0;
  let outLine = 0;
  let outCol = 0;
  const minifiedLineMappings = [[]];

  let lastCharCode = 0;
  let lastChar = '';
  let lastTwoChars = '';

  function appendToken(token) {
    const firstCharCode = token.charCodeAt(0);

    // Preserve newlines where ASI is required
    if (hadNewline) {
      const prevCanEnd = (lastCharCode < 128 && CAN_END_ASI_CHAR[lastCharCode] === 1) || lastTwoChars === '++' || lastTwoChars === '--';
      const nextCanStart = (firstCharCode < 128 && CAN_START_ASI_CHAR[firstCharCode] === 1);
      if (prevCanEnd && nextCanStart) {
        chunks.push('\n');
        outLine++;
        outCol = 0;
        lastCharCode = 10;
        lastChar = '\n';
        lastTwoChars = '\n';
        if (sourcemap) minifiedLineMappings.push([]);
      }
    }

    // Insert separating space between identifiers, keywords, or colliding operators
    if (isWordCode(lastCharCode) && isWordCode(firstCharCode)) {
      chunks.push(' ');
      outCol++;
      lastCharCode = 32;
    } else if (lastCharCode === 43 && firstCharCode === 43) { // '+' and '+'
      chunks.push(' ');
      outCol++;
      lastCharCode = 32;
    } else if (lastCharCode === 45 && firstCharCode === 45) { // '-' and '-'
      chunks.push(' ');
      outCol++;
      lastCharCode = 32;
    } else if (lastCharCode === 47 && firstCharCode === 47) { // '/' and '/'
      chunks.push(' ');
      outCol++;
      lastCharCode = 32;
    }

    if (sourcemap && initialLineMappings && initialLineMappings[inLine] && initialLineMappings[inLine].length > 0) {
      const [_, srcIdx, oLine, _origCol] = initialLineMappings[inLine][0];
      minifiedLineMappings[minifiedLineMappings.length - 1].push([outCol, srcIdx, oLine, inCol]);
    }

    chunks.push(token);
    outCol += token.length;
    hadNewline = false;
    lastSignificantToken = token;
    const tlen = token.length;
    lastCharCode = token.charCodeAt(tlen - 1);
    lastChar = token[tlen - 1];
    lastTwoChars = tlen >= 2 ? token.slice(-2) : (lastChar + token);
  }

  while (i < len) {
    const cCode = code.charCodeAt(i);
    const char = code[i];
    const ctx = stack[stack.length - 1];

    if (cCode === 10) { // '\n'
      inLine++;
      inCol = 0;
    } else {
      inCol++;
    }

    if (ctx === 'TEMPLATE') {
      if (cCode === 92) { // '\\'
        chunks.push(code.slice(i, i + 2));
        outCol += 2;
        i += 2;
        lastCharCode = code.charCodeAt(i - 1);
        continue;
      }
      if (cCode === 96) { // '`'
        stack.pop();
        chunks.push('`');
        outCol++;
        lastSignificantToken = '`';
        lastCharCode = 96;
        lastChar = '`';
        i++;
        continue;
      }
      if (cCode === 36 && i + 1 < len && code.charCodeAt(i + 1) === 123) { // '${'
        stack.push('EXPR');
        braceStack.push(1);
        chunks.push('${');
        outCol += 2;
        i += 2;
        lastSignificantToken = '{';
        lastCharCode = 123;
        lastChar = '{';
        continue;
      }

      // Fast-forward template literal characters in a single slice
      const tStart = i;
      while (i < len) {
        const c = code.charCodeAt(i);
        if (c === 92 || c === 96 || (c === 36 && i + 1 < len && code.charCodeAt(i + 1) === 123)) break;
        if (c === 10) {
          inLine++;
          inCol = 0;
          outLine++;
          outCol = 0;
          if (sourcemap) minifiedLineMappings.push([]);
        } else {
          inCol++;
          outCol++;
        }
        i++;
      }
      if (i > tStart) {
        const slice = code.slice(tStart, i);
        chunks.push(slice);
        lastCharCode = slice.charCodeAt(slice.length - 1);
        lastChar = slice[slice.length - 1];
      }
      continue;
    }

    // Inside CODE or EXPR:
    // 0. Hashbang comment (#!/usr/bin/env node)
    if (cCode === 35 && i + 1 < len && code.charCodeAt(i + 1) === 33) {
      const nextNl = code.indexOf('\n', i + 2);
      i = nextNl === -1 ? len : nextNl;
      hadNewline = true;
      continue;
    }

    // 1. Single line comment
    if (cCode === 47 && i + 1 < len && code.charCodeAt(i + 1) === 47) {
      const nextNl = code.indexOf('\n', i + 2);
      i = nextNl === -1 ? len : nextNl;
      hadNewline = true;
      continue;
    }

    // 2. Multi line comment
    if (cCode === 47 && i + 1 < len && code.charCodeAt(i + 1) === 42) {
      const nextEnd = code.indexOf('*/', i + 2);
      const end = nextEnd === -1 ? len : nextEnd + 2;
      if (sourcemap) {
        for (let c = i; c < end; c++) {
          if (code.charCodeAt(c) === 10) {
            hadNewline = true;
            inLine++;
            inCol = 0;
          }
        }
      } else {
        if (code.slice(i, end).includes('\n')) hadNewline = true;
      }
      i = end;
      continue;
    }

    // 3. Template literal start
    if (cCode === 96) {
      appendToken('`');
      stack.push('TEMPLATE');
      i++;
      continue;
    }

    // 4. Single / Double quoted strings
    if (cCode === 39 || cCode === 34) {
      const q = cCode;
      const sStart = i++;
      while (i < len) {
        const c = code.charCodeAt(i);
        if (c === 92) {
          i += 2;
        } else if (c === q) {
          i++;
          break;
        } else {
          i++;
        }
      }
      appendToken(code.slice(sStart, i));
      continue;
    }

    // 5. Regex literal vs division
    if (cCode === 47 && canPrecedeRegex(lastSignificantToken)) {
      const rStart = i++;
      let inCharClass = false;
      while (i < len) {
        const c = code.charCodeAt(i);
        if (c === 92) {
          i += 2;
        } else if (c === 91 && !inCharClass) {
          inCharClass = true;
          i++;
        } else if (c === 93 && inCharClass) {
          inCharClass = false;
          i++;
        } else if (c === 47 && !inCharClass) {
          i++;
          while (i < len && isWordCode(code.charCodeAt(i))) {
            i++;
          }
          break;
        } else {
          i++;
        }
      }
      appendToken(code.slice(rStart, i));
      continue;
    }

    // 6. Curly braces in EXPR
    if (ctx === 'EXPR') {
      if (cCode === 123) {
        braceStack[braceStack.length - 1]++;
      } else if (cCode === 125) {
        braceStack[braceStack.length - 1]--;
        if (braceStack[braceStack.length - 1] === 0) {
          braceStack.pop();
          stack.pop();
          chunks.push('}');
          outCol++;
          lastSignificantToken = '}';
          lastCharCode = 125;
          lastChar = '}';
          i++;
          continue;
        }
      }
    }

    // 7. Whitespace handling
    if (cCode <= 32) {
      if (cCode === 10 || cCode === 13) {
        hadNewline = true;
      }
      i++;
      while (i < len) {
        const nextC = code.charCodeAt(i);
        if (nextC > 32) break;
        if (nextC === 10 || nextC === 13) {
          hadNewline = true;
        }
        i++;
      }
      continue;
    }

    // 8. Word tokens (identifiers, numbers, keywords)
    if (isWordCode(cCode)) {
      const wStart = i++;
      while (i < len && isWordCode(code.charCodeAt(i))) {
        i++;
      }
      appendToken(code.slice(wStart, i));
      continue;
    }

    // 9. Multi-char operators (++ , --)
    if ((cCode === 43 && i + 1 < len && code.charCodeAt(i + 1) === 43) ||
        (cCode === 45 && i + 1 < len && code.charCodeAt(i + 1) === 45)) {
      appendToken(code.slice(i, i + 2));
      i += 2;
      continue;
    }

    // 10. Single punctuation/operator
    appendToken(char);
    i++;
  }

  const output = chunks.join('');
  if (sourcemap) {
    return {
      code: output.trim(),
      lineMappings: minifiedLineMappings
    };
  }

  return output.trim();
}

/**
 * Normalizes a define value into a valid JavaScript literal representation.
 */
export function normalizeDefineValue(val) {
  if (typeof val === 'boolean' || typeof val === 'number') {
    return String(val);
  }
  if (typeof val !== 'string') {
    return JSON.stringify(val);
  }
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    !isNaN(Number(trimmed))
  ) {
    return trimmed;
  }
  return JSON.stringify(trimmed);
}

/**
 * Scans JavaScript code and replaces identifiers defined in defineMap without
 * replacing occurrences inside strings, comments, or larger identifiers.
 */
export function applyDefine(code, rawDefineMap) {
  if (!rawDefineMap || typeof rawDefineMap !== 'object') return code;
  const entries = Object.entries(rawDefineMap);
  if (entries.length === 0) return code;

  const defineMap = {};
  for (const [k, v] of entries) {
    defineMap[k] = normalizeDefineValue(v);
  }

  // Sort keys by length descending so longer keys match first (e.g. process.env.NODE_ENV before process.env)
  const sortedKeys = Object.keys(defineMap).sort((a, b) => b.length - a.length);

  let output = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    const ch = code[i];
    const nextCh = i + 1 < len ? code[i + 1] : '';

    // 1. Single-line comment
    if (ch === '/' && nextCh === '/') {
      const end = code.indexOf('\n', i + 2);
      if (end === -1) {
        output += code.slice(i);
        break;
      }
      output += code.slice(i, end + 1);
      i = end + 1;
      continue;
    }

    // 2. Multi-line comment
    if (ch === '/' && nextCh === '*') {
      const end = code.indexOf('*/', i + 2);
      if (end === -1) {
        output += code.slice(i);
        break;
      }
      output += code.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // 3. String literal: '...' or "..."
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      while (j < len) {
        if (code[j] === '\\') {
          j += 2;
        } else if (code[j] === quote) {
          j++;
          break;
        } else {
          j++;
        }
      }
      output += code.slice(i, j);
      i = j;
      continue;
    }

    // 4. Template literal: `...`
    if (ch === '`') {
      output += '`';
      i++;
      while (i < len && code[i] !== '`') {
        if (code[i] === '\\') {
          output += code[i] + (code[i + 1] || '');
          i += 2;
        } else if (code[i] === '$' && code[i + 1] === '{') {
          output += '${';
          i += 2;
          let braceDepth = 1;
          let exprStart = i;
          while (i < len && braceDepth > 0) {
            const ech = code[i];
            if (ech === "'" || ech === '"' || ech === '`') {
              const eq = ech;
              i++;
              while (i < len && code[i] !== eq) {
                if (code[i] === '\\') i++;
                i++;
              }
              if (i < len) i++;
            } else if (ech === '{') {
              braceDepth++;
              i++;
            } else if (ech === '}') {
              braceDepth--;
              if (braceDepth === 0) {
                const expr = code.slice(exprStart, i);
                output += applyDefine(expr, defineMap);
                output += '}';
                i++;
                break;
              }
              i++;
            } else {
              i++;
            }
          }
        } else {
          output += code[i];
          i++;
        }
      }
      if (i < len && code[i] === '`') {
        output += '`';
        i++;
      }
      continue;
    }

    // 5. Check if starting identifier matches any define key
    let matched = false;
    for (const key of sortedKeys) {
      if (code.startsWith(key, i)) {
        const prevChar = i > 0 ? code[i - 1] : '';
        const isPrevIdent = /[a-zA-Z0-9_$.]/.test(prevChar);
        const nextCharAfter = i + key.length < len ? code[i + key.length] : '';
        const isNextIdent = /[a-zA-Z0-9_$.]/.test(nextCharAfter);

        if (!isPrevIdent && !isNextIdent) {
          output += defineMap[key];
          i += key.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      output += ch;
      i++;
    }
  }

  return output;
}

/**
 * Bundles the dependency graph into a deterministic, single-file IIFE bundle
 * and collects rich build metrics for the ZeroPack dashboard.
 */
export function generateBundle(graph, options = {}) {
  const startTime = Date.now();
  const {
    minify = false,
    hmr = false,
    sourcemap = false,
    define = {},
    outFile = 'dist/bundle.js'
  } = options;

  // 1. Calculate original size and module metrics
  let originalSize = 0;
  const moduleStats = [];

  for (const mod of graph) {
    const modBytes = mod.byteLength !== undefined ? mod.byteLength : Buffer.byteLength(mod.code || '', 'utf8');
    const modGzip = mod.gzipSize !== undefined ? mod.gzipSize : zlib.gzipSync(Buffer.from(mod.code || '', 'utf8')).length;
    originalSize += modBytes;
    moduleStats.push({
      id: mod.id,
      filePath: mod.relativePath || mod.filePath,
      size: modBytes,
      gzipSize: modGzip,
      dependencies: Object.keys(mod.mapping || {}),
      mapping: mod.mapping || {}
    });
  }

  // Sort modules by size descending for dashboard charts
  moduleStats.sort((a, b) => b.size - a.size);

  // 2. Sort modules deterministically by relative path for byte-identical reproducible builds
  const sortedGraph = [...graph].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const sources = sortedGraph.map((mod) => ({
    path: mod.relativePath,
    content: mod.rawCode || mod.code
  }));

  // Track line mappings for source maps
  const lineMappings = [];
  function addEmptyLines(count) {
    for (let c = 0; c < count; c++) lineMappings.push([]);
  }

  // 3. Runtime bundle template header
  const headerTemplate = `/**
 * Bundled by ZeroPack (Zero-Dependency Bundler)
 */
(function(modules) {
  // Module cache
  var installedModules = {};

  function __zeropack_require__(moduleId) {
    // Check if module is in cache
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }

    // Create a new module and put it into the cache
    var module = installedModules[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {}
    };

    var fn = modules[moduleId][0];
    var mapping = modules[moduleId][1];

    function localRequire(name) {
      if (mapping[name] === undefined) {
        throw new Error('ZeroPack: Cannot find module \\'' + name + '\\' from module ID ' + moduleId);
      }
      return __zeropack_require__(mapping[name]);
    }

    // Execute the module function
    try {
      fn(localRequire, module, module.exports);
    } catch (e) {
      console.error('[ZeroPack Runtime Error in Module ' + moduleId + ']:', e);
      throw e;
    }

    module.loaded = true;
    return module.exports;
  }

  // Expose require to window/global in dev mode if needed
  if (typeof window !== 'undefined') {
    window.__zeropack_modules__ = modules;
    window.__zeropack_require__ = __zeropack_require__;
  }

  // Load entry module (id: 0)
  return __zeropack_require__(0);
})({`;

  let bundleSource = headerTemplate;
  addEmptyLines(headerTemplate.split('\n').length - 1);

  // Build modules mapping string using array chunks
  const moduleChunks = ['\n'];
  addEmptyLines(1);

  for (let modIdx = 0; modIdx < sortedGraph.length; modIdx++) {
    const mod = sortedGraph[modIdx];
    const mappingJson = JSON.stringify(mod.mapping);

    moduleChunks.push(`  ${mod.id}: [\n    function(require, module, exports) {\n// [ZeroPack Module: ${mod.relativePath}]\n`);
    addEmptyLines(3);

    let moduleCode = mod.code;
    if (define && Object.keys(define).length > 0) {
      moduleCode = applyDefine(moduleCode, define);
    }

    const codeLines = moduleCode.split('\n');
    for (let l = 0; l < codeLines.length; l++) {
      moduleChunks.push(codeLines[l] + '\n');
      lineMappings.push([[0, modIdx, l, 0]]);
    }

    moduleChunks.push(`    },\n    ${mappingJson}\n  ],\n`);
    addEmptyLines(3);
  }
  moduleChunks.push('});\n');
  addEmptyLines(1);

  bundleSource += moduleChunks.join('');

  // 5. Inject HMR Client Runtime if requested
  if (hmr) {
    const hmrClient = `
// --- ZeroPack Native HMR Client Runtime ---
(function() {
  if (typeof window === 'undefined') return;
  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var host = window.location.host;
  var wsUrl = protocol + '//' + host + '/__zeropack_hmr';

  function connect() {
    var ws = new WebSocket(wsUrl);
    ws.onopen = function() {
      console.log('%c[ZeroPack HMR]%c Connected to native WebSocket server', 'color: #00bcd4; font-weight: bold;', '');
    };
    ws.onmessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'reload') {
          console.log('%c[ZeroPack HMR]%c File changed. Live reloading...', 'color: #4caf50; font-weight: bold;', '');
          window.location.reload();
        }
      } catch(e) {
        console.error('[ZeroPack HMR Error]', e);
      }
    };
    ws.onclose = function() {
      console.log('%c[ZeroPack HMR]%c Disconnected. Reconnecting in 1s...', 'color: #ff9800;', '');
      setTimeout(connect, 1000);
    };
  }
  connect();
})();
`;
    bundleSource += hmrClient;
    addEmptyLines(hmrClient.split('\n').length);
  }

  let finalLineMappings = lineMappings;

  // 6. Minify if requested
  if (minify) {
    const minified = minifyCode(bundleSource, { sourcemap, initialLineMappings: lineMappings });
    if (typeof minified === 'object' && minified.code) {
      bundleSource = minified.code;
      finalLineMappings = minified.lineMappings;
    } else {
      bundleSource = minified;
    }
  }

  // 7. Generate source map if requested
  let sourceMap = null;
  if (sourcemap) {
    const mapFileName = path.basename(outFile) + '.map';
    sourceMap = generateSourceMap({
      file: path.basename(outFile),
      sources,
      lineMappings: finalLineMappings
    });
    bundleSource += `\n//# sourceMappingURL=${mapFileName}\n`;
  }

  const minifiedSize = Buffer.byteLength(bundleSource, 'utf8');
  const gzipSize = zlib.gzipSync(Buffer.from(bundleSource, 'utf8')).length;
  const buildTimeMs = Math.max(1, Date.now() - startTime);
  const hash = crypto.createHash('sha256').update(bundleSource).digest('hex');

  const stats = {
    moduleCount: graph.length,
    originalSize,
    minifiedSize,
    gzipSize,
    buildTimeMs,
    compressionRatio: originalSize > 0 ? (((originalSize - minifiedSize) / originalSize) * 100).toFixed(1) + '%' : '0%',
    gzipRatio: minifiedSize > 0 ? (((minifiedSize - gzipSize) / minifiedSize) * 100).toFixed(1) + '%' : '0%',
    modules: moduleStats,
    graph: {
      nodes: moduleStats.map(m => ({
        id: m.id,
        label: path.basename(m.filePath),
        path: m.filePath,
        size: m.size,
        gzipSize: m.gzipSize
      })),
      links: sortedGraph.flatMap(m =>
        Object.entries(m.mapping || {}).map(([spec, targetId]) => ({
          source: m.id,
          target: targetId,
          specifier: spec
        }))
      )
    },
    lastBuildTimestamp: new Date().toLocaleTimeString()
  };

  return {
    code: bundleSource,
    sourceMap,
    size: minifiedSize,
    hash,
    modulesCount: graph.length,
    stats
  };
}

/**
 * Bundles the graph and writes it directly to disk.
 */
export function bundleToFile(graph, outPath, options = {}) {
  const resolvedOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
  const outDir = path.dirname(resolvedOut);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const result = generateBundle(graph, { ...options, outFile: resolvedOut });
  fs.writeFileSync(resolvedOut, result.code, 'utf8');

  let mapPath = null;
  if (options.sourcemap && result.sourceMap) {
    mapPath = `${resolvedOut}.map`;
    fs.writeFileSync(mapPath, JSON.stringify(result.sourceMap, null, 2), 'utf8');
  }

  return {
    ...result,
    outputPath: resolvedOut,
    mapPath
  };
}
