import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

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
  ${colors.green('zeropack')} [options]
  ${colors.green('node src/cli.js')} [options]

${colors.bold('OPTIONS:')}
  ${colors.yellow('--entry <path>')}     Entry JavaScript/TypeScript file ${colors.dim('(default: src/index.js)')}
  ${colors.yellow('--out <path>')}       Output bundle path ${colors.dim('(default: dist/bundle.js)')}
  ${colors.yellow('--serve')}            Start native HTTP static dev server & RFC 6455 WebSocket HMR
  ${colors.yellow('--port <number>')}    Port for the dev server ${colors.dim('(default: 3000)')}
  ${colors.yellow('--minify')}           Minify output bundle (removes comments & whitespace)
  ${colors.yellow('--env <path>')}       Custom path to .env file ${colors.dim('(default: .env)')}
  ${colors.yellow('--help, -h')}         Display this help message

${colors.bold('EXAMPLES:')}
  ${colors.dim('# Bundle with minification')}
  ${colors.cyan('zeropack --entry src/index.js --out dist/bundle.js --minify')}

  ${colors.dim('# Start dev server with Live Reload / WebSocket HMR on port 8080')}
  ${colors.cyan('zeropack --entry src/index.js --serve --port 8080')}

  ${colors.dim('# Standalone single-file compiler & verification')}
  ${colors.cyan('npm run build-standalone')}
`);
}

// -----------------------------------------------------------------------------
// 4. Arguments Parser using `node:util.parseArgs`
// -----------------------------------------------------------------------------
export function parseCliArgs(args = process.argv.slice(2)) {
  const options = {
    entry: {
      type: 'string',
      default: 'src/index.js'
    },
    out: {
      type: 'string',
      default: 'dist/bundle.js'
    },
    serve: {
      type: 'boolean',
      default: false
    },
    port: {
      type: 'string',
      default: '3000'
    },
    minify: {
      type: 'boolean',
      default: false
    },
    env: {
      type: 'string',
      default: '.env'
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false
    }
  };

  try {
    const { values, positionals } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false
    });

    // Support positional entry argument if provided (e.g. `zeropack src/main.js`)
    let entry = values.entry;
    if (positionals.length > 0 && values.entry === 'src/index.js') {
      entry = positionals[0];
    }

    return {
      entry,
      out: values.out,
      serve: Boolean(values.serve),
      port: parseInt(values.port, 10) || 3000,
      minify: Boolean(values.minify),
      env: values.env,
      help: Boolean(values.help),
      positionals
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

  if (config.help) {
    printHelp();
    return;
  }

  printBanner();

  // Load .env automatically
  const envResult = loadEnv(config.env);
  if (envResult.loaded) {
    logger.info(`Loaded ${colors.bold(envResult.count)} environment variables from ${colors.dim(envResult.path)}`);
  }

  // Dynamic import of bundler/server so CLI file can be run independently or concatenated
  const { buildDependencyGraph } = await import('./parser.js');
  const { bundleToFile } = await import('./bundler.js');

  const startTime = performance.now();
  logger.build(`Target Entry: ${colors.cyan(config.entry)}`);
  logger.build(`Output Path:  ${colors.cyan(config.out)}`);
  logger.build(`Minification: ${config.minify ? colors.green('ENABLED') : colors.gray('DISABLED')}`);

  try {
    const graph = buildDependencyGraph(config.entry);
    const result = bundleToFile(graph, config.out, {
      minify: config.minify,
      entryPath: config.entry
    });

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.success(`Bundle generated in ${colors.bold(elapsed + 'ms')} (${colors.cyan(result.size + ' bytes')})`);
    logger.info(`SHA-256 Hash: ${colors.gray(result.hash)}`);

    if (config.serve) {
      const { startDevServer } = await import('./server.js');
      await startDevServer({
        port: config.port,
        entry: config.entry,
        out: config.out,
        minify: config.minify,
        rootDir: process.cwd()
      });
    }
  } catch (error) {
    logger.error(`Build failed: ${error.message}`);
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
