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
  const decoder = new StringDecoder('utf8');
  const buffer = Buffer.from(code);
  const text = decoder.write(buffer) + decoder.end();

  let output = '';
  let i = 0;
  const len = text.length;

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateLiteral = false;
  let inRegex = false;
  let isEscaped = false;

  while (i < len) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    // Handle escapes inside strings/regexes
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

    // Single-quote string literal
    if (char === "'" && !inDoubleQuote && !inTemplateLiteral && !inRegex) {
      inSingleQuote = !inSingleQuote;
      output += char;
      i++;
      continue;
    }

    // Double-quote string literal
    if (char === '"' && !inSingleQuote && !inTemplateLiteral && !inRegex) {
      inDoubleQuote = !inDoubleQuote;
      output += char;
      i++;
      continue;
    }

    // Template literal (backtick)
    if (char === '`' && !inSingleQuote && !inDoubleQuote && !inRegex) {
      inTemplateLiteral = !inTemplateLiteral;
      output += char;
      i++;
      continue;
    }

    // If inside any string literal, keep characters exactly as-is
    if (inSingleQuote || inDoubleQuote || inTemplateLiteral) {
      output += char;
      i++;
      continue;
    }

    // Check for single-line comments //
    if (char === '/' && nextChar === '/' && !inRegex) {
      i += 2;
      while (i < len && text[i] !== '\n' && text[i] !== '\r') {
        i++;
      }
      continue;
    }

    // Check for multi-line comments /* ... */
    if (char === '/' && nextChar === '*' && !inRegex) {
      i += 2;
      while (i < len && !(text[i] === '*' && text[i + 1] === '/')) {
        i++;
      }
      i += 2; // skip */
      continue;
    }

    // Check for Regex literal start (heuristic: preceded by punctuation or keyword)
    if (char === '/' && !inRegex) {
      const prevNonSpace = output.trim().slice(-1);
      const isRegexStart = /[(,=:[!&|?{};]/.test(prevNonSpace) || output.trim().endsWith('return');
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

    // Handle whitespace outside strings
    if (/\s/.test(char)) {
      let wsRun = '';
      while (i < len && /\s/.test(text[i])) {
        wsRun += text[i];
        i++;
      }
      
      const hasNewline = wsRun.includes('\n') || wsRun.includes('\r');
      const match = output.match(/(?:^|[^a-zA-Z0-9_$])([a-zA-Z0-9_$]+)$/);
      const lastWord = match ? match[1] : '';
      
      if (hasNewline && (lastWord === 'return' || lastWord === 'throw' || lastWord === 'break' || lastWord === 'continue')) {
        output += ';';
      } else {
        // Collapse multiple whitespace/newlines into a single space or omit if adjacent to operators
        const lastChar = output.slice(-1);
        if (lastChar && !/[()\[\]{},;:+\-*\/=<>!&|%?]/.test(lastChar)) {
          if (!output.endsWith(' ')) {
            output += ' ';
          }
        }
      }
      continue;
    }

    // If adding an operator, strip trailing space if safe
    if (/[()\[\]{},;:+\-*\/=<>!&|%?]/.test(char)) {
      if (output.endsWith(' ')) {
        const charBeforeSpace = output.slice(-2, -1);
        // Avoid merging ++ or -- or keyword ambiguities
        if (!(/[+\-]/.test(char) && /[+\-]/.test(charBeforeSpace))) {
          output = output.slice(0, -1);
        }
      }
    }

    output += char;
    i++;
  }

  // Final cleanup of extra empty lines or spaces
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
