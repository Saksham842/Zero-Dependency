# Changelog

All notable changes to **ZeroPack** are documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-10-04

### 🚀 Highlights
- **Strictly 0 External Dependencies**: Zero runtime and zero dev dependencies (`dependencies: {}`, `devDependencies: {}`).
- **Single-File Executable**: Standalone binary `zeropack.js` (~124 KB) distributed with bit-for-bit deterministic reproducibility.
- **Ultra-Fast Minifier**: Re-engineered state-machine minifier delivering **>50 MB/s** throughput with precomputed lookup tables and zero-allocation slicing.
- **RFC 6455 WebSocket Engine**: Built from scratch using Node.js `node:crypto` and `node:net`/`node:http` for sub-millisecond HMR and live reload.
- **Interactive Developer Dashboard**: Embedded at `/__zeropack` featuring live SVG module graph visualization, gzip treemaps, build history, real-time log streaming, and browser error overlays.

### ✨ Features
- **Zero-Config CLI**:
  - `zeropack init`: Scaffolds a zero-dependency starter project with HTML, ESM JS, configuration, and manifest.
  - `zeropack build [entry]`: Compiles project to a standalone bundle with optional `--minify`, `--sourcemap`, and `--define.<KEY>=<VAL>`.
  - `zeropack serve [entry]`: Launches local HTTP static dev server with SPA fallback routing, live HMR, and port discovery (`--auto-port`, `--port`, `--host`).
  - Automatic entry detection checking `package.json` (`module`, `main`), `src/index.js`, and `index.js`.
- **ESM-to-CJS Transformer**:
  - Supports default, named, and namespace imports (`import * as ns from '...'`).
  - Supports side-effect imports (`import '...'`) and CSS asset imports with browser DOM `<style>` injection.
  - Supports JSON modules with ECMAScript `with { type: "json" }` attributes.
  - Supports Promisified dynamic imports (`import('./chunk.js')`).
  - Supports circular imports via hoisted function declarations and live getter bindings.
- **Source Maps v3**:
  - Full Base64-VLQ encoder and decoder written natively in pure JavaScript.
  - Generates valid v3 source maps for both unminified and minified bundles.
- **Node Modules Resolution**:
  - Full Node.js bare specifier resolution algorithm without third-party packages.
  - Traverses directory ancestors to `node_modules`.
  - Respects `package.json` conditional `exports` (`import`, `module`, `default`), `module`, `main`, and directory `index` fallbacks.
- **Native TypeScript Support**:
  - Gated native type stripping via `node:module.stripTypeScriptTypes` on Node.js >= 22.6.0.
  - Descriptive `BuildError` diagnostics and graceful test skipping on older Node runtimes.
- **Security & Hygiene**:
  - RFC 6455 WebSocket Origin validation blocking cross-site WebSocket hijacking (CSWSH).
  - Directory traversal prevention blocking dot-dot (`..`) attacks on static HTTP server.
  - Security warning logged when binding dev server to public/network interfaces (`--host 0.0.0.0`).
- **Incremental Rebuild Engine**:
  - High-speed in-memory module cache tracking file modification times (`mtimeMs`) and sizes.
  - Delivers **3.1x+ faster** incremental rebuilds on 500-module projects by skipping unchanged modules.

### 🧪 Validation
- 41 unit and integration tests passing natively under `node --test`.
- 7 real-world pure ESM package fixtures validated under `node:vm` (`scripts/realworld.js`).
- Minifier differential validation across all repository JS files and complex AST edge cases.
- 100% deterministic reproducible builds verified via SHA-256 checksums.
