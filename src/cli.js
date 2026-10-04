#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

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
    'auto-port': { type: 'boolean' },
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
    // If explicit --serve passed -> values.serve
    // If explicit build flags passed without serve (--minify, --out) -> serve: false
    // If cfg.serve !== undefined -> Boolean(cfg.serve)
    // Else (zero-config / no build flags) -> serve: true
    let serve = false;
    if (subcommand === 'serve') {
      serve = true;
    } else if (subcommand === 'build') {
      serve = Boolean(values.serve);
    } else if (values.serve !== undefined) {
      serve = Boolean(values.serve);
    } else if (values.minify || values.out) {
      serve = false;
    } else if (cfg.serve !== undefined) {
      serve = Boolean(cfg.serve);
    } else {
      serve = true; // Zero-config defaults to dev server!
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

    const autoPort = values['auto-port'] !== undefined ? Boolean(values['auto-port']) : (cfg.autoPort !== undefined ? Boolean(cfg.autoPort) : true);

    return {
      subcommand,
      targetDir,
      entry,
      out,
      serve,
      port,
      host,
      open,
      autoPort,
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
  const { buildDependencyGraph } = await import('./parser.js');
  const { bundleToFile } = await import('./bundler.js');

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
      const { startDevServer } = await import('./server.js');
      await startDevServer({
        port: config.port,
        host: config.host,
        open: config.open,
        autoPort: config.autoPort,
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

// Auto-run if executed directly as entry module
const isMain = process.argv[1] && (
  process.argv[1].endsWith('cli.js') || 
  process.argv[1].endsWith('zeropack.js')
);

if (isMain) {
  runCli().catch((err) => {
    logger.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
