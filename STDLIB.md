# ZeroPack — Native Node.js Standard Library Architecture

ZeroPack is an industrial-grade JavaScript bundler, minifier, and HMR dev server engineered with **STRICTLY 0 external runtime or dev dependencies**. Every subsystem is built directly on Node.js core libraries (`node:*`).

---

## 📊 Standard Library Replacement Matrix

| Ecosystem NPM Package | Node.js Standard Library Replacement | Implementation Details |
| :--- | :--- | :--- |
| **`commander`** / **`yargs`** | `node:util` (`parseArgs`) | Native CLI flag parser configured for boolean, string, default values, and sub-commands with clean terminal help menus. |
| **`chalk`** / **`picocolors`** | Raw **ANSI Escape Codes** (`\x1b[...m`) | Zero-overhead color and style formatter object for terminal logging, banners, and audit reporting. |
| **`dotenv`** | `node:fs` + Native Regex Parser | Stream/line-based `.env` parser handling quotes, comments, whitespace, and exporting directly into `process.env`. |
| **`esbuild`** / **`webpack`** | Custom DAG Scanner & IIFE Hoister | Directed dependency graph scanner (`node:fs`, `node:path`) resolving aliases, bare npm packages, circular imports, and generating scoped IIFE bundles. |
| **`terser`** / **`uglify-js`** | `node:string_decoder` + Native Lexer | High-performance tokenizer using `Uint8Array` lookup tables and SIMD `indexOf` comment skipping, collapsing whitespace while strictly preserving strings, regex literals, template literals, and ASI boundaries (>50 MB/s throughput). |
| **`source-map`** / **`magic-string`** | Custom **Base64-VLQ** Encoder | Native SourceMap v3 generator using custom Variable-Length Quantity (VLQ) 6-bit Base64 arithmetic, supporting inline data URIs and external `.map` files. |
| **`ts-loader`** / **`@babel/preset-typescript`** | `node:module` (`stripTypeScriptTypes`) | Experimental native type stripping on Node.js >= 22.6; graceful validation and descriptive errors on older Node runtimes or JSX (.tsx). |
| **`chokidar`** | `node:fs` (`fs.watch`) | Native directory watcher with 100ms debounced incremental rebundling and automatic WebSocket broadcast triggers. |
| **`ws`** / **`socket.io`** | `node:http` + `node:crypto` + `node:net` | Full RFC 6455 WebSocket server implementation handling HTTP 101 Switching Protocols upgrade handshakes (SHA-1 + Sec-WebSocket-Key magic string), frame encoding (opcodes, FIN bits, unmasked server-to-client frames), and client mask decoding. |
| **`open`** / **`opener`** | `node:child_process` (`exec`) | Cross-platform browser launcher invoking platform-native openers (`start` on Windows, `open` on macOS, `xdg-open` on Linux). |
| **`detect-port`** / **`get-port`** | `node:net` (`net.createServer`) | Sequential port conflict scanner automatically finding next available port when `--auto-port` is set. |
| **`gzip-size`** / **`brotli-size`** | `node:zlib` (`zlib.gzipSync`) | In-memory synchronous and cached Gzip payload analysis for bundle statistics and interactive treemaps. |
| **`mime`** / **`mime-types`** | Custom Native MIME Mapping Dictionary | Direct lookup table resolving 15+ web MIME types (`.html`, `.js`, `.css`, `.json`, `.png`, `.svg`, `.wasm`, `.woff2`, etc.) with UTF-8 charset tagging. |
| **`webpack-bundle-analyzer`** | Native SVG Visualizer | Built-in Dev Dashboard at `/__zeropack` rendering interactive SVG circular dependency graphs, module size breakdowns, and Gzip treemaps without third-party chart libraries. |
| **`crypto-js`** | `node:crypto` | Cryptographic module hashing using `crypto.createHash('sha256')` for modules and reproducible build verification, plus `sha1` for RFC 6455 handshakes. |

---

## 🚀 Core Architectural Highlights

1. **Deterministic Bundle Generation**: Module graph nodes are sorted lexicographically by normalized relative paths prior to bundle compilation, guaranteeing bit-for-bit identical outputs across environments.
2. **RFC 6455 WebSocket Implementation**:
   - WebSocket handshakes calculate `Sec-WebSocket-Accept` via `crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')`.
   - Frame encoder formats binary buffers with proper 7-bit, 16-bit, or 64-bit payload length headers.
3. **In-Memory Incremental Module Cache**:
   - Compares file `mtimeMs` and byte size to skip re-reading, re-parsing, and re-gzipping unchanged files, speeding up rebuilds by >3x.
4. **Standalone Single-File Distribution**:
   - `zeropack.js` bundles all compiler and server subsystems into an executable binary runnable anywhere Node.js >= 18 is installed without `npm install`.

---

## 🛠️ Verification & Usage

```bash
# Build standalone compiler & documentation
npm run build-standalone

# Verify reproducible bit-for-bit builds
npm run verify

# Start development server with Live Reload HMR
npm run dev

# Production build with minification
npm run build
```
