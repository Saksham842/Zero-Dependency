import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import net from 'node:net';
import vm from 'node:vm';

import {
  autoDetectEntry,
  loadConfig,
  scaffoldProject,
  parseCliArgs
} from '../src/cli.js';

import {
  applyDefine,
  normalizeDefineValue,
  generateBundle
} from '../src/bundler.js';

import {
  findAvailablePort,
  isPortAvailable,
  startDevServer
} from '../src/server.js';

import { buildDependencyGraph } from '../src/parser.js';

test('autoDetectEntry finds entry points in correct precedence', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-entry-'));
  try {
    // 1. Initially nothing
    assert.strictEqual(autoDetectEntry(tmpDir), null);

    // 2. index.js
    fs.writeFileSync(path.join(tmpDir, 'index.js'), 'console.log(1);');
    assert.strictEqual(autoDetectEntry(tmpDir), 'index.js');

    // 3. src/index.js takes priority over index.js
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'console.log(2);');
    assert.strictEqual(autoDetectEntry(tmpDir), 'src/index.js');

    // 4. package.json "module" takes priority over src/index.js
    fs.writeFileSync(path.join(tmpDir, 'custom-mod.js'), 'console.log(3);');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      module: 'custom-mod.js'
    }));
    assert.strictEqual(autoDetectEntry(tmpDir), 'custom-mod.js');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scaffoldProject creates minimal starter app without overwriting existing files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-init-'));
  try {
    scaffoldProject(tmpDir);

    assert.ok(fs.existsSync(path.join(tmpDir, 'index.html')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'src', 'index.js')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'zeropack.config.json')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'package.json')));

    const indexHtml = fs.readFileSync(path.join(tmpDir, 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('<div id="app"></div>'));
    assert.ok(indexHtml.includes('/dist/bundle.js'));

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, 'zeropack.config.json'), 'utf8'));
    assert.strictEqual(config.entry, 'src/index.js');
    assert.strictEqual(config.out, 'dist/bundle.js');

    // Second run should not crash and preserve modified files
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), '// Custom code');
    scaffoldProject(tmpDir);
    assert.strictEqual(fs.readFileSync(path.join(tmpDir, 'src', 'index.js'), 'utf8'), '// Custom code');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('loadConfig reads config file or falls back gracefully', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-cfg-'));
  try {
    const missing = loadConfig(null, tmpDir);
    assert.strictEqual(missing.exists, false);

    fs.writeFileSync(path.join(tmpDir, 'zeropack.config.json'), JSON.stringify({
      port: 8088,
      minify: true,
      define: { __TEST__: true }
    }));

    const found = loadConfig(null, tmpDir);
    assert.strictEqual(found.exists, true);
    assert.strictEqual(found.config.port, 8088);
    assert.strictEqual(found.config.minify, true);
    assert.strictEqual(found.config.define.__TEST__, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('parseCliArgs zero-config defaults and subcommand support', () => {
  // 1. Zero-config with no arguments defaults to serve mode with browser opening
  const zeroArgs = parseCliArgs([]);
  assert.strictEqual(zeroArgs.serve, true);
  assert.strictEqual(zeroArgs.open, true);
  assert.strictEqual(zeroArgs.port, 3000);

  // 2. Subcommand 'init'
  const initArgs = parseCliArgs(['init', 'my-dir']);
  assert.strictEqual(initArgs.subcommand, 'init');
  assert.strictEqual(initArgs.targetDir, 'my-dir');

  // 3. Subcommand 'build'
  const buildArgs = parseCliArgs(['build', '--minify']);
  assert.strictEqual(buildArgs.subcommand, 'build');
  assert.strictEqual(buildArgs.serve, false);
  assert.strictEqual(buildArgs.minify, true);

  // 4. Subcommand 'serve' with custom port and --no-open
  const serveArgs = parseCliArgs(['serve', '--port', '4000', '--no-open']);
  assert.strictEqual(serveArgs.subcommand, 'serve');
  assert.strictEqual(serveArgs.serve, true);
  assert.strictEqual(serveArgs.port, 4000);
  assert.strictEqual(serveArgs.open, false);

  // 5. Custom defines via --define
  const defineArgs = parseCliArgs(['build', '--define', 'process.env.NODE_ENV=production', '--define.API=https://api.com']);
  assert.strictEqual(defineArgs.define['process.env.NODE_ENV'], 'production');
  assert.strictEqual(defineArgs.define['API'], 'https://api.com');
});

test('normalizeDefineValue and applyDefine replacement logic', () => {
  assert.strictEqual(normalizeDefineValue('production'), '"production"');
  assert.strictEqual(normalizeDefineValue('"production"'), '"production"');
  assert.strictEqual(normalizeDefineValue("'production'"), "'production'");
  assert.strictEqual(normalizeDefineValue('true'), 'true');
  assert.strictEqual(normalizeDefineValue(false), 'false');
  assert.strictEqual(normalizeDefineValue(42), '42');

  const source = `
    const a = process.env.NODE_ENV;
    const str = "Keep process.env.NODE_ENV inside string";
    // Comment process.env.NODE_ENV
    /* Multi-line process.env.NODE_ENV */
    const template = \`Env is \${process.env.NODE_ENV} and done\`;
    const checkIdent = my_process.env.NODE_ENV;
    const checkSuffix = process.env.NODE_ENV_DEV;
  `;

  const replaced = applyDefine(source, {
    'process.env.NODE_ENV': 'production'
  });

  assert.ok(replaced.includes('const a = "production";'));
  assert.ok(replaced.includes('const str = "Keep process.env.NODE_ENV inside string";'));
  assert.ok(replaced.includes('// Comment process.env.NODE_ENV'));
  assert.ok(replaced.includes('/* Multi-line process.env.NODE_ENV */'));
  assert.ok(replaced.includes('`Env is ${"production"} and done`'));
  assert.ok(replaced.includes('my_process.env.NODE_ENV'));
  assert.ok(replaced.includes('process.env.NODE_ENV_DEV'));
});

test('Bundle with define replacement executes cleanly in runtime VM', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-define-vm-'));
  try {
    const entry = path.join(tmpDir, 'entry.js');
    fs.writeFileSync(entry, `
      export const env = process.env.NODE_ENV;
      export const isProd = (process.env.NODE_ENV === 'production');
    `);

    const graph = buildDependencyGraph(entry, tmpDir);
    const bundle = generateBundle(graph, {
      define: {
        'process.env.NODE_ENV': 'production'
      }
    });

    const sandbox = { console };
    vm.createContext(sandbox);
    const exportsResult = vm.runInContext(bundle.code, sandbox);

    assert.strictEqual(exportsResult.env, 'production');
    assert.strictEqual(exportsResult.isProd, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('findAvailablePort detects occupied port and finds next free port', async () => {
  const server = net.createServer();
  const testPort = 59123;

  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));

  try {
    const isFree = await isPortAvailable(testPort, '127.0.0.1');
    assert.strictEqual(isFree, false);

    const nextPort = await findAvailablePort(testPort, '127.0.0.1');
    assert.ok(nextPort > testPort, `Expected ${nextPort} > ${testPort}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Dev Server SPA fallback routing and directory traversal security', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-spa-'));
  try {
    const indexHtml = `<!DOCTYPE html><html><body><div id="root">App Root</div></body></html>`;
    fs.writeFileSync(path.join(tmpDir, 'index.html'), indexHtml);

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'export const ready = true;');

    const freePort = await findAvailablePort(61234, '127.0.0.1');
    const devServer = await startDevServer({
      port: freePort,
      host: '127.0.0.1',
      autoPort: true,
      open: false,
      entry: path.join(tmpDir, 'src', 'index.js'),
      out: path.join(tmpDir, 'dist', 'bundle.js'),
      rootDir: tmpDir
    });

    const get = (urlPath, headers = {}) => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: devServer.port,
          path: urlPath,
          method: 'GET',
          headers
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        req.end();
      });
    };

    // 1. Root route serves index.html with HMR injection
    const rootRes = await get('/');
    assert.strictEqual(rootRes.status, 200);
    assert.ok(rootRes.body.includes('<div id="root">App Root</div>'));
    assert.ok(rootRes.body.includes('__zeropack_hmr'));

    // 2. SPA Route (/users/profile/edit) without file extension serves index.html with 200 OK
    const spaRes = await get('/users/profile/edit');
    assert.strictEqual(spaRes.status, 200);
    assert.ok(spaRes.body.includes('<div id="root">App Root</div>'));
    assert.ok(spaRes.body.includes('__zeropack_hmr'));

    // 3. Request asking for text/html fallback
    const htmlReq = await get('/non-existent-page', { 'Accept': 'text/html,application/xhtml+xml' });
    assert.strictEqual(htmlReq.status, 200);
    assert.ok(htmlReq.body.includes('<div id="root">App Root</div>'));

    // 4. Missing resource with an extension (/missing-image.png) returns 404
    const notFound = await get('/missing-image.png');
    assert.strictEqual(notFound.status, 404);

    // 5. Directory traversal attempt (/../) is blocked with 403 Forbidden
    const traversal = await get('/../../etc/passwd');
    assert.strictEqual(traversal.status, 403);
    assert.ok(traversal.body.includes('403 Forbidden'));

    await devServer.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
