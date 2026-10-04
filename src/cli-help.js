/**
 * @module cli-help
 * @description Argument parsing and help text for ZeroPack CLI.
 */
import process from 'node:process';
import { parseArgs } from 'node:util';
import { colors, logger } from './cli-logger.js';

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
${colors.bold('ZeroPack')} is a 100% zero-dependency JavaScript bundler and dev server.
It bundles ES Modules, parses modern syntax, and serves your app with Live Reload.

${colors.bold('USAGE:')}
  ${colors.green('zeropack')} [options]
  ${colors.green('node src/cli.js')} [options]

${colors.bold('OPTIONS:')}
  ${colors.yellow('--entry <path>')}     Entry JavaScript file ${colors.dim('(default: src/index.js)')}
  ${colors.yellow('--out <path>')}       Output bundle path ${colors.dim('(default: dist/bundle.js)')}
  ${colors.yellow('--serve')}            Start native HTTP static dev server & RFC 6455 Live Reload
  ${colors.yellow('--watch')}            Watch source files and rebuild on change (no server)
  ${colors.yellow('--port <number>')}    Port for the dev server ${colors.dim('(default: 3000)')}
  ${colors.yellow('--host <address>')}   Host address for dev server ${colors.dim('(default: 127.0.0.1)')}
  ${colors.yellow('--minify')}           Minify output bundle (removes comments & whitespace)
  ${colors.yellow('--env <path>')}       Custom path to .env file ${colors.dim('(default: .env)')}
  ${colors.yellow('--help, -h')}         Display this help message

${colors.bold('EXAMPLES:')}
  ${colors.dim('# 1. Build for production (minified)')}
  ${colors.cyan('zeropack --entry src/main.js --out dist/app.js --minify')}

  ${colors.dim('# 2. Start dev server with Live Reload on port 8080')}
  ${colors.cyan('zeropack --entry src/index.js --serve --port 8080')}

  ${colors.dim('# 3. Build the standalone zero-dependency executable')}
  ${colors.cyan('npm run build-standalone')}
`);
}

export function parseCliArgs(args = process.argv.slice(2)) {
  const options = {
    entry:  { type: 'string',  default: 'src/index.js' },
    out:    { type: 'string',  default: 'dist/bundle.js' },
    serve:  { type: 'boolean', default: false },
    port:   { type: 'string',  default: '3000' },
    minify: { type: 'boolean', default: false },
    env:    { type: 'string',  default: '.env' },
    watch:  { type: 'boolean', default: false },
    host:   { type: 'string',  default: '127.0.0.1' },
    help:   { type: 'boolean', short: 'h', default: false }
  };

  try {
    const { values, positionals } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false
    });

    let entry = values.entry;
    if (positionals.length > 0 && values.entry === 'src/index.js') {
      entry = positionals[0];
    }

    return {
      entry,
      out:         values.out,
      serve:       Boolean(values.serve),
      watch:       Boolean(values.watch),
      port:        parseInt(values.port, 10) || 3000,
      host:        values.host || '127.0.0.1',
      minify:      Boolean(values.minify),
      env:         values.env,
      help:        Boolean(values.help),
      positionals
    };
  } catch (err) {
    logger.error(`Argument parsing error: ${err.message}`);
    printHelp();
    process.exit(1);
  }
}
