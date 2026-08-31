/**
 * @module cli
 * @description ZeroPack CLI entry-point.
 *
 * Responsibilities:
 *  1. Terminal logger — ANSI-coloured, zero external deps (`colors`, `logger`).
 *  2. Native `.env` reader — pure `node:fs` line-stream parser.
 *  3. ASCII banner + help menu generator.
 *  4. CLI argument parser via `node:util.parseArgs`.
 *  5. Build / serve / watch lifecycle orchestrator.
 *
 * Replaces (npm ecosystem):
 *  - `chalk` / `picocolors`  → raw ANSI escape codes
 *  - `dotenv`                → `node:fs` + line parser
 *  - `commander` / `yargs`   → `node:util.parseArgs`
 *
 * @requires node:fs
 * @requires node:path
 * @requires node:process
 * @requires node:util
 */
import path from 'node:path';
import process from 'node:process';
import { colors, logger } from './cli-logger.js';
import { loadEnv } from './cli-env.js';
import { printBanner, printHelp, parseCliArgs } from './cli-help.js';

export { colors, logger } from './cli-logger.js';
export { loadEnv } from './cli-env.js';
export { printBanner, printHelp, parseCliArgs } from './cli-help.js';

/**
 * Main CLI entry-point. Orchestrates the full build/serve/watch lifecycle:
 *
 *  1. Parse CLI arguments.
 *  2. Load `.env` file (if present).
 *  3. Import bundler modules lazily (avoids circular deps in standalone mode).
 *  4. Build the initial bundle.
 *  5. Start the dev server (`--serve`) or file watcher (`--watch`).
 *
 * All import/module errors emit a structured `BuildError` report to stderr
 * before exiting with code 1.
 *
 * @param {string[]} [args=process.argv.slice(2)] Raw CLI argument vector.
 * @returns {Promise<void>}
 */
export async function runCli(args = process.argv.slice(2)) {
  const config = parseCliArgs(args);

  if (config.help) {
    printHelp();
    return;
  }

  printBanner();

  const envResult = loadEnv(config.env);
  if (envResult.loaded) {
    logger.info(`Loaded ${colors.bold(envResult.count)} environment variables from ${colors.dim(envResult.path)}`);
  }

  const { build: buildDependencyGraph } = await import('./graph.js');
  const { bundleToFile }                = await import('./bundler.js');

  const startTime = performance.now();
  logger.build(`Target Entry: ${colors.cyan(config.entry)}`);
  logger.build(`Output Path:  ${colors.cyan(config.out)}`);
  logger.build(`Minification: ${config.minify ? colors.green('ENABLED') : colors.gray('DISABLED')}`);

  try {
    const graph  = buildDependencyGraph(config.entry);
    const result = bundleToFile(graph, config.out, {
      minify:    config.minify,
      entryPath: config.entry
    });

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.success(`Bundle generated in ${colors.bold(elapsed + 'ms')} (${colors.cyan(result.size + ' bytes')}) [${colors.green(result.stats.compressionRatio + ' saved')}]`);
    logger.info(`SHA-256 Hash: ${colors.gray(result.hash)}`);

    if (config.serve) {
      const { startDevServer } = await import('./server.js');
      await startDevServer({
        port:    config.port,
        host:    config.host,
        entry:   config.entry,
        out:     config.out,
        minify:  config.minify,
        rootDir: process.cwd(),
        stats:   result.stats
      });
    } else if (config.watch) {
      const fsModule = await import('node:fs');
      const watchDir = path.resolve(process.cwd(), path.dirname(config.entry));
      logger.info(`Watching ${colors.cyan(watchDir)} for changes...`);

      let debounceTimer = null;

      const watcher = fsModule.default.watch(watchDir, { recursive: true }, (_event, filename) => {
        if (!filename || filename.endsWith('bundle.js')) return;
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          debounceTimer = null;
          logger.hmr(`File changed: ${colors.cyan(filename)} — rebuilding...`);
          try {
            const t = performance.now();
            const g = buildDependencyGraph(config.entry);
            const r = bundleToFile(g, config.out, { minify: config.minify });
            logger.success(`Rebuilt in ${colors.bold((performance.now() - t).toFixed(0) + 'ms')} (${colors.cyan(r.size + ' bytes')})`);
          } catch (err) {
            logger.error(`Watch rebuild failed: ${err.message}`);
          }
        }, 100);
      });

      watcher.on('error', (err) => logger.warn(`Watcher error: ${err.message}`));
      process.on('SIGINT', () => { watcher.close(); process.exit(0); });
    }
  } catch (error) {
    if (error.name === 'BuildError') {
      console.log('');
      logger.error(`${colors.bgRed(` ${error.category} Failed `)}`);
      console.log('');
      console.log(`  ${colors.bold('What:')}   ${colors.white(error.message)}`);

      let loc = error.file;
      if (error.line)   loc += `:${error.line}`;
      if (error.column) loc += `:${error.column}`;
      console.log(`  ${colors.bold('Where:')}  ${colors.cyan(loc)}`);

      if (error.suggestion) {
        console.log(`  ${colors.bold('Action:')} ${colors.yellow(error.suggestion)}`);
      }
      console.log('');
    } else {
      logger.error(`Build failed: ${error.message}`);
    }

    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('cli.js') || process.argv[1].endsWith('zeropack.js'));

if (isMain) {
  runCli().catch((err) => {
    logger.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
