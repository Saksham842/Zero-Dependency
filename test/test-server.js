import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startDevServer, decodeWebSocketFrame, findAvailablePort } from '../src/server.js';
import { logger, colors } from '../src/cli.js';

test('Dev server HTTP, Dashboard, Stats API, and RFC 6455 WebSocket HMR', async () => {
  const port = await findAvailablePort(4321, '127.0.0.1');
  const outPath = path.join(os.tmpdir(), `zp-server-test-bundle-${Date.now()}.js`);
  const { server, broadcast, close } = await startDevServer({
    port,
    host: '127.0.0.1',
    entry: 'src/index.js',
    out: outPath,
    minify: true,
    rootDir: process.cwd()
  });

  try {
    // 1. Test Static HTTP GET /
    const html = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
      }).on('error', reject);
    });

    assert.strictEqual(html.status, 200, 'HTTP GET / must return 200');
    assert.ok(html.data.includes('__zeropack_hmr'), 'HTML must include HMR script');

    // 1b. Test Built-in Dashboard UI (/__zeropack)
    const dashboard = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/__zeropack`, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
      }).on('error', reject);
    });

    assert.strictEqual(dashboard.status, 200, 'Dashboard UI must return 200');
    assert.ok(dashboard.data.includes('ZeroPack Dashboard'), 'Dashboard UI must contain title');

    // 1c. Test Built-in Stats API (/__zeropack/stats)
    const statsRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/__zeropack/stats`, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
      }).on('error', reject);
    });

    assert.strictEqual(statsRes.status, 200, 'Stats API must return 200');
    const parsedStats = JSON.parse(statsRes.data);
    assert.ok(parsedStats.moduleCount > 0, 'Module count must be > 0');
    assert.ok(parsedStats.minifiedSize > 0, 'Minified size must be > 0');

    // 2. Test RFC 6455 WebSocket Upgrade Handshake
    const clientKey = crypto.randomBytes(16).toString('base64');
    const expectedAccept = crypto
      .createHash('sha1')
      .update(clientKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    await new Promise((resolve, reject) => {
      const req = http.request({
        port,
        host: '127.0.0.1',
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Key': clientKey,
          'Sec-WebSocket-Version': '13'
        }
      });

      req.on('upgrade', (res, socket) => {
        const acceptHeader = res.headers['sec-websocket-accept'];
        assert.strictEqual(acceptHeader, expectedAccept, 'WebSocket Accept header must match');

        socket.on('data', (buf) => {
          const frame = decodeWebSocketFrame(buf);
          if (frame && frame.text) {
            socket.destroy();
            resolve();
          }
        });

        setTimeout(() => {
          broadcast({ type: 'reload', test: true });
        }, 50);
      });

      req.on('error', reject);
      req.end();
    });
  } finally {
    await close();
    try { fs.unlinkSync(outPath); } catch (_) {}
  }
});
