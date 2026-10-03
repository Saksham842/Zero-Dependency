import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { colors, logger } from './cli.js';
import { buildDependencyGraph } from './parser.js';
import { generateBundle } from './bundler.js';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_STANDALONE = path.join(ROOT_DIR, 'zeropack.js');
const STDLIB_DOC_PATH = path.join(ROOT_DIR, 'STDLIB.md');

/**
 * 1. Single-File Concatenator
 * Merges src/cli.js, src/parser.js, src/bundler.js, and src/server.js
 * into a single standalone executable file with zero external module dependencies.
 */
export function compileSingleFile() {
  logger.build(`Compiling standalone single-file distribution to ${colors.cyan('zeropack.js')}...`);

  const modules = ['cli.js', 'errors.js', 'sourcemap.js', 'parser.js', 'bundler.js', 'dashboard.js', 'server.js'];
  const processedContents = [];

  // Track Node built-in imports to hoist them at the top
  const builtinImports = new Set([
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "import process from 'node:process';",
    "import http from 'node:http';",
    "import crypto from 'node:crypto';",
    "import net from 'node:net';",
    "import { exec } from 'node:child_process';",
    "import * as nodeModule from 'node:module';",
    "import { parseArgs } from 'node:util';",
    "import { StringDecoder } from 'node:string_decoder';"
  ]);

  for (const modName of modules) {
    const modPath = path.join(SRC_DIR, modName);
    let code = fs.readFileSync(modPath, 'utf8');

    // Strip shebang if present
    if (code.startsWith('#!')) {
      code = code.replace(/^#!.*?\r?\n/, '');
    }

    // Remove local imports between our src modules
    code = code.replace(/import\s+[\s\S]*?\s+from\s+['"]\.\/[^'"]+['"];?/g, '');
    
    // Remove Node built-in imports (they will be hoisted at top)
    code = code.replace(/import\s+[\s\S]*?\s+from\s+['"]node:[^'"]+['"];?/g, '');

    // Convert internal dynamic imports to direct references
    code = code.replace(/const\s+\{\s*buildDependencyGraph\s*\}\s*=\s*await\s+import\('\.\/parser\.js'\);?/g, '');
    code = code.replace(/const\s+\{\s*bundleToFile\s*\}\s*=\s*await\s+import\('\.\/bundler\.js'\);?/g, '');
    code = code.replace(/const\s+\{\s*startDevServer\s*\}\s*=\s*await\s+import\('\.\/server\.js'\);?/g, '');

    // Clean up standalone auto-run in cli.js
    if (modName === 'cli.js') {
      const isMainIdx = code.indexOf('// Auto-run if executed directly');
      if (isMainIdx !== -1) {
        code = code.slice(0, isMainIdx);
      }
    }

    processedContents.push(`\n// ==========================================\n// Module: ${modName}\n// ==========================================\n${code.trim()}`);
  }

  const standaloneHeader = `#!/usr/bin/env node
/**
 * ZeroPack Standalone Executable
 * Zero-Dependency JavaScript Bundler, Minifier & RFC 6455 HMR Dev Server
 * Built exclusively with Node.js Native Core Libraries.
 * 
 * Auto-generated on: ${new Date().toISOString()}
 */

${Array.from(builtinImports).join('\n')}
`;

  const standaloneFooter = `
// -----------------------------------------------------------------------------
// Auto-Run CLI when invoked directly
// -----------------------------------------------------------------------------
runCli().catch((err) => {
  logger.error('Fatal CLI Error: ' + err.message);
  process.exit(1);
});
`;

  const finalSource = standaloneHeader + processedContents.join('\n') + standaloneFooter;
  fs.writeFileSync(OUTPUT_STANDALONE, finalSource, 'utf8');

  // Attempt to set executable chmod on POSIX systems
  try {
    fs.chmodSync(OUTPUT_STANDALONE, 0o755);
  } catch (e) {
    // Ignore on Windows
  }

  const size = fs.statSync(OUTPUT_STANDALONE).size;
  const hash = crypto.createHash('sha256').update(finalSource).digest('hex');

  logger.success(`Standalone binary created: ${colors.bold('zeropack.js')} (${colors.cyan(size + ' bytes')})`);
  logger.info(`Binary SHA-256: ${colors.gray(hash)}`);

  return { path: OUTPUT_STANDALONE, size, hash };
}

/**
 * 2. Reproducible Build Verification
 * Runs sequential builds on test fixtures and validates byte-for-byte identical output.
 */
export function verifyReproducibleBuild(entryFile) {
  logger.build(`Running Reproducible Build Verification on ${colors.cyan(entryFile)}...`);

  // Build 1
  const graph1 = buildDependencyGraph(entryFile, ROOT_DIR);
  const bundle1 = generateBundle(graph1, { minify: true });
  const hash1 = bundle1.hash;

  // Build 2
  const graph2 = buildDependencyGraph(entryFile, ROOT_DIR);
  const bundle2 = generateBundle(graph2, { minify: true });
  const hash2 = bundle2.hash;

  console.log(`\n${colors.bold('--- VERIFICATION AUDIT REPORT ---')}`);
  console.log(`Build #1 SHA-256: ${colors.cyan(hash1)} (${bundle1.size} bytes)`);
  console.log(`Build #2 SHA-256: ${colors.cyan(hash2)} (${bundle2.size} bytes)`);

  if (hash1 === hash2 && bundle1.code === bundle2.code) {
    logger.success(`${colors.bold('BYTE-FOR-BYTE IDENTICAL!')} Deterministic reproducible build verified 100%.`);
    return true;
  } else {
    logger.error(`${colors.bold('VERIFICATION FAILED!')} Non-deterministic output detected.`);
    return false;
  }
}

/**
 * 3. Master STDLIB.md Documentation Generator
 */
export function generateStdlibDoc() {
  logger.build(`Generating ${colors.cyan('STDLIB.md')} standard library replacement matrix...`);

  const doc = `# ZeroPack — Native Node.js Standard Library Architecture

ZeroPack is a full-featured JavaScript bundler, minifier, and HMR dev server engineered with **STRICTLY 0 third-party runtime dependencies**. Every capability is built directly on Node.js core libraries.

---

## 📊 Standard Library Replacement Matrix

| Ecosystem NPM Package | Node.js Standard Library Replacement | Implementation Details |
| :--- | :--- | :--- |
| **\`commander\`** / **\`yargs\`** | \`node:util\` (\`parseArgs\`) | Native CLI flag parser configured for boolean, string, default values, and sub-arguments with clean terminal help menu. |
| **\`chalk\`** / **\`picocolors\`** | Raw **ANSI Escape Codes** (\`\\x1b[...m\`) | Zero-overhead color and style formatter object for terminal logging, banners, and audit reporting. |
| **\`dotenv\`** | \`node:fs\` + Native Regex Parser | Stream/line-based \`.env\` parser handling quotes, comments, whitespace, and exporting directly into \`process.env\`. |
| **\`esbuild\`** / **\`webpack\`** | Custom AST Regex Scanner & IIFE Hoister | Dependency graph scanner (\`node:fs\`, \`node:path\`) constructing directed module graphs, resolving aliases, detecting circular dependencies, and generating scoped IIFE bundles. |
| **\`terser\`** / **\`uglify-js\`** | \`node:string_decoder\` + Native Lexer | High-performance tokenizer stripping single-line (\`//\`) & multi-line (\`/* */\`) comments, collapsing whitespace while strictly preserving strings, regex literals, and backticks. |
| **\`chokidar\`** | \`node:fs\` (\`fs.watch\`) | Native directory watcher with 100ms debounced rebundling and automatic WebSocket broadcast triggers. |
| **\`ws\`** / **\`socket.io\`** | \`node:http\` + \`node:crypto\` + \`node:net\` | Full RFC 6455 WebSocket server implementation handling HTTP 101 Switching Protocols upgrade handshakes (SHA-1 + Sec-WebSocket-Key magic string), frame encoding (opcodes, FIN bits, unmasked server-to-client frames), and client mask decoding. |
| **\`mime\`** / **\`mime-types\`** | Custom Native MIME Mapping Dictionary | Direct lookup table resolving 15+ web MIME types (\`.html\`, \`.js\`, \`.css\`, \`.json\`, \`.png\`, \`.svg\`, \`.wasm\`, \`.woff2\`, etc.). |
| **\`crypto-js\`** | \`node:crypto\` | Cryptographic module hashing using \`crypto.createHash('sha256')\` for modules and reproducible build verification, plus \`sha1\` for RFC 6455 handshakes. |

---

## 🚀 Core Architectural Highlights

1. **Deterministic Bundle Generation**: Module graph nodes are sorted lexicographically by normalized relative paths prior to bundle compilation, guaranteeing bit-for-bit identical outputs across environments.
2. **RFC 6455 WebSocket Implementation**:
   - WebSocket handshakes calculate \`Sec-WebSocket-Accept\` via \`crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')\`.
   - Frame encoder formats binary buffers with proper 7-bit, 16-bit, or 64-bit payload length headers.
3. **Standalone Single-File Distribution**:
   - \`zeropack.js\` bundles all compiler and server subsystems into an executable binary runnable anywhere Node.js >= 18 is installed without \`npm install\`.

---

## 🛠️ Verification & Usage

\`\`\`bash
# Build standalone compiler & documentation
npm run build-standalone

# Verify reproducible bit-for-bit builds
npm run verify

# Start development server with Live Reload HMR
npm run dev

# Production build with minification
npm run build
\`\`\`
`;

  fs.writeFileSync(STDLIB_DOC_PATH, doc, 'utf8');
  logger.success(`Documentation generated: ${colors.bold('STDLIB.md')}`);
}

/**
 * Master Pipeline Runner
 */
export async function runBuildTools() {
  console.log(`\n${colors.cyan(colors.bold('=== ZeroPack Build Tools & Submission Packager ==='))}\n`);

  // 1. Compile single-file executable
  compileSingleFile();

  // 2. Generate sample project if not present to verify reproducible builds
  const sampleEntry = path.join(ROOT_DIR, 'src', 'index.js');
  if (!fs.existsSync(sampleEntry)) {
    // Ensure example files exist
    const { createSampleApp } = await import('./sample.js');
    createSampleApp();
  }

  // 3. Verify reproducible build
  const verified = verifyReproducibleBuild('src/index.js');

  // 4. Generate STDLIB.md
  generateStdlibDoc();

  if (verified) {
    logger.success(`${colors.green(colors.bold('All 5 Steps & Verification Audits Passed Successfully!'))}`);
  }
}

// Auto-run if executed directly
const isMain = process.argv[1] && process.argv[1].endsWith('build-tools.js');
if (isMain) {
  runBuildTools().catch((err) => {
    logger.error('Build tools failed: ' + err.message);
    process.exit(1);
  });
}
