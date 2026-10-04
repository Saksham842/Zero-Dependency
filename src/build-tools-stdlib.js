/**
 * @module build-tools-stdlib
 * @description ZeroPack standard library documentation generator.
 */
import fs from 'node:fs';
import { colors, logger } from './cli.js';

/**
 * Returns the canonical STDLIB.md document source as a string.
 */
export function createStdlibDocSource() {
  return [
    '# ZeroPack — Native Node.js Standard Library Architecture',
    '',
    'ZeroPack is a full-featured JavaScript bundler, minifier, and Live Reload dev server engineered with **STRICTLY 0 third-party runtime dependencies**. Every capability is built directly on Node.js core libraries.',
    '',
    '---',
    '',
    '## 📊 Standard Library Replacement Matrix',
    '',
    '| Ecosystem NPM Package | Node.js Standard Library Replacement | Implementation Details |',
    '| :--- | :--- | :--- |',
    '| **`commander`** / **`yargs`** | `node:util` (`parseArgs`) | Native CLI flag parser configured for boolean, string, default values, and sub-arguments with clean terminal help menu. |',
    '| **`chalk`** / **`picocolors`** | Raw **ANSI Escape Codes** (`\\x1b[...m`) | Zero-overhead color and style formatter object for terminal logging, banners, and audit reporting. |',
    '| **`dotenv`** | `node:fs` + Native Regex Parser | Stream/line-based `.env` parser handling quotes, comments, whitespace, and exporting directly into `process.env`. |',
    '| **`esbuild`** / **`webpack`** | Custom AST Regex Scanner & IIFE Hoister | Dependency graph scanner (`node:fs`, `node:path`) constructing directed module graphs, resolving aliases, detecting circular dependencies, and generating scoped IIFE bundles. |',
    '| **`terser`** / **`uglify-js`** | `node:string_decoder` + Native Lexer | High-performance tokenizer stripping single-line (`//`) & multi-line (`/* */`) comments, collapsing whitespace while strictly preserving strings, regex literals, and backticks. |',
    '| **`chokidar`** | `node:fs` (`fs.watch`) | Native directory watcher with 100ms debounced rebundling and automatic WebSocket broadcast triggers. |',
    '| **`ws`** / **`socket.io`** | `node:http` + `node:crypto` + `node:net` | Full RFC 6455 WebSocket server implementation handling HTTP 101 Switching Protocols upgrade handshakes (SHA-1 + Sec-WebSocket-Key magic string), frame encoding (opcodes, FIN bits, unmasked server-to-client frames), and client mask decoding. |',
    '| **`mime`** / **`mime-types`** | Custom Native MIME Mapping Dictionary | Direct lookup table resolving 15+ web MIME types (`.html`, `.js`, `.css`, `.json`, `.png`, `.svg`, `.wasm`, `.woff2`, etc.). |',
    '| **`crypto-js`** | `node:crypto` | Cryptographic module hashing using `crypto.createHash(\'sha256\')` for modules and reproducible build verification, plus `sha1` for RFC 6455 handshakes. |',
    '| **`jest`** / **`mocha`** / **`vitest`** | `node:test` + `node:assert/strict` | Native test runner (Node.js >= 18) with full async test support, structured diagnostics, and no third-party test framework required. |',
    '| **`postcss`** / **`css-loader`** | `node:fs` + Native CSS String Parser | CSS files imported via `import \'./style.css\'` are read with `node:fs`, minified with a native comment-stripping/whitespace-collapsing parser, and injected at runtime via `document.createElement(\'style\')`. |',
    '| **`vm2`** / **`isolated-vm`** | `node:vm` | Sandboxed JavaScript execution via `vm.runInNewContext()`. Used in the test suite to execute bundled output in a clean scope, validating correctness without any third-party sandbox library. |',
    '',
    '---',
    '',
    '## 🚀 Core Architectural Highlights',
    '',
    '1. **Deterministic Bundle Generation**: Module graph nodes are sorted lexicographically by normalized relative paths prior to bundle compilation, guaranteeing bit-for-bit identical outputs across environments.',
    '2. **RFC 6455 WebSocket Implementation**:',
    '   - WebSocket handshakes calculate `Sec-WebSocket-Accept` via `crypto.createHash(\'sha1\').update(key + \'258EAFA5-E914-47DA-95CA-C5AB0DC85B11\').digest(\'base64\')`.',
    '   - Frame encoder formats binary buffers with proper 7-bit, 16-bit, or 64-bit payload length headers.',
    '3. **Standalone Single-File Distribution**:',
    '   - `zeropack.js` bundles all compiler and server subsystems into an executable binary runnable anywhere Node.js >= 18 is installed without `npm install`.',
    '',
    '---',
    '',
    '## 🛠️ Verification & Usage',
    '',
    '```bash',
    '# Build standalone compiler & documentation',
    'npm run build-standalone',
    '',
    '# Verify reproducible bit-for-bit builds',
    'npm run verify',
    '',
    '# Start development server with Live Reload',
    'npm run dev',
    '',
    '# Production build with minification',
    'npm run build',
    '```'
  ].join('\n');
}

export function generateStdlibDoc(STDLIB_DOC_PATH) {
  logger.build(`Generating ${colors.cyan('STDLIB.md')} standard library replacement matrix...`);

  const doc = createStdlibDocSource();

  fs.writeFileSync(STDLIB_DOC_PATH, doc, 'utf8');
  logger.success(`Documentation generated: ${colors.bold('STDLIB.md')}`);
}
