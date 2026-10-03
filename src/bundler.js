import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { logger, colors } from './cli.js';

/**
 * Pure zero-dependency minifier using string scanner and state machine.
 * Correctly preserves strings ('...', "...", `...`), template literals, and regexes
 * while stripping single-line comments, multi-line comments, and extraneous whitespace.
 */
export function minifyCode(code) {
  let output = '';
  let i = 0;
  const len = code.length;

  // Stack of contexts: 'CODE', 'TEMPLATE', 'EXPR'
  const stack = ['CODE'];
  const braceStack = [];

  let lastSignificantToken = '';
  let hadNewline = false;

  function currentContext() {
    return stack[stack.length - 1];
  }

  function isWordChar(ch) {
    return /[a-zA-Z0-9_$]/.test(ch);
  }

  function canPrecedeRegex(tok) {
    if (!tok) return true;
    if (/[(=:[!&|?{};,^~<>+\-*/%]/.test(tok.slice(-1))) return true;
    const keywords = [
      'return', 'case', 'typeof', 'yield', 'await', 'delete',
      'void', 'throw', 'default', 'do', 'else', 'instanceof', 'in', 'new'
    ];
    return keywords.includes(tok);
  }

  function appendToken(token, isWord = false) {
    const lastChar = output.slice(-1);
    const firstChar = token[0];

    // Preserve newlines where ASI (automatic semicolon insertion) is needed
    if (hadNewline) {
      const prevCanEnd = isWordChar(lastChar) || /[)\]}"'`]/.test(lastChar) || output.endsWith('++') || output.endsWith('--');
      const nextCanStart = isWordChar(firstChar) || /[(/[{]/.test(firstChar);
      if (prevCanEnd && nextCanStart) {
        output += '\n';
      }
    }

    const updatedLastChar = output.slice(-1);
    if (isWordChar(updatedLastChar) && isWordChar(firstChar)) {
      output += ' ';
    } else if (updatedLastChar === '+' && firstChar === '+') {
      output += ' ';
    } else if (updatedLastChar === '-' && firstChar === '-') {
      output += ' ';
    } else if (updatedLastChar === '/' && firstChar === '/') {
      output += ' ';
    }

    output += token;
    hadNewline = false;
    lastSignificantToken = token;
  }

  while (i < len) {
    const char = code[i];
    const nextChar = i + 1 < len ? code[i + 1] : '';
    const ctx = currentContext();

    if (ctx === 'TEMPLATE') {
      if (char === '\\') {
        output += char + nextChar;
        i += 2;
        continue;
      }
      if (char === '`') {
        stack.pop();
        output += char;
        lastSignificantToken = '`';
        i++;
        continue;
      }
      if (char === '$' && nextChar === '{') {
        stack.push('EXPR');
        braceStack.push(1);
        output += '${';
        i += 2;
        lastSignificantToken = '{';
        continue;
      }
      output += char;
      i++;
      continue;
    }

    // Inside CODE or EXPR:
    // 1. Single line comment
    if (char === '/' && nextChar === '/') {
      i += 2;
      while (i < len && code[i] !== '\n' && code[i] !== '\r') {
        i++;
      }
      hadNewline = true;
      continue;
    }

    // 2. Multi line comment
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') hadNewline = true;
        i++;
      }
      i += 2;
      continue;
    }

    // 3. Template literal start
    if (char === '`') {
      appendToken('`');
      stack.push('TEMPLATE');
      i++;
      continue;
    }

    // 4. Single / Double quoted strings
    if (char === "'" || char === '"') {
      const quote = char;
      let str = quote;
      i++;
      while (i < len) {
        const c = code[i];
        str += c;
        if (c === '\\') {
          i++;
          if (i < len) str += code[i];
        } else if (c === quote) {
          i++;
          break;
        }
        i++;
      }
      appendToken(str);
      continue;
    }

    // 5. Regex literal vs division
    if (char === '/') {
      if (canPrecedeRegex(lastSignificantToken)) {
        let regexStr = '/';
        i++;
        let inCharClass = false;
        while (i < len) {
          const c = code[i];
          regexStr += c;
          if (c === '\\') {
            i++;
            if (i < len) regexStr += code[i];
          } else if (c === '[' && !inCharClass) {
            inCharClass = true;
          } else if (c === ']' && inCharClass) {
            inCharClass = false;
          } else if (c === '/' && !inCharClass) {
            i++;
            while (i < len && /[a-z]/i.test(code[i])) {
              regexStr += code[i];
              i++;
            }
            break;
          }
          i++;
        }
        appendToken(regexStr);
        continue;
      }
    }

    // 6. Curly braces in EXPR
    if (ctx === 'EXPR') {
      if (char === '{') {
        braceStack[braceStack.length - 1]++;
      } else if (char === '}') {
        braceStack[braceStack.length - 1]--;
        if (braceStack[braceStack.length - 1] === 0) {
          braceStack.pop();
          stack.pop();
          output += '}';
          lastSignificantToken = '}';
          i++;
          continue;
        }
      }
    }

    // 7. Whitespace handling
    if (/\s/.test(char)) {
      if (char === '\n' || char === '\r') {
        hadNewline = true;
      }
      i++;
      continue;
    }

    // 8. Word tokens (identifiers, numbers, keywords)
    if (isWordChar(char)) {
      let word = '';
      while (i < len && isWordChar(code[i])) {
        word += code[i];
        i++;
      }
      appendToken(word, true);
      continue;
    }

    // 9. Multi-char operators (++ , --)
    if ((char === '+' && nextChar === '+') || (char === '-' && nextChar === '-')) {
      appendToken(char + nextChar);
      i += 2;
      continue;
    }

    // 10. Single punctuation/operator
    appendToken(char);
    i++;
  }

  return output.trim();
}

/**
 * Bundles the dependency graph into a deterministic, single-file IIFE bundle
 * and collects rich build metrics for the ZeroPack dashboard.
 */
export function generateBundle(graph, options = {}) {
  const startTime = Date.now();
  const { minify = false, hmr = false } = options;

  // 1. Calculate original size and module metrics
  let originalSize = 0;
  const moduleStats = [];

  for (const mod of graph) {
    const modBytes = Buffer.byteLength(mod.code || '', 'utf8');
    originalSize += modBytes;
    moduleStats.push({
      id: mod.id,
      filePath: mod.relativePath || mod.filePath,
      size: modBytes
    });
  }

  // Sort modules by size descending for dashboard charts
  moduleStats.sort((a, b) => b.size - a.size);

  // 2. Sort modules deterministically by relative path for byte-identical reproducible builds
  const sortedGraph = [...graph].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // 3. Build modules mapping string
  let modulesString = '{\n';
  for (const mod of sortedGraph) {
    const mappingJson = JSON.stringify(mod.mapping);
    modulesString += `  ${mod.id}: [\n`;
    modulesString += `    function(require, module, exports) {\n`;
    modulesString += `// [ZeroPack Module: ${mod.relativePath}]\n`;
    modulesString += mod.code + '\n';
    modulesString += `    },\n`;
    modulesString += `    ${mappingJson}\n`;
    modulesString += `  ],\n`;
  }
  modulesString += '}';

  // 4. Runtime bundle template (Zero-dependency custom require runtime)
  let bundleSource = `/**
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
})(${modulesString});
`;

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
  }

  // 6. Minify if requested
  if (minify) {
    bundleSource = minifyCode(bundleSource);
  }

  const minifiedSize = Buffer.byteLength(bundleSource, 'utf8');
  const buildTimeMs = Math.max(1, Date.now() - startTime);
  const hash = crypto.createHash('sha256').update(bundleSource).digest('hex');

  const stats = {
    moduleCount: graph.length,
    originalSize,
    minifiedSize,
    buildTimeMs,
    compressionRatio: originalSize > 0 ? (((originalSize - minifiedSize) / originalSize) * 100).toFixed(1) + '%' : '0%',
    modules: moduleStats,
    lastBuildTimestamp: new Date().toLocaleTimeString()
  };

  return {
    code: bundleSource,
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

  const result = generateBundle(graph, options);
  fs.writeFileSync(resolvedOut, result.code, 'utf8');

  return {
    ...result,
    outputPath: resolvedOut
  };
}
