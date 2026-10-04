import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';

import { startDevServer, findAvailablePort } from '../src/server.js';

test('.env hygiene and configuration files are properly formatted', () => {
  const root = process.cwd();

  // 1. .env.example must exist
  assert.ok(fs.existsSync(path.join(root, '.env.example')), '.env.example must exist');
  const exampleContent = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.ok(exampleContent.includes('APP_NAME='), '.env.example should contain sample keys');

  // 2. .gitignore must ignore .env
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  const lines = gitignore.split(/\r?\n/).map(l => l.trim());
  assert.ok(lines.includes('.env'), '.gitignore must explicitly include .env');

  // 3. CONTRIBUTING.md must exist and specify zero dependencies
  assert.ok(fs.existsSync(path.join(root, 'CONTRIBUTING.md')), 'CONTRIBUTING.md must exist');
  const contributing = fs.readFileSync(path.join(root, 'CONTRIBUTING.md'), 'utf8');
  assert.ok(contributing.includes('Zero Dependencies'));

  // 4. CI workflow file must exist
  assert.ok(fs.existsSync(path.join(root, '.github', 'workflows', 'ci.yml')), 'CI workflow must exist');
});

test('WebSocket Origin check blocks untrusted cross-origin upgrades', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-origin-'));
  try {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'export const a = 1;');
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html><body>Origin Test</body></html>');

    const port = await findAvailablePort(64100, '127.0.0.1');
    const devServer = await startDevServer({
      port,
      host: '127.0.0.1',
      autoPort: true,
      open: false,
      entry: path.join(tmpDir, 'src', 'index.js'),
      out: path.join(tmpDir, 'dist', 'bundle.js'),
      rootDir: tmpDir
    });

    const clientKey = crypto.randomBytes(16).toString('base64');

    // 1. Untrusted origin (e.g. evil-attacker.com) -> must be rejected with 403 Forbidden
    const rejectedStatus = await new Promise((resolve) => {
      const req = http.request({
        port,
        host: '127.0.0.1',
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Key': clientKey,
          'Sec-WebSocket-Version': '13',
          'Origin': 'https://evil-attacker.com'
        }
      });
      req.on('response', (res) => {
        resolve(res.statusCode);
      });
      req.on('upgrade', () => {
        resolve(101);
      });
      req.on('error', () => {
        resolve(403);
      });
      req.end();
    });

    assert.strictEqual(rejectedStatus, 403, 'Untrusted origin should be rejected with 403');

    // 2. Trusted origin (e.g. http://localhost:PORT) -> must be accepted with 101 Switching Protocols
    const acceptedStatus = await new Promise((resolve) => {
      const req = http.request({
        port,
        host: '127.0.0.1',
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Key': clientKey,
          'Sec-WebSocket-Version': '13',
          'Origin': `http://localhost:${port}`
        }
      });
      req.on('upgrade', (res, socket) => {
        socket.destroy();
        resolve(101);
      });
      req.on('response', (res) => {
        resolve(res.statusCode);
      });
      req.on('error', () => {
        resolve(0);
      });
      req.end();
    });

    assert.strictEqual(acceptedStatus, 101, 'Trusted origin should be upgraded to 101');

    await devServer.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
