/**
 * @module server
 * @description Native HTTP dev server, RFC 6455 WebSocket HMR engine, and
 * ANSI TUI dashboard for ZeroPack.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger, colors } from './cli.js';
import { buildDependencyGraph } from './parser.js';
import { build as graphBuild, rebuild as graphRebuild } from './graph.js';
import { bundleToFile } from './bundler.js';
import { DASHBOARD_HTML } from './dashboard.js';

import { getMimeType, isPathInsideRoot, resolveStaticFilePath } from './server-static.js';
import { encodeWebSocketFrame, decodeWebSocketFrame } from './server-ws.js';
import { tui, _tuiPush, renderTUI } from './server-tui.js';

import { handleHttpRequest } from './server-http.js';
import { handleWsUpgrade } from './server-ws-upgrade.js';
import { createWatcher } from './server-watcher.js';

/**
 * Starts the ZeroPack HTTP development server.
 * @returns {Promise<{ server: http.Server, broadcast: Function, close: Function }>}
 */
export async function startDevServer(options = {}) {
  const {
    port = 3000,
    entry = 'src/index.js',
    out = 'dist/bundle.js',
    minify = false,
    rootDir = process.cwd(),
    host = '127.0.0.1',
    stats: initialStats = null
  } = options;

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

  let isBuilding = false;
  let pendingBuild = false;
  let pendingPathsForNextBuild = new Set();
  let httpRequestLog = [];
  let isFirstBuild = true;

  function logActivity(msg) {
    _tuiPush(msg);
    renderTUI(currentStats);
  }

  // Initial / Rebuild compilation
  function compile(changedPaths = null) {
    isBuilding = true;
    broadcast({ type: 'status', status: 'building' });
    try {
      let graph;
      if (isFirstBuild || changedPaths === null) {
        graph = graphBuild(entry, rootDir);
        isFirstBuild = false;
      } else {
        graph = graphRebuild(entry, changedPaths);
      }
      
      const outputPath = path.isAbsolute(out) ? out : path.join(rootDir, out);
      const result = bundleToFile(graph, outputPath, { minify, hmr: true });
      result.stats.status = 'success';
      currentStats = result.stats;
      logActivity(`\u26a1 Rebuilt  ${colors.green(result.size + ' B')}  ${colors.gray(result.hash.slice(0, 10))}`);
      broadcast({ type: 'status', status: 'success', stats: currentStats });
      return result;
    } catch (err) {
      logger.error(`Rebuild error: ${err.message}`);
      let errorPayload;
      if (err.name === 'BuildError') {
        errorPayload = {
          message: err.message,
          file: err.file,
          line: err.line,
          column: err.column,
          suggestion: err.suggestion,
          category: err.category
        };
      } else {
        errorPayload = { message: err.message };
      }
      
      if (currentStats) {
        currentStats.status = 'failed';
        currentStats.error = errorPayload;
      } else {
        currentStats = { status: 'failed', error: errorPayload };
      }
      broadcast({ type: 'status', status: 'failed', error: errorPayload });
      return null;
    } finally {
      isBuilding = false;
      if (pendingBuild) {
        pendingBuild = false;
        const paths = Array.from(pendingPathsForNextBuild);
        pendingPathsForNextBuild.clear();
        process.nextTick(() => {
          const success = compile(paths.length > 0 ? paths : null);
          if (success) {
            broadcast({ type: 'reload', file: 'pending-rebuild', timestamp: Date.now() });
            logger.hmr(`Dispatched ${colors.green('RELOAD')} frame to ${colors.bold(activeSockets.size)} client(s)`);
          }
        });
      }
    }
  }

  if (!currentStats) {
    compile();
  }

  // HTTP Server
  const server = http.createServer((req, res) => {
    handleHttpRequest(req, res, { port, rootDir, currentStats, logActivity });
  });

  // RFC 6455 WebSocket Upgrade Handler
  server.on('upgrade', (req, socket, head) => {
    handleWsUpgrade(req, socket, head, { activeSockets });
  });

  const watchDir = path.resolve(rootDir, 'src');
  const publicDir = path.resolve(rootDir, 'public');

  const watcher = createWatcher({
    watchDir,
    publicDir,
    onFileChange: (paths) => {
      if (paths.length === 0) return;
      if (isBuilding) {
        pendingBuild = true;
        for (const p of paths) pendingPathsForNextBuild.add(p);
        return;
      }
      const filename = path.basename(paths[0]);
      logger.hmr(`File change detected: ${colors.cyan(filename)}. Rebundling...`);
      const success = compile(paths);
      if (success) {
        broadcast({ type: 'reload', file: filename, timestamp: Date.now() });
        logger.hmr(`Dispatched ${colors.green('RELOAD')} frame to ${colors.bold(activeSockets.size)} client(s)`);
      }
    }
  });

  function closeServer() {
    watcher.close();
    for (const s of activeSockets) {
      try { s.destroy(); } catch(e) {}
    }
    return new Promise((resolve) => server.close(resolve));
  }

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      watcher.start();

      const url     = `http://${host}:${actualPort}/`;
      const dashUrl = `http://${host}:${actualPort}/__zeropack`;
      const wsUrl   = `ws://${host}:${actualPort}/__zeropack_hmr`;

      // First render with fresh URLs
      if (process.stdout.isTTY) tui.hide();
      console.log(''); // blank line before TUI
      renderTUI(currentStats, { url, dashUrl, wsUrl });
      _tuiPush(`Server started on port ${actualPort}`);
      renderTUI(currentStats);

      // Restore cursor on exit
      const onExit = () => { if (process.stdout.isTTY) tui.show(); process.exit(0); };
      process.once('SIGINT', onExit);
      process.once('SIGTERM', onExit);

      resolve({ server, broadcast, close: closeServer });
    });

    server.on('error', (err) => {
      if (process.stdout.isTTY) tui.show();
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Please specify another port with --port`);
      } else {
        logger.error(`Dev server error: ${err.message}`);
      }
      reject(err);
    });
  });
}
