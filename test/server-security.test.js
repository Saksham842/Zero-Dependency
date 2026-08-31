import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { startDevServer } from '../src/server.js';
import { resolveStaticFilePath, isPathInsideRoot } from '../src/server-static.js';

function makeStaticFixture() {
  const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-static-parent-'));
  const rootDir = path.join(parentDir, 'site');
  fs.mkdirSync(path.join(rootDir, 'public', 'nested'), { recursive: true });
  fs.writeFileSync(path.join(parentDir, 'secret.txt'), 'THIS_IS_A_SECRET_FILE', 'utf8');
  fs.writeFileSync(path.join(rootDir, 'public', 'index.html'), '<!doctype html><div>ok</div>', 'utf8');
  fs.writeFileSync(path.join(rootDir, 'public', 'nested', 'page.html'), '<!doctype html><div>nested</div>', 'utf8');
  fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'index.js'), 'globalThis.__ok = true;', 'utf8');
  return { rootDir };
}

function get(port, pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ port, host: '127.0.0.1', path: pathname, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

test('static path resolver keeps candidates inside their static roots', () => {
  const { rootDir } = makeStaticFixture();

  assert.equal(isPathInsideRoot(rootDir, path.join(rootDir, 'public', 'index.html')), true);
  assert.equal(isPathInsideRoot(rootDir, path.join(rootDir, '..', 'secret.txt')), false);
  assert.equal(resolveStaticFilePath(rootDir, '/index.html'), path.join(rootDir, 'public', 'index.html'));
  assert.equal(resolveStaticFilePath(rootDir, '/../secret.txt'), null);
  assert.equal(resolveStaticFilePath(rootDir, '/..\\secret.txt'), null);
});

test('dev server serves legitimate files and rejects traversal attempts', async () => {
  const { rootDir } = makeStaticFixture();
  const { server, close } = await startDevServer({
    port: 0,
    rootDir,
    entry: 'src/index.js',
    out: path.join(rootDir, 'dist', 'bundle.js')
  });

  const address = server.address();

  try {
    const index = await get(address.port, '/index.html');
    const nested = await get(address.port, '/nested/page.html');
    const plainTraversal = await get(address.port, '/../secret.txt');
    const encodedTraversal = await get(address.port, '/%2e%2e/secret.txt');
    const encodedBackslashTraversal = await get(address.port, '/..%5csecret.txt');

    assert.equal(index.statusCode, 200);
    assert.match(index.body, /ok/);
    assert.equal(nested.statusCode, 200);
    assert.match(nested.body, /nested/);
    assert.notEqual(plainTraversal.statusCode, 200);
    assert.notEqual(encodedTraversal.statusCode, 200);
    assert.notEqual(encodedBackslashTraversal.statusCode, 200);
    assert.doesNotMatch(plainTraversal.body, /THIS_IS_A_SECRET_FILE/);
    assert.doesNotMatch(encodedTraversal.body, /THIS_IS_A_SECRET_FILE/);
    assert.doesNotMatch(encodedBackslashTraversal.body, /THIS_IS_A_SECRET_FILE/);
  } finally {
    await close();
  }
});
