#!/usr/bin/env node
/**
 * ZeroPack Standalone Executable
 * Zero-Dependency JavaScript Bundler, Minifier & RFC 6455 HMR Dev Server
 * Built exclusively with Node.js Native Core Libraries.
 * 
 * Auto-generated on: 2026-10-03T22:31:18.527Z
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import http from 'node:http';
import crypto from 'node:crypto';
import net from 'node:net';
import { exec } from 'node:child_process';
import * as nodeModule from 'node:module';
import { parseArgs } from 'node:util';
import { StringDecoder } from 'node:string_decoder';

// ==========================================
// Module: cli.js
// ==========================================
// -----------------------------------------------------------------------------
// 0. Zero-Config Auto-Detector & Scaffolder
// -----------------------------------------------------------------------------

/**
 * Auto-detects the project entry point in standard locations.
 */
export function autoDetectEntry(cwd = process.cwd(), preferredEntry = null) {
  if (preferredEntry) {
    const resolved = path.isAbsolute(preferredEntry) ? preferredEntry : path.resolve(cwd, preferredEntry);
    if (fs.existsSync(resolved)) {
      return path.relative(cwd, resolved) || preferredEntry;
    }
  }

  // 1. Check package.json "module" or "main"
  const pkgPath = path.resolve(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (typeof pkg.module === 'string') {
        const candidate = path.resolve(cwd, pkg.module);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return pkg.module;
        }
      }
      if (typeof pkg.main === 'string') {
        const candidate = path.resolve(cwd, pkg.main);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          if (!pkg.main.includes('cli.js') && !pkg.main.includes('zeropack.js')) {
            return pkg.main;
          }
        }
      }
    } catch (_) {}
  }

  // 2. Candidate entry files in conventional locations
  const candidates = [
    'src/index.js',
    'src/index.ts',
    'src/index.jsx',
    'src/index.tsx',
    'index.js',
    'index.ts',
    'index.jsx',
    'index.tsx',
    'src/main.js',
    'src/main.ts',
    'src/main.jsx',
    'src/main.tsx',
    'main.js',
    'main.ts'
  ];

  for (const cand of candidates) {
    const candPath = path.resolve(cwd, cand);
    if (fs.existsSync(candPath) && fs.statSync(candPath).isFile()) {
      return cand;
    }
  }

  return null;
}

/**
 * Loads zeropack.config.json if present.
 */
export function loadConfig(configPath = null, cwd = process.cwd()) {
  const targetPath = configPath
    ? (path.isAbsolute(configPath) ? configPath : path.resolve(cwd, configPath))
    : path.resolve(cwd, 'zeropack.config.json');

  if (fs.existsSync(targetPath)) {
    try {
      const content = fs.readFileSync(targetPath, 'utf8');
      const parsed = JSON.parse(content);
      return { config: parsed, path: targetPath, exists: true };
    } catch (err) {
      logger.warn(`Failed to parse configuration file at ${targetPath}: ${err.message}`);
      return { config: {}, path: targetPath, exists: true, error: err };
    }
  }

  return { config: {}, path: targetPath, exists: false };
}

/**
 * Scaffolds a minimal ZeroPack starter project.
 */
