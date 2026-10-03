import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { exec } from 'node:child_process';
import { logger, colors } from './cli.js';
import { buildDependencyGraph } from './parser.js';
import { bundleToFile } from './bundler.js';
import { DASHBOARD_HTML } from './dashboard.js';

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
