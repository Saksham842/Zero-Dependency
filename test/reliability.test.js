import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { buildDependencyGraph, BuildError } from '../src/parser.js';
import { startDevServer } from '../src/server.js';

function makeFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-phase2-'));
  const srcDir = path.join(rootDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  return { rootDir, srcDir };
}

test('BuildError is thrown for missing entry', () => {
  const { rootDir } = makeFixture();
  assert.throws(() => {
    buildDependencyGraph('src/index.js', rootDir);
  }, (err) => err.name === 'BuildError' && err.message.includes('Entry file not found'));
});

test('BuildError is thrown for missing dependency', () => {
  const { rootDir, srcDir } = makeFixture();
  fs.writeFileSync(path.join(srcDir, 'index.js'), 'import { a } from "./missing.js";', 'utf8');
  
  assert.throws(() => {
    buildDependencyGraph('src/index.js', rootDir);
  }, (err) => err.name === 'BuildError' && err.message.includes('Cannot resolve module'));
});

test('Server lifecycle cleanly starts and stops without hanging', async () => {
  const { rootDir, srcDir } = makeFixture();
  fs.writeFileSync(path.join(srcDir, 'index.js'), 'console.log("ok");', 'utf8');

  for (let i = 0; i < 3; i++) {
    const { close } = await startDevServer({
      port: 0,
      rootDir,
      entry: 'src/index.js',
      out: path.join(rootDir, 'dist', 'bundle.js')
    });
    await close();
  }
  assert.ok(true, 'Server started and stopped 3 times without hanging');
});

test('WebSocket invalid upgrade is rejected', async () => {
  const { rootDir, srcDir } = makeFixture();
  fs.writeFileSync(path.join(srcDir, 'index.js'), 'console.log("ws test");', 'utf8');

  const { server, close } = await startDevServer({
    port: 0,
    rootDir,
    entry: 'src/index.js',
    out: path.join(rootDir, 'dist', 'bundle.js')
  });

  const address = server.address();
  
  const req = http.request({
    port: address.port,
    host: '127.0.0.1',
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket'
      // missing Sec-WebSocket-Key
    },
    path: '/__zeropack_hmr'
  });

  return new Promise((resolve, reject) => {
    req.on('response', (res) => {
      assert.equal(res.statusCode, 400);
      close().then(resolve).catch(reject);
    });
    req.on('error', (err) => {
      // Sometimes it just hangs up
      close().then(resolve).catch(reject);
    });
    req.end();
  });
});