export function scaffoldProject(targetDir = '.') {
  const resolvedDir = path.isAbsolute(targetDir) ? targetDir : path.resolve(process.cwd(), targetDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const srcDir = path.join(resolvedDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  const files = [
    {
      path: path.join(resolvedDir, 'index.html'),
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroPack App</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 2rem;
      background: #0d1117;
      color: #c9d1d9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
    h1 { color: #58a6ff; margin-bottom: 0.5rem; }
    p { color: #8b949e; line-height: 1.6; }
    code { background: #161b22; padding: 0.2em 0.4em; border-radius: 4px; color: #79c0ff; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="/dist/bundle.js"></script>
</body>
</html>
`
    },
    {
      path: path.join(srcDir, 'index.js'),
      content: `// ZeroPack entry point
const app = document.getElementById('app');
if (app) {
  app.innerHTML = \`
    <h1>⚡ Welcome to ZeroPack</h1>
    <p>Zero-dependency JS bundler &amp; RFC 6455 HMR dev server.</p>
    <p>Edit <code>src/index.js</code> and save to see instant HMR updates.</p>
  \`;
}
console.log('[ZeroPack] App initialized successfully!');
`
    },
    {
      path: path.join(resolvedDir, 'zeropack.config.json'),
      content: JSON.stringify({
        entry: 'src/index.js',
        out: 'dist/bundle.js',
        port: 3000,
        minify: false,
        sourcemap: true,
        define: {
          "process.env.NODE_ENV": "development"
        }
      }, null, 2) + '\n'
    }
  ];

  const pkgJsonPath = path.join(resolvedDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    files.push({
      path: pkgJsonPath,
      content: JSON.stringify({
        name: path.basename(resolvedDir) || 'zeropack-app',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'zeropack',
          build: 'zeropack build'
        }
      }, null, 2) + '\n'
    });
  }

  logger.info(`Scaffolding new ZeroPack project in ${colors.cyan(resolvedDir)}...`);
  let createdCount = 0;
  for (const file of files) {
    if (fs.existsSync(file.path)) {
      logger.warn(`File already exists: ${colors.gray(path.relative(resolvedDir, file.path))} (skipped)`);
    } else {
      fs.writeFileSync(file.path, file.content, 'utf8');
      logger.success(`Created ${colors.green(path.relative(resolvedDir, file.path))}`);
      createdCount++;
    }
  }

  logger.success(`ZeroPack project initialized! (${createdCount} file(s) created)`);
  logger.info(`Run ${colors.cyan('zeropack')} to start dev server with HMR.`);
}

// -----------------------------------------------------------------------------
// 1. Terminal Logger (Zero-dependency ANSI Color Utility)
// -----------------------------------------------------------------------------
export const colors = {
  reset: (text) => `\x1b[0m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[22m`,
  dim: (text) => `\x1b[2m${text}\x1b[22m`,
  italic: (text) => `\x1b[3m${text}\x1b[23m`,
  underline: (text) => `\x1b[4m${text}\x1b[24m`,
  
  // Foreground Colors
  black: (text) => `\x1b[30m${text}\x1b[39m`,
  red: (text) => `\x1b[31m${text}\x1b[39m`,
  green: (text) => `\x1b[32m${text}\x1b[39m`,
  yellow: (text) => `\x1b[33m${text}\x1b[39m`,
  blue: (text) => `\x1b[34m${text}\x1b[39m`,
  magenta: (text) => `\x1b[35m${text}\x1b[39m`,
  cyan: (text) => `\x1b[36m${text}\x1b[39m`,
  white: (text) => `\x1b[37m${text}\x1b[39m`,
  gray: (text) => `\x1b[90m${text}\x1b[39m`,
  
  // Bright colors
  brightRed: (text) => `\x1b[91m${text}\x1b[39m`,
  brightGreen: (text) => `\x1b[92m${text}\x1b[39m`,
  brightYellow: (text) => `\x1b[93m${text}\x1b[39m`,
  brightCyan: (text) => `\x1b[96m${text}\x1b[39m`,
  
  // Background Colors
  bgCyan: (text) => `\x1b[46m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgGreen: (text) => `\x1b[42m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgYellow: (text) => `\x1b[43m\x1b[30m${text}\x1b[39m\x1b[49m`,
  bgRed: (text) => `\x1b[41m\x1b[37m${text}\x1b[39m\x1b[49m`
};

export const logger = {
  info: (msg) => console.log(`${colors.cyan(colors.bold('[INFO]'))} ${msg}`),
  success: (msg) => console.log(`${colors.green(colors.bold('[SUCCESS]'))} ${msg}`),
  warn: (msg) => console.warn(`${colors.yellow(colors.bold('[WARN]'))} ${msg}`),
  error: (msg) => console.error(`${colors.red(colors.bold('[ERROR]'))} ${msg}`),
  build: (msg) => console.log(`${colors.magenta(colors.bold('[BUILD]'))} ${msg}`),
  server: (msg) => console.log(`${colors.blue(colors.bold('[SERVER]'))} ${msg}`),
  hmr: (msg) => console.log(`${colors.brightCyan(colors.bold('[HMR]'))} ${msg}`),
  raw: (msg) => console.log(msg)
};

// -----------------------------------------------------------------------------
// 2. Native Environment Loader (Zero-dependency .env reader)
// -----------------------------------------------------------------------------
export function loadEnv(envPath = '.env', baseDir = process.cwd()) {
  const resolvedPath = path.isAbsolute(envPath) ? envPath : path.resolve(baseDir, envPath);
  
  if (!fs.existsSync(resolvedPath)) {
    return { loaded: false, count: 0, path: resolvedPath };
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split(/\r?\n/);
    let count = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip empty lines and comment lines
      if (!line || line.startsWith('#')) continue;

      // Handle 'export KEY=VALUE' or 'KEY=VALUE'
      const sanitizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
      const eqIdx = sanitizedLine.indexOf('=');
      if (eqIdx === -1) continue;

      const key = sanitizedLine.slice(0, eqIdx).trim();
      let value = sanitizedLine.slice(eqIdx + 1).trim();

      if (!key) continue;

      // Unquote value if wrapped with single or double quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Handle inline comment after space and #
      const commentIdx = value.indexOf(' #');
      if (commentIdx !== -1) {
        value = value.slice(0, commentIdx).trim();
      }

      // Do not overwrite existing process.env variables unless needed
      if (process.env[key] === undefined) {
        process.env[key] = value;
        count++;
      }
    }

    return { loaded: true, count, path: resolvedPath };
  } catch (err) {
    logger.warn(`Failed to parse .env file at ${resolvedPath}: ${err.message}`);
    return { loaded: false, count: 0, error: err };
  }
}

// -----------------------------------------------------------------------------
// 3. Terminal Banner & Help Menu
// -----------------------------------------------------------------------------
export function printBanner() {
  const banner = `
${colors.cyan(colors.bold('========================================================================'))}
${colors.brightCyan(colors.bold('   ______                 ____             __   '))}
${colors.brightCyan(colors.bold('  / ____/___  _________  / __ \\____ ______/ /__ '))}
${colors.cyan(colors.bold(' / /_  / __ \\/ ___/ __ \\/ /_/ / __ `/ ___/ //_/ '))}
${colors.cyan(colors.bold('/ __/ / /_/ / /  / /_/ / ____/ /_/ / /__/ ,<    '))}
${colors.blue(colors.bold('/_/    \\____/_/   \\____/_/    \\__,_/\\___/_/|_|   '))}
${colors.gray('  ⚡ 100% Zero-Dependency JS Bundler & RFC 6455 HMR Dev Server')}
${colors.gray('  🛡️ Built exclusively with Node.js Native Core Libraries')}
${colors.cyan(colors.bold('========================================================================'))}
`;
  console.log(banner);
}

export function printHelp() {
  printBanner();
  console.log(`
${colors.bold('USAGE:')}
  ${colors.green('zeropack')} [subcommand] [options]
  ${colors.green('node src/cli.js')} [subcommand] [options]

${colors.bold('SUBCOMMANDS:')}
  ${colors.yellow('init [dir]')}         Scaffold a minimal ZeroPack starter project
  ${colors.yellow('build [entry]')}      One-shot bundle production build
  ${colors.yellow('serve [entry]')}      Start dev server with Live Reload & RFC 6455 WebSocket HMR

${colors.bold('OPTIONS:')}
  ${colors.yellow('--entry, -e <path>')}     Entry JavaScript/TypeScript file ${colors.dim('(auto-detected by default)')}
  ${colors.yellow('--out, -o <path>')}       Output bundle path ${colors.dim('(default: dist/bundle.js)')}
  ${colors.yellow('--serve')}                Start native HTTP static dev server & RFC 6455 WebSocket HMR
  ${colors.yellow('--port, -p <number>')}    Dev server port ${colors.dim('(default: 3000, auto-finds free port)')}
  ${colors.yellow('--host <string>')}        Dev server host ${colors.dim('(default: localhost)')}
  ${colors.yellow('--open')}                 Open browser when dev server starts ${colors.dim('(default for zeropack with no args)')}
  ${colors.yellow('--no-open')}              Do not open browser
  ${colors.yellow('--minify, -m')}           Minify output bundle (removes comments & whitespace)
  ${colors.yellow('--sourcemap, -s')}        Generate v3 source maps (.map file)
  ${colors.yellow('--config, -c <path>')}    Path to configuration file ${colors.dim('(default: zeropack.config.json)')}
  ${colors.yellow('--define <key=val>')}     Compile-time define replacement ${colors.dim('(e.g. process.env.NODE_ENV=production)')}
  ${colors.yellow('--env <path>')}           Custom path to .env file ${colors.dim('(default: .env)')}
  ${colors.yellow('--version, -v')}          Display ZeroPack version
  ${colors.yellow('--help, -h')}             Display this help message

${colors.bold('EXAMPLES:')}
  ${colors.dim('# Zero-config: auto-detect entry, start dev server, open browser')}
  ${colors.cyan('zeropack')}

  ${colors.dim('# Scaffold a new minimal starter project')}
  ${colors.cyan('zeropack init')}

  ${colors.dim('# One-shot minified production build with sourcemaps')}
  ${colors.cyan('zeropack build --minify --sourcemap')}

  ${colors.dim('# Compile-time variable replacement')}
  ${colors.cyan('zeropack build --define process.env.NODE_ENV=production')}
`);
}

// -----------------------------------------------------------------------------
// 4. Arguments Parser using `node:util.parseArgs`
// -----------------------------------------------------------------------------
export function parseCliArgs(args = process.argv.slice(2)) {
  const options = {
    entry: { type: 'string', short: 'e' },
    out: { type: 'string', short: 'o' },
    serve: { type: 'boolean' },
    port: { type: 'string', short: 'p' },
    host: { type: 'string' },
    minify: { type: 'boolean', short: 'm' },
    sourcemap: { type: 'boolean', short: 's' },
    open: { type: 'boolean' },
    'no-open': { type: 'boolean' },
    config: { type: 'string', short: 'c' },
    define: { type: 'string' },
    env: { type: 'string', default: '.env' },
    version: { type: 'boolean', short: 'v', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  };

  try {
    const { values, positionals } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false
    });

    // Parse custom --define and --define.KEY=VAL arguments
    const cliDefine = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--define.')) {
        const eq = arg.indexOf('=');
        if (eq !== -1) {
          cliDefine[arg.slice(9, eq)] = arg.slice(eq + 1);
        }
      } else if (arg === '--define' && i + 1 < args.length) {
        const next = args[i + 1];
        const eq = next.indexOf('=');
        if (eq !== -1) {
          cliDefine[next.slice(0, eq)] = next.slice(eq + 1);
          i++;
        }
      }
    }

    // Filter positionals that are not key=value pairs
    const cleanPositionals = positionals.filter(p => !p.includes('='));

    // Determine subcommand vs positional entry
    let subcommand = null;
    let targetEntry = values.entry;
    let targetDir = '.';
    const validSubcommands = ['init', 'build', 'serve'];

    if (cleanPositionals.length > 0) {
      if (validSubcommands.includes(cleanPositionals[0])) {
        subcommand = cleanPositionals[0];
        if (subcommand === 'init') {
          targetDir = cleanPositionals[1] || '.';
        } else if (cleanPositionals[1] && !values.entry) {
          targetEntry = cleanPositionals[1];
        }
      } else if (!values.entry) {
        targetEntry = cleanPositionals[0];
      }
    }

    // Load zeropack.config.json if present
    const fileConfig = loadConfig(values.config, process.cwd());
    const cfg = fileConfig.config || {};

    // Mode determination:
    // If subcommand is 'init' -> init mode
    // If subcommand is 'build' -> serve: false
    // If subcommand is 'serve' -> serve: true
    // If no subcommand:
    //   If values.serve explicitly passed -> values.serve
    //   Else if values.minify or values.out passed without serve -> serve: false
    //   Else if args has 0 items (zero-config) -> serve: true
    //   Else if cfg.serve !== undefined -> Boolean(cfg.serve)
    //   Else -> false
    let serve = false;
    if (subcommand === 'serve') {
      serve = true;
    } else if (subcommand === 'build') {
      serve = Boolean(values.serve);
    } else if (values.serve !== undefined) {
      serve = Boolean(values.serve);
    } else if (args.length === 0) {
      serve = true; // Zero-config defaults to dev server!
    } else if (cfg.serve !== undefined) {
      serve = Boolean(cfg.serve);
    }

    // Browser opening behavior:
    // If --no-open explicitly passed -> false
    // Else if --open explicitly passed -> true
    // Else if cfg.open !== undefined -> Boolean(cfg.open)
    // Else if running zero-config with no arguments -> true
    let open = false;
    if (values['no-open']) {
      open = false;
    } else if (values.open !== undefined) {
      open = Boolean(values.open);
    } else if (cfg.open !== undefined) {
      open = Boolean(cfg.open);
    } else if (args.length === 0 && serve) {
      open = true;
    }

    // Auto-detect entry if not explicitly given
    const entry = targetEntry || cfg.entry || autoDetectEntry(process.cwd()) || 'src/index.js';
    const out = values.out || cfg.out || 'dist/bundle.js';
    const port = parseInt(values.port || cfg.port, 10) || 3000;
    const host = values.host || cfg.host || 'localhost';
    const minify = values.minify !== undefined ? Boolean(values.minify) : Boolean(cfg.minify);
    const sourcemap = values.sourcemap !== undefined ? Boolean(values.sourcemap) : Boolean(cfg.sourcemap);
    const define = { ...(cfg.define || {}), ...cliDefine };

    return {
      subcommand,
      targetDir,
      entry,
      out,
      serve,
      port,
      host,
      open,
      minify,
      sourcemap,
      define,
      env: values.env || '.env',
      version: Boolean(values.version),
      help: Boolean(values.help),
      positionals,
      configPath: fileConfig.path,
      hasConfigFile: fileConfig.exists
    };
  } catch (err) {
    logger.error(`Argument parsing error: ${err.message}`);
    printHelp();
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 5. CLI Execution Lifecycle
// -----------------------------------------------------------------------------
export async function runCli(args = process.argv.slice(2)) {
  const config = parseCliArgs(args);

  if (config.version) {
    console.log('zeropack v1.0.0');
    return;
  }

  if (config.help) {
    printHelp();
    return;
  }

  // Handle 'init' subcommand
  if (config.subcommand === 'init') {
    scaffoldProject(config.targetDir);
    return;
  }

  printBanner();

  if (config.hasConfigFile) {
    logger.info(`Loaded configuration from ${colors.cyan(config.configPath)}`);
  }

  // Load .env automatically
  const envResult = loadEnv(config.env);
  if (envResult.loaded) {
    logger.info(`Loaded ${colors.bold(envResult.count)} environment variables from ${colors.dim(envResult.path)}`);
  }

  // Verify entry file exists
  const resolvedEntry = path.resolve(process.cwd(), config.entry);
  if (!fs.existsSync(resolvedEntry)) {
    logger.warn(`No entry file found at ${colors.yellow(config.entry)}`);
    logger.info(`Run ${colors.cyan('zeropack init')} to scaffold a minimal project, or pass ${colors.cyan('--entry <path>')}.`);
    if (!config.serve) {
      process.exit(1);
    }
    return;
  }

  // Dynamic import of bundler/server so CLI file can be run independently or concatenated
  
  

  const startTime = performance.now();
  logger.build(`Target Entry: ${colors.cyan(config.entry)}`);
  logger.build(`Output Path:  ${colors.cyan(config.out)}`);
  logger.build(`Minification: ${config.minify ? colors.green('ENABLED') : colors.gray('DISABLED')}`);
  logger.build(`Source Map:   ${config.sourcemap ? colors.green('ENABLED') : colors.gray('DISABLED')}`);
  if (Object.keys(config.define).length > 0) {
    logger.build(`Defines:      ${colors.cyan(JSON.stringify(config.define))}`);
  }

  try {
    const graph = buildDependencyGraph(config.entry);
    const result = bundleToFile(graph, config.out, {
      minify: config.minify,
      sourcemap: config.sourcemap,
      define: config.define,
      entryPath: config.entry
    });

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.success(`Bundle generated in ${colors.bold(elapsed + 'ms')} (${colors.cyan(result.size + ' bytes')}) [${colors.green(result.stats.compressionRatio + ' saved')}]`);
    logger.info(`SHA-256 Hash: ${colors.gray(result.hash)}`);
    if (result.mapPath) {
      logger.info(`Source Map:   ${colors.cyan(result.mapPath)}`);
    }

    if (config.serve) {
      
      await startDevServer({
        port: config.port,
        host: config.host,
        open: config.open,
        entry: config.entry,
        out: config.out,
        minify: config.minify,
        sourcemap: config.sourcemap,
        define: config.define,
        rootDir: process.cwd(),
        stats: result.stats
      });
    }
  } catch (error) {
    if (typeof error.format === 'function') {
      logger.raw('\n' + error.format() + '\n');
    } else {
      logger.error(`Build failed: ${error.message}`);
    }
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    if (!config.serve) {
      process.exit(1);
    }
  }
}

// ==========================================
// Module: errors.js
// ==========================================
/**
 * Structured BuildError for compiler, module resolution, and syntax failures.
 * Captures file, line, column, offending source line, and actionable suggestions.
 */
export class BuildError extends Error {
  constructor(message, { file = null, line = null, column = null, sourceLine = null, suggestion = null } = {}) {
    super(message);
    this.name = 'BuildError';
    this.file = file;
    this.line = line;
    this.column = column;
    this.sourceLine = sourceLine;
    this.suggestion = suggestion;
  }

  format() {
    let out = `${colors.red(colors.bold('BuildError:'))} ${this.message}`;
    if (this.file) {
      const loc = this.line ? `:${this.line}${this.column ? `:${this.column}` : ''}` : '';
      out += `\n  ${colors.dim('at')} ${colors.cyan(this.file + loc)}`;
    }
    if (this.sourceLine) {
      out += `\n\n  ${colors.gray(this.line ? `${this.line} |` : '>')} ${this.sourceLine}`;
      if (this.column) {
        out += `\n    ${' '.repeat(String(this.line || '').length + 2)}${colors.red('^')}`;
      }
    }
    if (this.suggestion) {
      out += `\n\n  ${colors.yellow(colors.bold('Suggestion:'))} ${this.suggestion}`;
    }
    return out;
  }
}

// ==========================================
// Module: sourcemap.js
// ==========================================
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encodes a signed integer to Base64 VLQ (Variable-Length Quantity).
 * Follows the Source Map Revision 3 specification.
 *
 * @param {number} value
 * @returns {string}
 */
export function encodeVlq(value) {
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let encoded = '';
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 32; // continuation bit set
    }
    encoded += B64_CHARS[digit];
  } while (vlq > 0);
  return encoded;
}

/**
 * Decodes a Base64 VLQ sequence into an array of integers (useful for test assertions).
 *
 * @param {string} str
 * @returns {number[]}
 */
export function decodeVlq(str) {
  const result = [];
  let shift = 0;
  let value = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = B64_CHARS.indexOf(char);
    if (index === -1) continue;

    const hasContinuation = (index & 32) !== 0;
    const digit = index & 31;
    value += digit << shift;

    if (hasContinuation) {
      shift += 5;
    } else {
      const isNegative = (value & 1) === 1;
      const finalValue = value >>> 1;
      result.push(isNegative ? -finalValue : finalValue);
      value = 0;
      shift = 0;
    }
  }

  return result;
}

/**
 * Generates a standard Source Map v3 JSON object with delta-encoded mappings.
 *
 * @param {Object} options
 * @param {string} options.file Output bundle filename
 * @param {Array<{ path: string, content: string }>} options.sources Original source files
 * @param {Array<Array<[number, number, number, number]>>} options.lineMappings
 *   Per generated line: array of segments [genCol, sourceIdx, origLine, origCol]
 * @returns {Object} v3 SourceMap object
 */
export function generateSourceMap({ file, sources, lineMappings }) {
  let prevSourceIdx = 0;
  let prevOrigLine = 0;
  let prevOrigCol = 0;

  const mappings = lineMappings.map((segments) => {
    let prevGenCol = 0;
    return segments.map(([genCol, sourceIdx, origLine, origCol]) => {
      const segGenCol = genCol - prevGenCol;
      const segSourceIdx = sourceIdx - prevSourceIdx;
      const segOrigLine = origLine - prevOrigLine;
      const segOrigCol = origCol - prevOrigCol;

      prevGenCol = genCol;
      prevSourceIdx = sourceIdx;
      prevOrigLine = origLine;
      prevOrigCol = origCol;

      return (
        encodeVlq(segGenCol) +
        encodeVlq(segSourceIdx) +
        encodeVlq(segOrigLine) +
        encodeVlq(segOrigCol)
      );
    }).join(',');
  }).join(';');

  return {
    version: 3,
    file,
    sources: sources.map((s) => s.path.replace(/\\/g, '/')),
    sourcesContent: sources.map((s) => s.content),
    names: [],
    mappings
  };
}

// ==========================================
// Module: parser.js
// ==========================================
const stripTypeScriptTypes = nodeModule.stripTypeScriptTypes || nodeModule.default?.stripTypeScriptTypes;

/**
 * Resolves a file candidate checking extensions and index files.
 */
export function resolveFilePath(candidate, fromFile, specifier) {
  // 1. Exact file match
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // 2. Try file extensions
  const extensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json'];
  for (const ext of extensions) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 3. Try directory index file
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of extensions) {
      const indexFile = path.join(candidate, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
  }

  throw new BuildError(`Cannot resolve module '${specifier}' requested by '${fromFile}'`, {
    file: fromFile,
    suggestion: `Check file path and extension. Tried: ${extensions.join(', ')}`
  });
}

/**
 * Resolves bare specifiers from node_modules following Node.js resolution algorithm.
 * Inspects package.json "exports", "module", "main", and index fallback.
 */
export function resolveNodeModule(fromFile, specifier, rootDir = process.cwd()) {
  let pkgName = '';
  let subpath = '.';

  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    if (parts.length < 2) {
      throw new BuildError(`Invalid scoped package specifier: '${specifier}'`, {
        file: fromFile,
        suggestion: `Scoped packages must follow the format '@scope/package'.`
      });
    }
    pkgName = `${parts[0]}/${parts[1]}`;
    if (parts.length > 2) {
      subpath = './' + parts.slice(2).join('/');
    }
  } else {
    const parts = specifier.split('/');
    pkgName = parts[0];
    if (parts.length > 1) {
      subpath = './' + parts.slice(1).join('/');
    }
  }

  // Traverse upwards from path.dirname(fromFile) to rootDir searching for node_modules/pkgName
  let currentDir = path.dirname(fromFile);
  let pkgDir = null;

  while (true) {
    const candidate = path.join(currentDir, 'node_modules', pkgName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      pkgDir = candidate;
      break;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // Fallback to checking rootDir/node_modules if not found in parent traversal
  if (!pkgDir) {
    const rootCandidate = path.join(rootDir, 'node_modules', pkgName);
    if (fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isDirectory()) {
      pkgDir = rootCandidate;
    }
  }

  if (!pkgDir) {
    throw new BuildError(`Cannot find package '${pkgName}' imported from '${path.relative(rootDir, fromFile).replace(/\\/g, '/')}'`, {
      file: fromFile,
      suggestion: `Run 'npm install ${pkgName}' or verify that the package exists in node_modules.`
    });
  }

  const pkgJsonPath = path.join(pkgDir, 'package.json');
  let pkgJson = null;
  if (fs.existsSync(pkgJsonPath)) {
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    } catch (e) {
      throw new BuildError(`Failed to parse '${pkgJsonPath}': ${e.message}`, {
        file: pkgJsonPath,
        suggestion: `Verify package.json format in '${pkgDir}'.`
      });
    }
  }

  function resolveExportCondition(target) {
    if (typeof target === 'string') return target;
    if (typeof target === 'object' && target !== null) {
      const conditions = ['import', 'module', 'browser', 'default', 'node', 'require'];
      for (const cond of conditions) {
        if (target[cond]) {
          const res = resolveExportCondition(target[cond]);
          if (res) return res;
        }
      }
    }
    return null;
  }

  // 1. Check package.json "exports" field
  if (pkgJson && pkgJson.exports) {
    const exp = pkgJson.exports;
    let target = null;

    if (typeof exp === 'string' && (subpath === '.' || subpath === './')) {
      target = exp;
    } else if (typeof exp === 'object' && exp !== null) {
      if (exp[subpath]) {
        target = resolveExportCondition(exp[subpath]);
      } else if (subpath === '.' || subpath === './') {
        if (exp['.']) {
          target = resolveExportCondition(exp['.']);
        } else {
          target = resolveExportCondition(exp);
        }
      }
    }

    if (target) {
      const candidate = path.resolve(pkgDir, target);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
      try {
        return resolveFilePath(candidate, fromFile, specifier);
      } catch (_) {}
    }
  }

  // 2. Check "module" (ESM priority) then "main"
  if (subpath === '.' || subpath === './') {
    if (pkgJson) {
      const mainField = pkgJson.module || pkgJson.main;
      if (mainField) {
        const candidate = path.resolve(pkgDir, mainField);
        try {
          return resolveFilePath(candidate, fromFile, specifier);
        } catch (_) {}
      }
    }
    // 3. Fallback to index.js, index.mjs, index.cjs
    try {
      return resolveFilePath(path.join(pkgDir, 'index'), fromFile, specifier);
    } catch (_) {}
  } else {
    // 4. Directory or subpath import
    const candidate = path.resolve(pkgDir, subpath);
    try {
      return resolveFilePath(candidate, fromFile, specifier);
    } catch (_) {}
  }

  throw new BuildError(`Cannot resolve entry for package '${specifier}' in '${pkgDir}'`, {
    file: fromFile,
    suggestion: `Check "exports" or "main" in '${path.join(pkgDir, 'package.json')}'.`
  });
}

/**
 * Resolves a module specifier relative to the importing file or from node_modules.
 * Checks for extensions (.js, .mjs, .cjs, .ts, .json) and directory indexes.
 */
export function resolveModulePath(fromFile, specifier, rootDir = process.cwd()) {
  // Relative or absolute path
  if (specifier.startsWith('.') || specifier.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(specifier)) {
    const candidate = path.resolve(path.dirname(fromFile), specifier);
    return resolveFilePath(candidate, fromFile, specifier);
  }

  // Bare specifier: resolve from node_modules following Node algorithm
  return resolveNodeModule(fromFile, specifier, rootDir);
}

/**
 * Extracts binding identifier names from object and array destructuring patterns.
 * Handles renaming (a: b), default values (a = 1, b: c = 2), and rest elements (...rest).
 */
export function extractBindingIdentifiers(pattern) {
  const ids = [];
  const cleaned = pattern.trim().replace(/^\{|\}$|^\[|\]$/g, '');
  const parts = cleaned.split(',');
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (part.startsWith('...')) {
      const id = part.slice(3).trim();
      if (id) ids.push(id);
      continue;
    }
    if (part.includes(':')) {
      const val = part.split(':')[1].trim();
      const id = val.split('=')[0].trim();
      if (id) ids.push(id);
    } else {
      const id = part.split('=')[0].trim();
      if (id) ids.push(id);
    }
  }
  return ids;
}

/**
 * Extracts import/require specifiers and transforms ESM syntax into runtime CJS format.
 */
export function transformModuleCode(rawCode, filePath) {
  const dependencies = new Set();
  let code = rawCode;

  // Handle TypeScript type stripping where available (.ts, .mts, .cts, .tsx)
  if (filePath && /\.[cm]?ts[x]?$/.test(filePath)) {
    if (typeof stripTypeScriptTypes === 'function') {
      try {
        code = stripTypeScriptTypes(code);
      } catch (err) {
        throw new BuildError(`TypeScript syntax error in '${filePath}': ${err.message}`, {
          file: filePath,
          suggestion: `Check TypeScript syntax.`
        });
      }
    } else {
      throw new BuildError(
        `Native TypeScript type stripping is not available in Node.js ${process.version}. Requires Node.js >= 22.6.0.`,
        {
          file: filePath,
          suggestion: `Upgrade to Node.js >= 22.6.0 or pre-compile TypeScript files to JavaScript.`
        }
      );
    }
  }

  // If JSON file, wrap as module export
  if (filePath && filePath.endsWith('.json')) {
    return {
      code: `module.exports = ${rawCode.trim() || '{}'};`,
      dependencies: []
    };
  }

  // 1. Scan and collect require('...') calls
  const requireRegex = /(?:^|[^.\w])require\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  let reqMatch;
  while ((reqMatch = requireRegex.exec(code)) !== null) {
    dependencies.add(reqMatch[2]);
  }

  // 2. Transform `export * as name from 'specifier'`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\*\s+as\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, varName, quote, specifier) => {
      dependencies.add(specifier);
      return `\nmodule.exports.${varName} = require('${specifier}');`;
    }
  );

  // 3. Transform `export * from 'specifier'`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\*\s+from\s+(['"])(.*?)\1(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, quote, specifier) => {
      dependencies.add(specifier);
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      const tempVar = `__reexport_${specifierHash}`;
      return `\nconst ${tempVar} = require('${specifier}');\nfor (const __k in ${tempVar}) { if (__k !== 'default' && __k !== '__esModule') { module.exports[__k] = ${tempVar}[__k]; } }`;
    }
  );

  // 4. Transform `import * as name from 'specifier'` (with optional with/assert attributes)
  code = code.replace(
    /(?:^|[\n;])\s*import\s+\*\s+as\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, varName, quote, specifier) => {
      dependencies.add(specifier);
      return `\nconst ${varName} = require('${specifier}');`;
    }
  );

  // 5. Transform `import DefaultName, { a, b as c } from 'specifier'` or `import DefaultName from 'specifier'`
  // or `import { a, b as c } from 'specifier'` (with optional with/assert attributes)
  code = code.replace(
    /(?:^|[\n;])\s*import\s+([\s\S]*?)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, importClause, quote, specifier) => {
      dependencies.add(specifier);
      const clause = importClause.trim();
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      const tempVar = `__mod_${specifierHash}`;

      let lines = [`const ${tempVar} = require('${specifier}');`];

      if (clause.startsWith('{')) {
        // Named imports: `import { a, b as c } from '...'`
        const inside = clause.slice(1, -1).trim();
        const renamed = inside.split(',').map((part) => {
          const p = part.trim();
          if (!p) return '';
          if (p.includes(' as ')) {
            const [orig, alias] = p.split(' as ').map((s) => s.trim());
            return `${orig}: ${alias}`;
          }
          return p;
        }).filter(Boolean).join(', ');
        lines.push(`const { ${renamed} } = ${tempVar};`);
      } else if (clause.includes('{')) {
        // Default and named: `import DefaultName, { a, b as c } from '...'`
        const [defaultPart, namedPart] = clause.split(/,(.+)/);
        const defName = defaultPart.trim();
        const inside = namedPart.trim().slice(1, -1).trim();
        lines.push(`const ${defName} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
        const renamed = inside.split(',').map((part) => {
          const p = part.trim();
          if (!p) return '';
          if (p.includes(' as ')) {
            const [orig, alias] = p.split(' as ').map((s) => s.trim());
            return `${orig}: ${alias}`;
          }
          return p;
        }).filter(Boolean).join(', ');
        lines.push(`const { ${renamed} } = ${tempVar};`);
      } else {
        // Pure default import: `import DefaultName from '...'`
        lines.push(`const ${clause} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
      }

      return '\n' + lines.join('\n');
    }
  );

  // 6. Transform bare side-effect `import 'specifier'`
  code = code.replace(
    /(?:^|[\n;])\s*import\s+(['"])(.*?)\1(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, quote, specifier) => {
      dependencies.add(specifier);
      return `\nrequire('${specifier}');`;
    }
  );

  // 7. Transform `export default function foo() {}` or `export default async function foo() {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+(async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, isAsync, funcName, params) => {
      return `\nmodule.exports.default = ${funcName};\n${isAsync || ''}function ${funcName}(${params}) {\n`;
    }
  );

  // 8. Transform `export default class Foo {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\nmodule.exports.default = ${className};\n`;
    }
  );

  // 9. Transform generic `export default ...` (expressions, objects, anonymous functions/classes)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+([\s\S]+?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (match, expr) => {
      const trimmedExpr = expr.trim();
      if (!trimmedExpr) return match;
      if (trimmedExpr.startsWith('function') && !trimmedExpr.startsWith('function(') && !trimmedExpr.startsWith('function (')) {
        return match; // Named function handled above
      }
      return `\nconst __defaultExport = (${trimmedExpr});\nmodule.exports.default = __defaultExport;\n`;
    }
  );

  // 10. Transform `export function name(...) {}` and `export async function name(...) {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+(async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, isAsync, funcName, params) => {
      return `\nmodule.exports.${funcName} = ${funcName};\n${isAsync || ''}function ${funcName}(${params}) {\n`;
    }
  );

  // 11. Transform `export class name {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\nmodule.exports.${className} = ${className};\n`;
    }
  );

  // 12. Transform destructured exports: `export const/let/var { ... } = ...;` or `export const/let/var [ ... ] = ...;`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+(const|let|var)\s+(\{[\s\S]*?\}|\[[\s\S]*?\])\s*=\s*([\s\S]*?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (_, decl, pattern, expr) => {
      const ids = extractBindingIdentifiers(pattern);
      const isMutable = decl === 'let' || decl === 'var';
      const exportBindings = ids.map((id) => {
        if (isMutable) {
          return `try { Object.defineProperty(module.exports, '${id}', { get: () => ${id}, set: (v) => { ${id} = v; }, enumerable: true, configurable: true }); } catch (_) { module.exports.${id} = ${id}; }`;
        }
        return `module.exports.${id} = ${id};`;
      }).join('\n');
      return `\n${decl} ${pattern} = ${expr.trim()};\n${exportBindings}\n`;
    }
  );

  // 13. Transform `export let/var name = ...` (with live bindings)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+(let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*([\s\S]*?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (_, decl, varName, expr) => {
      return `\n${decl} ${varName} = ${expr.trim()};\ntry { Object.defineProperty(module.exports, '${varName}', { get: () => ${varName}, set: (v) => { ${varName} = v; }, enumerable: true, configurable: true }); } catch (_) { module.exports.${varName} = ${varName}; }\n`;
    }
  );

  // 14. Transform `export const name = ...`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+const\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g,
    (_, varName) => {
      return `\nconst ${varName} = module.exports.${varName} =`;
    }
  );

  // 15. Transform `export { a, b as c }` (with live getter bindings)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\{([\s\S]*?)\};?/g,
    (_, inside) => {
      const exportsList = inside.split(',').map((part) => {
        const p = part.trim();
        if (!p) return '';
        if (p.includes(' as ')) {
          const [orig, alias] = p.split(' as ').map((s) => s.trim());
          return `try { Object.defineProperty(module.exports, '${alias}', { get: () => ${orig}, enumerable: true, configurable: true }); } catch (_) { module.exports.${alias} = ${orig}; }`;
        }
        return `try { Object.defineProperty(module.exports, '${p}', { get: () => ${p}, enumerable: true, configurable: true }); } catch (_) { module.exports.${p} = ${p}; }`;
      }).filter(Boolean).join('\n');
      return '\n' + exportsList;
    }
  );

  return {
    code,
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
    throw new Error(`Entry file not found: ${absoluteEntry}`);
  }

  let nextId = 0;
  const fileToIdMap = new Map();
  const graph = [];
  const visitedFiles = new Set();
  const recursionStack = new Set();

  function createModule(absoluteFilePath) {
    const rawContent = fs.readFileSync(absoluteFilePath, 'utf8');
    const hash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const { code, dependencies } = transformModuleCode(rawContent, absoluteFilePath);

    const id = nextId++;
    fileToIdMap.set(absoluteFilePath, id);

    const moduleNode = {
      id,
      filePath: absoluteFilePath,
      relativePath: path.relative(rootDir, absoluteFilePath).replace(/\\/g, '/'),
      rawCode: rawContent,
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
        throw err;
      }
    }

    recursionStack.delete(absoluteFilePath);
    return moduleNode.id;
  }

  traverse(absoluteEntry);

  return graph;
}

