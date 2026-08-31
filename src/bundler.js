/**
 * @module bundler
 * @description IIFE bundle generator and state-machine JS minifier.
 *
 * Responsibilities:
 *  1. `minifyCode` — streaming character-level minifier that strips comments
 *     and collapses whitespace while preserving string/regex/template literals
 *     and honouring ASI (Automatic Semicolon Insertion) semantics.
 *  2. `generateBundle` — wraps the sorted module graph in a self-executing
 *     IIFE with an embedded `require()` runtime; optionally injects the HMR
 *     client stub and/or minifies the result.
 *  3. `bundleToFile` — thin wrapper that calls `generateBundle` and writes the
 *     result to disk, creating parent directories as needed.
 *
 * Replaces (npm ecosystem):
 *  - `terser` / `uglify-js`  → `node:string_decoder` + native lexer
 *  - `esbuild` bundle output  → hand-written IIFE runtime
 *
 * @requires node:fs
 * @requires node:path
 * @requires node:crypto
 * @requires node:string_decoder
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { logger, colors } from './cli.js';

import { minifyCode } from './bundler-minify.js';

/**
 * Builds a deterministic IIFE bundle from a resolved module graph.
 *
 * Output format:
 * ```js
 * (function(modules) { ... })({
 *   0: [function(require, module, exports) { ... }, { './dep': 1 }],
 *   ...
 * });
 * ```
 *
 * Determinism guarantee: modules are sorted lexicographically by
 * `relativePath` before being serialised, ensuring byte-identical output
 * across separate build runs on the same source tree.
 *
 * @param {object[]} graph     Ordered module nodes from `graph.js` or `parser.js`.
 * @param {object}   [options]
 * @param {boolean}  [options.minify=false] Strip comments and whitespace.
 * @param {boolean}  [options.hmr=false]    Append the HMR WebSocket client stub.
 * @returns {{
 *   code:        string,
 *   size:        number,
 *   hash:        string,
 *   modulesCount: number,
 *   stats:       object
 * }}
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
 * Convenience wrapper: runs `generateBundle` then writes the result to disk.
 *
 * Creates parent directories with `fs.mkdirSync({ recursive: true })` if they
 * do not exist (replaces the need for `mkdirp` / `make-dir`).
 *
 * @param {object[]} graph    Module graph from `graph.js` or `parser.js`.
 * @param {string}   outPath  Output file path (absolute or relative to cwd).
 * @param {object}   [options] Passed through to `generateBundle`.
 * @returns {object} `generateBundle` result plus `outputPath`.
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
