# Contributing to ZeroPack

Thank you for your interest in contributing to **ZeroPack**!

ZeroPack is a high-performance JavaScript bundler, minifier, and RFC 6455 WebSocket HMR dev server built exclusively with **native Node.js core libraries**.

---

## 🛡️ The Golden Rule: 100% Zero Dependencies

**Strict Zero-Dependency Policy:**
- `package.json` `"dependencies"` MUST strictly remain `{}`.
- `package.json` `"devDependencies"` MUST strictly remain `{}`.
- Under NO circumstances may any npm package (`npm install <pkg>`) be added to this repository.
- All functionality (bundling, parsing, minification, WebSockets, CLI, HTTP, encryption, compression, source maps) must be implemented using pure JavaScript and Node.js built-in standard modules (`node:fs`, `node:path`, `node:crypto`, `node:http`, `node:net`, `node:util`, `node:zlib`, `node:child_process`, `node:string_decoder`, `node:module`).

---

## 🛠️ Development Setup & Scripts

ZeroPack requires **Node.js >= 18.0.0** (Node >= 22 recommended for native TypeScript stripping).

No installation step is needed! Simply clone and begin working:

```bash
git clone https://github.com/Saksham842/Zero-Dependency.git
cd Zero-Dependency
```

### Available npm scripts:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the zero-dependency dev server with RFC 6455 WebSocket HMR |
| `npm run build` | Produces an optimized minified production bundle in `dist/bundle.js` |
| `npm run check` | Runs the full native Node test suite (`node --test`) |
| `npm test` | Alias for `npm run check` |
| `npm run bench` | Runs native performance benchmarks (bundling, minification, memory) |
| `npm run build-standalone` | Compiles `src/` modules into the single-file distribution `zeropack.js` |
| `npm run verify` | Verifies bit-for-bit deterministic reproducible builds and updates `STDLIB.md` |

---

## 🧪 Testing Guidelines

ZeroPack uses Node's native test runner (`node:test` and `node:assert/strict`).

- Always run `npm run check` before submitting a change.
- New features or bug fixes must include unit tests in the `test/` directory.
- Tests should clean up any temporary directories (`fs.mkdtempSync`) and close any spawned test servers.

---

## 📦 Keeping `zeropack.js` in Sync

When making changes to files inside `src/`:
1. Run `npm run build-standalone` to recompile `zeropack.js`.
2. Run `npm run verify` to confirm deterministic reproducibility.
3. Commit both the `src/` changes and the updated `zeropack.js`.

CI will fail if `zeropack.js` is stale compared to `src/`.

---

## 🔒 Security Best Practices

- Always validate the `Origin` header on incoming WebSocket upgrade requests to prevent CSWSH attacks.
- Enforce strict directory traversal guards on HTTP file paths (`path.resolve(rootDir, '.' + pathname)`).
- Never commit private secrets or real API keys in `.env` files (use `.env.example`).