// ==========================================
// Module: bundler.js
// ==========================================
/**
 * Pure zero-dependency minifier using string scanner and state machine.
 * Correctly preserves strings ('...', "...", `...`), template literals, and regexes
 * while stripping single-line comments, multi-line comments, and extraneous whitespace.
 * Optionally tracks source map mappings.
 */
export function minifyCode(code, options = {}) {
  const { sourcemap = false, initialLineMappings = null } = options;
  let output = '';
  let i = 0;
  const len = code.length;

  // Stack of contexts: 'CODE', 'TEMPLATE', 'EXPR'
  const stack = ['CODE'];
  const braceStack = [];

  let lastSignificantToken = '';
  let hadNewline = false;

  let inLine = 0;
  let inCol = 0;
  let outLine = 0;
  let outCol = 0;
  const minifiedLineMappings = [[]];

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
        outLine++;
        outCol = 0;
        if (sourcemap) minifiedLineMappings.push([]);
      }
    }

    const updatedLastChar = output.slice(-1);
    if (isWordChar(updatedLastChar) && isWordChar(firstChar)) {
      output += ' ';
      outCol++;
    } else if (updatedLastChar === '+' && firstChar === '+') {
      output += ' ';
      outCol++;
    } else if (updatedLastChar === '-' && firstChar === '-') {
      output += ' ';
      outCol++;
    } else if (updatedLastChar === '/' && firstChar === '/') {
      output += ' ';
      outCol++;
    }

    if (sourcemap && initialLineMappings && initialLineMappings[inLine] && initialLineMappings[inLine].length > 0) {
      const [_, srcIdx, oLine, _origCol] = initialLineMappings[inLine][0];
      minifiedLineMappings[minifiedLineMappings.length - 1].push([outCol, srcIdx, oLine, inCol]);
    }

    output += token;
    outCol += token.length;
    hadNewline = false;
    lastSignificantToken = token;
  }

  while (i < len) {
    const char = code[i];
    const nextChar = i + 1 < len ? code[i + 1] : '';
    const ctx = currentContext();

    if (char === '\n') {
      inLine++;
      inCol = 0;
    } else {
      inCol++;
    }

    if (ctx === 'TEMPLATE') {
      if (char === '\\') {
        output += char + nextChar;
        outCol += 2;
        i += 2;
        continue;
      }
      if (char === '`') {
        stack.pop();
        output += char;
        outCol++;
        lastSignificantToken = '`';
        i++;
        continue;
      }
      if (char === '$' && nextChar === '{') {
        stack.push('EXPR');
        braceStack.push(1);
        output += '${';
        outCol += 2;
        i += 2;
        lastSignificantToken = '{';
        continue;
      }
      output += char;
      if (char === '\n') {
        outLine++;
        outCol = 0;
        if (sourcemap) minifiedLineMappings.push([]);
      } else {
        outCol++;
      }
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
        if (code[i] === '\n') {
          hadNewline = true;
          inLine++;
          inCol = 0;
        }
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
          outCol++;
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

  // Build modules mapping string
  let modulesString = '\n';
  addEmptyLines(1);

  for (let modIdx = 0; modIdx < sortedGraph.length; modIdx++) {
    const mod = sortedGraph[modIdx];
    const mappingJson = JSON.stringify(mod.mapping);

    modulesString += `  ${mod.id}: [\n`;
    addEmptyLines(1);
    modulesString += `    function(require, module, exports) {\n`;
    addEmptyLines(1);
    modulesString += `// [ZeroPack Module: ${mod.relativePath}]\n`;
    addEmptyLines(1);

    let moduleCode = mod.code;
    if (define && Object.keys(define).length > 0) {
      moduleCode = applyDefine(moduleCode, define);
    }

    const codeLines = moduleCode.split('\n');
    for (let l = 0; l < codeLines.length; l++) {
      modulesString += codeLines[l] + '\n';
      lineMappings.push([[0, modIdx, l, 0]]);
    }

    modulesString += `    },\n`;
    addEmptyLines(1);
    modulesString += `    ${mappingJson}\n`;
    addEmptyLines(1);
    modulesString += `  ],\n`;
    addEmptyLines(1);
  }
  modulesString += '});\n';
  addEmptyLines(1);

  bundleSource += modulesString;

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

// ==========================================
// Module: dashboard.js
// ==========================================
/**
 * ZeroPack Developer Dashboard (100% Zero-Dependency Frontend)
 * Built with native HTML5, modern CSS Grid/Variables, and Vanilla JavaScript.
 */
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroPack Dashboard & Build Metrics</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-hover: #172136;
      --border: #1f2937;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.15);
      --accent-purple: #818cf8;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.5;
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 2rem;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
    }

    .logo-text h1 {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(to right, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }

    .logo-text p {
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(52, 211, 153, 0.1);
      color: var(--success);
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .reload-flash {
      animation: pulse-flash 1s ease-in-out;
    }

    @keyframes pulse-flash {
      0% { transform: scale(1); background: rgba(56, 189, 248, 0.3); color: #fff; }
      50% { transform: scale(1.1); background: rgba(56, 189, 248, 0.8); color: #fff; }
      100% { transform: scale(1); }
    }

    .btn-refresh {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: var(--card-hover);
      border-color: var(--accent);
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
    }

    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), var(--accent-purple));
    }

    .metric-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .metric-subtext {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    /* Chart Section */
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 2rem;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .panel-title {
      font-size: 1.15rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .bar-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .bar-name {
      font-family: monospace;
      color: var(--text-main);
    }

    .bar-size {
      color: var(--accent);
      font-weight: 600;
    }

    .bar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      height: 10px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      height: 100%;
      border-radius: 6px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Footer */
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .live-tag {
      background: rgba(56, 189, 248, 0.1);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <div class="logo-icon">⚡</div>
        <div class="logo-text">
          <h1>ZeroPack Dashboard</h1>
          <p>Zero-Dependency Real-Time Build Metrics & Analytics</p>
        </div>
      </div>
      <div class="header-actions">
        <span id="hmr-badge" class="status-badge">
          <span class="status-dot"></span>
          <span id="hmr-status-text">HMR Live Active</span>
        </span>
        <button id="btn-refresh" class="btn-refresh" onclick="fetchMetrics()">
          <span>🔄</span> Refresh
        </button>
      </div>
    </header>

    <!-- Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">Total Modules</div>
        <div class="metric-value" id="val-module-count">--</div>
        <div class="metric-subtext">Scanned & bundled in dependency tree</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Bundle Size</div>
        <div class="metric-value" id="val-bundle-size">--</div>
        <div class="metric-subtext" id="val-orig-size">Original: -- KB</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Build Time</div>
        <div class="metric-value" id="val-build-time">-- <span style="font-size: 1rem; color: var(--text-muted);">ms</span></div>
        <div class="metric-subtext" id="val-timestamp">Last build: --</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Compression Saved</div>
        <div class="metric-value" id="val-compression" style="color: var(--success);">--</div>
        <div class="metric-subtext">Via Native State-Machine Minifier</div>
      </div>
    </div>

    <!-- Largest Modules Chart -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <span>📊</span> Top Module Size Distribution
        </div>
        <span class="live-tag">RFC 6455 STREAM</span>
      </div>
      <div class="bar-chart" id="module-bars">
        <div style="color: var(--text-muted); font-size: 0.9rem;">Loading dependency distribution...</div>
      </div>
    </div>

    <footer>
      <span>ZeroPack v1.0.0 • 100% Native Node.js Toolchain</span>
      <span>Live Endpoint: <code>/__zeropack/stats</code></span>
    </footer>
  </div>

  <script>
    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    async function fetchMetrics() {
      try {
        const res = await fetch('/__zeropack/stats');
        if (!res.ok) return;
        const data = await res.json();
        renderMetrics(data);
      } catch (err) {
        console.error('[ZeroPack Dashboard Error]', err);
      }
    }

    function renderMetrics(stats) {
      if (!stats) return;

      document.getElementById('val-module-count').textContent = stats.moduleCount || 0;
      document.getElementById('val-bundle-size').textContent = formatBytes(stats.minifiedSize || 0);
      document.getElementById('val-orig-size').textContent = 'Original: ' + formatBytes(stats.originalSize || 0);
      document.getElementById('val-build-time').innerHTML = (stats.buildTimeMs || 0) + ' <span style="font-size: 1rem; color: var(--text-muted);">ms</span>';
      document.getElementById('val-compression').textContent = stats.compressionRatio || '0%';
      document.getElementById('val-timestamp').textContent = 'Last built: ' + (stats.lastBuildTimestamp || 'Just now');

      // Render Top Modules Bar Chart
      const container = document.getElementById('module-bars');
      container.innerHTML = '';

      const modules = stats.modules || [];
      const topModules = modules.slice(0, 6);
      const maxSize = topModules.length > 0 ? topModules[0].size : 1;

      if (topModules.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">No modules found.</div>';
        return;
      }

      for (const mod of topModules) {
        const percentage = Math.max(5, Math.min(100, Math.round((mod.size / maxSize) * 100)));
        const item = document.createElement('div');
        item.className = 'bar-item';
        item.innerHTML = \`
          <div class="bar-meta">
            <span class="bar-name">\${mod.filePath}</span>
            <span class="bar-size">\${formatBytes(mod.size)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: \${percentage}%;"></div>
          </div>
        \`;
        container.appendChild(item);
      }
    }

    // Connect to WebSocket for Live Metric Updates
    function initWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/__zeropack_hmr';
      const badge = document.getElementById('hmr-badge');
      const badgeText = document.getElementById('hmr-status-text');

      const ws = new WebSocket(wsUrl);

      ws.onopen = function() {
        badge.style.borderColor = 'rgba(52, 211, 153, 0.3)';
        badge.style.color = 'var(--success)';
        badgeText.textContent = 'HMR Live Active';
      };

      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reload') {
            // Flash badge
            badge.classList.add('reload-flash');
            badgeText.textContent = 'Live Reloaded!';
            setTimeout(() => {
              badge.classList.remove('reload-flash');
              badgeText.textContent = 'HMR Live Active';
            }, 1200);

            // Refresh stats without whole page reload
            fetchMetrics();
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = function() {
        badge.style.borderColor = 'rgba(248, 113, 113, 0.3)';
        badge.style.color = 'var(--danger)';
        badgeText.textContent = 'Disconnected';
        setTimeout(initWebSocket, 2000);
      };
    }

    // Initial load
    fetchMetrics();
    initWebSocket();
  </script>
</body>
</html>
`;

// ==========================================
// Module: server.js
// ==========================================
/**
 * Checks whether a TCP port is currently available to listen on.
 */
export function isPortAvailable(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => {
      resolve(false);
    });
    tester.once('listening', () => {
      tester.close(() => {
        resolve(true);
      });
    });
    tester.listen(port, host);
  });
}

/**
 * Finds the first available TCP port starting from startPort.
 */
export async function findAvailablePort(startPort = 3000, host = '0.0.0.0', maxAttempts = 100) {
  const numericPort = parseInt(startPort, 10) || 3000;
  for (let p = numericPort; p < numericPort + maxAttempts; p++) {
    const free = await isPortAvailable(p, host);
    if (free) return p;
  }
  return numericPort;
}

/**
 * Automatically opens the given URL in the default web browser.
 * Silently ignores failures and skips execution in CI or non-interactive environments.
 */
export function openBrowser(url) {
  if (process.env.CI || process.env.NODE_ENV === 'test' || !process.stdout.isTTY) {
    return;
  }
  try {
    const platform = process.platform;
    let cmd = '';
    if (platform === 'win32') {
      cmd = `start "" "${url}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }
    exec(cmd, () => {});
  } catch (_) {
    // Silent catch
  }
}

// -----------------------------------------------------------------------------
// 1. Native MIME Type Lookup Table
// -----------------------------------------------------------------------------
export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// -----------------------------------------------------------------------------
// 2. RFC 6455 WebSocket Frame Encoder & Parser
// -----------------------------------------------------------------------------
const WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Encodes a text payload into an RFC 6455 WebSocket frame (Server-to-Client unmasked)
 */
export function encodeWebSocketFrame(payload, opcode = 0x1) {
  const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf8');
  const payloadLength = payloadBuffer.length;

  let headerBuffer;

  if (payloadLength <= 125) {
    headerBuffer = Buffer.alloc(2);
    headerBuffer[0] = 0x80 | (opcode & 0x0f); // FIN bit = 1, Opcode
    headerBuffer[1] = payloadLength;           // Mask bit = 0
  } else if (payloadLength <= 65535) {
    headerBuffer = Buffer.alloc(4);
    headerBuffer[0] = 0x80 | (opcode & 0x0f);
    headerBuffer[1] = 126;
    headerBuffer.writeUInt16BE(payloadLength, 2);
  } else {
    headerBuffer = Buffer.alloc(10);
    headerBuffer[0] = 0x80 | (opcode & 0x0f);
    headerBuffer[1] = 127;
    headerBuffer.writeBigUInt64BE(BigInt(payloadLength), 2);
  }

  return Buffer.concat([headerBuffer, payloadBuffer]);
}

/**
 * Decodes client-to-server RFC 6455 masked WebSocket frames
 */
export function decodeWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;

  const firstByte = buffer[0];
  const secondByte = buffer[1];

  const fin = (firstByte & 0x80) === 0x80;
  const opcode = firstByte & 0x0f;
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let currentOffset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(currentOffset);
    currentOffset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(currentOffset));
    currentOffset += 8;
  }

  let maskingKey = null;
  if (isMasked) {
    if (buffer.length < currentOffset + 4) return null;
    maskingKey = buffer.subarray(currentOffset, currentOffset + 4);
    currentOffset += 4;
  }

  if (buffer.length < currentOffset + payloadLength) return null;
  const rawPayload = buffer.subarray(currentOffset, currentOffset + payloadLength);
  const unmaskedPayload = Buffer.alloc(payloadLength);

  if (isMasked && maskingKey) {
    for (let i = 0; i < payloadLength; i++) {
      unmaskedPayload[i] = rawPayload[i] ^ maskingKey[i % 4];
    }
  } else {
    rawPayload.copy(unmaskedPayload);
  }

  return {
    fin,
    opcode,
    payload: unmaskedPayload,
    text: unmaskedPayload.toString('utf8'),
    totalFrameLength: currentOffset + payloadLength
  };
}

// -----------------------------------------------------------------------------
// 3. Dev Server & HMR Engine
// -----------------------------------------------------------------------------
export async function startDevServer(options = {}) {
  const {
    port: requestedPort = 3000,
    host = 'localhost',
    autoPort = true,
    open = false,
    entry = 'src/index.js',
    out = 'dist/bundle.js',
    minify = false,
    sourcemap = false,
    define = {},
    rootDir = process.cwd(),
    stats: initialStats = null
  } = options;

  let port = requestedPort;
  if (autoPort) {
    port = await findAvailablePort(requestedPort, host === 'localhost' ? '127.0.0.1' : host);
    if (port !== requestedPort) {
      logger.warn(`Port ${colors.yellow(requestedPort)} was in use, switched to available port ${colors.green(colors.bold(port))}`);
    }
  }

  let currentStats = initialStats;
  const activeSockets = new Set();

  // Helper to broadcast WebSocket message to all connected clients
  function broadcast(data) {
    const frame = encodeWebSocketFrame(data);
    for (const socket of activeSockets) {
      try {
        if (!socket.destroyed) {
          socket.write(frame);
        }
      } catch (err) {
        activeSockets.delete(socket);
      }
    }
  }

  // Initial / Rebuild compilation
  function compile() {
    try {
      const graph = buildDependencyGraph(entry, rootDir);
      const result = bundleToFile(graph, out, { minify, sourcemap, define, hmr: true });
      currentStats = result.stats;
      logger.hmr(`Rebuilt bundle: ${colors.green(result.size + ' bytes')} (${colors.gray(result.hash.slice(0, 10))})`);
      return result;
    } catch (err) {
      logger.error(`Rebuild error: ${err.message}`);
      return null;
    }
  }

  if (!currentStats) {
    compile();
  }

  // Helper to inject WebSocket client script into HTML files
  function injectHmrScript(htmlContent) {
    if (htmlContent.includes('__zeropack_hmr')) return htmlContent;
    const hmrScript = `
<script>
(function() {
  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var ws = new WebSocket(protocol + '//' + window.location.host + '/__zeropack_hmr');
  ws.onopen = function() { console.log('[ZeroPack DevServer] Connected to live reload'); };
  ws.onmessage = function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'reload') {
        console.log('[ZeroPack DevServer] Reloading page...');
        window.location.reload();
      }
    } catch(err) {}
  };
})();
</script>`;
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${hmrScript}</body>`);
    }
    return htmlContent + hmrScript;
  }

  // HTTP Server
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // -------------------------------------------------------------------------
    // Route 1: Built-in ZeroPack Dashboard UI (/__zeropack)
    // -------------------------------------------------------------------------
    if (pathname === '/__zeropack' || pathname === '/__zeropack/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(DASHBOARD_HTML);
      return;
    }

    // -------------------------------------------------------------------------
    // Route 2: Built-in ZeroPack Stats API (/__zeropack/stats)
    // -------------------------------------------------------------------------
    if (pathname === '/__zeropack/stats') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(JSON.stringify(currentStats || {}));
      return;
    }

    // Route root to index.html
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    // Directory traversal security check
    if (req.url.includes('..') || req.url.includes('\\') || pathname.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden: Directory traversal attempt blocked');
      return;
    }

    const resolvedPath = path.resolve(rootDir, '.' + pathname);
    if (!resolvedPath.startsWith(path.resolve(rootDir))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden: Directory traversal attempt blocked');
      return;
    }

    let filePath = path.join(rootDir, pathname);

    // If file doesn't exist, check inside public/ or dist/
    if (!fs.existsSync(filePath)) {
      const publicPath = path.join(rootDir, 'public', pathname);
      const distPath = path.join(rootDir, 'dist', pathname);
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      } else if (fs.existsSync(distPath)) {
        filePath = distPath;
      }
    }

    // Serve static file if exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const mimeType = getMimeType(filePath);
      let content = fs.readFileSync(filePath);

      // Auto-inject WebSocket client script into HTML files
      if (mimeType.startsWith('text/html')) {
        content = Buffer.from(injectHmrScript(content.toString('utf8')), 'utf8');
      }

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': content.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
      return;
    }

    // SPA Fallback Routing:
    // If request has no extension or explicitly requests text/html, fallback to index.html
    const hasExtension = Boolean(path.extname(pathname));
    const acceptsHtml = (req.headers.accept || '').includes('text/html');

    if (!hasExtension || acceptsHtml) {
      const candidates = [
        path.join(rootDir, 'index.html'),
        path.join(rootDir, 'public', 'index.html'),
        path.join(rootDir, 'dist', 'index.html')
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          const rawHtml = fs.readFileSync(cand, 'utf8');
          const injectedHtml = injectHmrScript(rawHtml);
          const buf = Buffer.from(injectedHtml, 'utf8');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': buf.length,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          });
          res.end(buf);
          return;
        }
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 Not Found: ${pathname}`);
  });

  // RFC 6455 WebSocket Upgrade Handler
  server.on('upgrade', (req, socket, head) => {
    const secKey = req.headers['sec-websocket-key'];
    if (!secKey) {
      socket.destroy();
      return;
    }

    // RFC 6455 Handshake Acceptance Hash
    const acceptHash = crypto
      .createHash('sha1')
      .update(secKey + WS_MAGIC_STRING)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptHash}`,
      '\r\n'
    ];

    socket.write(headers.join('\r\n'));
    activeSockets.add(socket);

    logger.hmr(`Client connected to HMR WebSocket. Active clients: ${colors.bold(activeSockets.size)}`);

    socket.on('data', (buffer) => {
      const frame = decodeWebSocketFrame(buffer);
      if (frame) {
        // Ping frame (0x9) -> respond with Pong (0xA)
        if (frame.opcode === 0x9) {
          socket.write(encodeWebSocketFrame(frame.payload, 0xa));
        }
        // Close frame (0x8)
        else if (frame.opcode === 0x8) {
          activeSockets.delete(socket);
          socket.end(encodeWebSocketFrame(Buffer.alloc(0), 0x8));
        }
      }
    });

    socket.on('close', () => {
      activeSockets.delete(socket);
    });

    socket.on('error', () => {
      activeSockets.delete(socket);
    });
  });

  // Native Watcher with 100ms Debounce using `node:fs.watch`
  let debounceTimer = null;
  const watchDir = path.resolve(rootDir, 'src');
  const publicDir = path.resolve(rootDir, 'public');

  function handleWatchEvent(eventType, filename) {
    if (!filename) return;
    if (filename.endsWith('bundle.js') || filename.includes('node_modules') || filename.startsWith('.')) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      logger.hmr(`File change detected: ${colors.cyan(filename)}. Rebundling...`);
      const success = compile();
      if (success) {
        broadcast({ type: 'reload', file: filename, timestamp: Date.now() });
        logger.hmr(`Dispatched ${colors.green('RELOAD')} frame to ${colors.bold(activeSockets.size)} client(s)`);
      }
    }, 100);
  }

  const watchers = [];
  if (fs.existsSync(watchDir)) {
    watchers.push(fs.watch(watchDir, { recursive: true }, handleWatchEvent));
  }
  if (fs.existsSync(publicDir)) {
    watchers.push(fs.watch(publicDir, { recursive: true }, handleWatchEvent));
  }

  function closeServer() {
    for (const w of watchers) {
      try { w.close(); } catch(e) {}
    }
    for (const s of activeSockets) {
      try { s.destroy(); } catch(e) {}
    }
    return new Promise((resolve) => server.close(resolve));
  }

  return new Promise((resolve, reject) => {
    const listenHost = host === 'localhost' ? '127.0.0.1' : host;
    server.listen(port, listenHost, () => {
      const displayHost = host === '0.0.0.0' || host === '127.0.0.1' ? 'localhost' : host;
      const serverUrl = `http://${displayHost}:${port}/`;
      logger.server(`Development server running at: ${colors.green(colors.bold(serverUrl))}`);
      logger.server(`Developer Dashboard active at: ${colors.brightCyan(colors.bold(`${serverUrl}__zeropack`))}`);
      logger.server(`HMR WebSocket endpoint active at: ${colors.cyan(colors.bold(`ws://${displayHost}:${port}/__zeropack_hmr`))}`);
      logger.info(`Watching directory: ${colors.gray(watchDir)}`);

      if (open) {
        openBrowser(serverUrl);
      }

      resolve({ server, port, broadcast, close: closeServer });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Please specify another port with --port`);
      } else {
        logger.error(`Dev server error: ${err.message}`);
      }
      reject(err);
    });
  });
}
// -----------------------------------------------------------------------------
// Auto-Run CLI when invoked directly
// -----------------------------------------------------------------------------
runCli().catch((err) => {
  logger.error('Fatal CLI Error: ' + err.message);
  process.exit(1);
});
