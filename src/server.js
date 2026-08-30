import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger, colors } from './cli.js';
import { buildDependencyGraph } from './parser.js';
import { bundleToFile } from './bundler.js';
import { DASHBOARD_HTML } from './dashboard.js';

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

export function isPathInsideRoot(rootDir, candidatePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveStaticFilePath(rootDir, requestPathname) {
  let pathname = requestPathname || '/';
  pathname = pathname.replace(/\\/g, '/');

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const relativePath = pathname.replace(/^\/+/, '');
  const staticRoots = [rootDir, path.join(rootDir, 'public'), path.join(rootDir, 'dist')];

  for (const staticRoot of staticRoots) {
    const candidatePath = path.resolve(staticRoot, relativePath);
    if (!isPathInsideRoot(staticRoot, candidatePath)) {
      continue;
    }
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return null;
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

  // Initial / Rebuild compilation
  function compile() {
    isBuilding = true;
    broadcast({ type: 'status', status: 'building' });
    try {
      const graph = buildDependencyGraph(entry, rootDir);
      const outputPath = path.isAbsolute(out) ? out : path.join(rootDir, out);
      const result = bundleToFile(graph, outputPath, { minify, hmr: true });
      result.stats.status = 'success';
      currentStats = result.stats;
      logger.hmr(`Rebuilt bundle: ${colors.green(result.size + ' bytes')} (${colors.gray(result.hash.slice(0, 10))})`);
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
        process.nextTick(() => {
          const success = compile();
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
    let pathname;
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${port}`);
      pathname = decodeURIComponent(parsedUrl.pathname);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }

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

    const filePath = resolveStaticFilePath(rootDir, pathname);

    // Serve file if exists
    if (filePath) {
      const mimeType = getMimeType(filePath);
      let content = fs.readFileSync(filePath);

      // Auto-inject WebSocket client script into HTML files if not already present
      if (mimeType.startsWith('text/html')) {
        let html = content.toString('utf8');
        if (!html.includes('__zeropack_hmr')) {
          const hmrScript = `
<script>
(function() {
  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var ws = new WebSocket(protocol + '//' + window.location.host + '/__zeropack_hmr');
  ws.onopen = function() { console.log('[ZeroPack DevServer] Connected to live reload'); };
  ws.onmessage = function(e) {
    var data = JSON.parse(e.data);
    if (data.type === 'reload') {
      console.log('[ZeroPack DevServer] Reloading page...');
      window.location.reload();
    }
  };
})();
</script>`;
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${hmrScript}</body>`);
          } else {
            html += hmrScript;
          }
          content = Buffer.from(html, 'utf8');
        }
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

    // If request is for an HTML page or root fallback
    const indexHtmlPath = path.join(rootDir, 'index.html');
    const publicIndexHtml = path.join(rootDir, 'public', 'index.html');
    const defaultHtml = fs.existsSync(indexHtmlPath) ? indexHtmlPath : (fs.existsSync(publicIndexHtml) ? publicIndexHtml : null);

    if (defaultHtml && (req.headers.accept || '').includes('text/html')) {
      const html = fs.readFileSync(defaultHtml, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${pathname}`);
  });

  // RFC 6455 WebSocket Upgrade Handler
  server.on('upgrade', (req, socket, head) => {
    // Check HTTP method and valid URL
    if (req.method !== 'GET') {
      socket.write('HTTP/1.1 405 Method Not Allowed\r\n\r\n');
      socket.destroy();
      return;
    }
    if (req.url !== '/__zeropack_hmr') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    // Check required upgrade headers
    if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const secKey = req.headers['sec-websocket-key'];
    if (!secKey) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
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
      try {
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
      } catch (err) {
        // Malformed frame or decoding error -> destroy socket securely
        activeSockets.delete(socket);
        socket.destroy();
      }
    });

    socket.on('close', () => {
      activeSockets.delete(socket);
    });

    socket.on('error', () => {
      activeSockets.delete(socket);
      socket.destroy();
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
      debounceTimer = null;
      if (isBuilding) {
        pendingBuild = true;
        return;
      }
      logger.hmr(`File change detected: ${colors.cyan(filename)}. Rebundling...`);
      const success = compile();
      if (success) {
        broadcast({ type: 'reload', file: filename, timestamp: Date.now() });
        logger.hmr(`Dispatched ${colors.green('RELOAD')} frame to ${colors.bold(activeSockets.size)} client(s)`);
      }
    }, 100);
  }

  const watchers = [];

  function startWatchers() {
    if (fs.existsSync(watchDir)) {
      const w1 = fs.watch(watchDir, { recursive: true }, handleWatchEvent);
      w1.on('error', (err) => logger.warn(`Watcher error on ${watchDir}: ${err.message}`));
      watchers.push(w1);
    }
    if (fs.existsSync(publicDir)) {
      const w2 = fs.watch(publicDir, { recursive: true }, handleWatchEvent);
      w2.on('error', (err) => logger.warn(`Watcher error on ${publicDir}: ${err.message}`));
      watchers.push(w2);
    }
  }

  function closeServer() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    for (const w of watchers) {
      try { w.close(); } catch(e) {}
    }
    for (const s of activeSockets) {
      try { s.destroy(); } catch(e) {}
    }
    return new Promise((resolve) => server.close(resolve));
  }

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      startWatchers();
      logger.server(`Development server running at: ${colors.green(colors.bold(`http://${host}:${actualPort}/`))}`);
      logger.server(`Developer Dashboard active at: ${colors.brightCyan(colors.bold(`http://${host}:${actualPort}/__zeropack`))}`);
      logger.server(`HMR WebSocket endpoint active at: ${colors.cyan(colors.bold(`ws://${host}:${actualPort}/__zeropack_hmr`))}`);
      logger.info(`Watching directory: ${colors.gray(watchDir)}`);
      resolve({ server, broadcast, close: closeServer });
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
