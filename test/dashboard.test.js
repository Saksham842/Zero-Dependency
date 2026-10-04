import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

import { buildDependencyGraph } from '../src/parser.js';
import { generateBundle } from '../src/bundler.js';
import { startDevServer, findAvailablePort, decodeWebSocketFrame } from '../src/server.js';
import { DASHBOARD_HTML } from '../src/dashboard.js';

test('Gzip size calculation in bundle and module statistics', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-gzip-'));
  try {
    const entry = path.join(tmpDir, 'entry.js');
    const helper = path.join(tmpDir, 'helper.js');

    fs.writeFileSync(helper, `
      export function generateReport(items) {
        return items.map(i => 'Item #' + i.id + ': ' + i.name).join('\\n');
      }
    `);

    fs.writeFileSync(entry, `
      import { generateReport } from './helper.js';
      const items = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      console.log(generateReport(items));
    `);

    const graph = buildDependencyGraph(entry, tmpDir);
    const bundle = generateBundle(graph, { minify: true });

    assert.ok(bundle.stats.gzipSize > 0, 'Bundle gzipSize should be > 0');
    assert.ok(typeof bundle.stats.gzipRatio === 'string', 'gzipRatio should be string percentage');
    assert.ok(bundle.stats.modules.length >= 2, 'Should have at least 2 modules in stats');

    for (const mod of bundle.stats.modules) {
      assert.ok(mod.gzipSize > 0, `Module ${mod.filePath} should have gzipSize > 0`);
      assert.ok(mod.size > 0, `Module ${mod.filePath} should have raw size > 0`);
    }

    // Verify gzip calculation matches node:zlib
    const expectedGzip = zlib.gzipSync(Buffer.from(bundle.code, 'utf8')).length;
    assert.strictEqual(bundle.stats.gzipSize, expectedGzip);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Topology graph data structure for SVG rendering', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-graph-'));
  try {
    const a = path.join(tmpDir, 'a.js');
    const b = path.join(tmpDir, 'b.js');
    fs.writeFileSync(b, 'export const val = 42;');
    fs.writeFileSync(a, 'import { val } from "./b.js"; console.log(val);');

    const graph = buildDependencyGraph(a, tmpDir);
    const bundle = generateBundle(graph);

    assert.ok(bundle.stats.graph, 'Bundle should contain graph data');
    assert.ok(Array.isArray(bundle.stats.graph.nodes), 'Graph should have nodes array');
    assert.ok(Array.isArray(bundle.stats.graph.links), 'Graph should have links array');

    assert.strictEqual(bundle.stats.graph.nodes.length, 2);
    assert.strictEqual(bundle.stats.graph.links.length, 1);

    const link = bundle.stats.graph.links[0];
    assert.strictEqual(link.specifier, './b.js');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Dashboard HTML contains zero CDN scripts and required views', () => {
  assert.ok(DASHBOARD_HTML.includes('ZeroPack Dashboard'));
  assert.ok(DASHBOARD_HTML.includes('id="svg-graph"'));
  assert.ok(DASHBOARD_HTML.includes('id="treemap-container"'));
  assert.ok(DASHBOARD_HTML.includes('id="timeline-list"'));
  assert.ok(DASHBOARD_HTML.includes('id="log-console"'));

  // Strictly NO external script tags or CDNs
  assert.strictEqual(DASHBOARD_HTML.includes('<script src="http'), false);
  assert.strictEqual(DASHBOARD_HTML.includes('<link rel="stylesheet" href="http'), false);
});

test('Dev server exposes buildHistory, logHistory, and graph at /__zeropack/stats', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-stats-'));
  try {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'console.log("hello dashboard");');
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html><body>Hello</body></html>');

    const port = await findAvailablePort(62345, '127.0.0.1');
    const devServer = await startDevServer({
      port,
      host: '127.0.0.1',
      autoPort: true,
      open: false,
      entry: path.join(tmpDir, 'src', 'index.js'),
      out: path.join(tmpDir, 'dist', 'bundle.js'),
      rootDir: tmpDir
    });

    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/__zeropack/stats`, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(data) }));
      }).on('error', reject);
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.buildHistory), 'buildHistory should be an array');
    assert.ok(res.body.buildHistory.length >= 1, 'buildHistory should have initial build');
    assert.strictEqual(res.body.buildHistory[0].status, 'success');
    assert.ok(Array.isArray(res.body.logHistory), 'logHistory should be an array');
    assert.ok(res.body.graph && res.body.graph.nodes, 'graph nodes should exist');

    await devServer.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Dev server WebSocket client script includes Error Overlay and CSS Hot-Swap logic', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-overlay-'));
  try {
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html><head><link rel="stylesheet" href="/style.css"></head><body><h1>Test</h1></body></html>');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'export const x = 1;');

    const port = await findAvailablePort(63456, '127.0.0.1');
    const devServer = await startDevServer({
      port,
      host: '127.0.0.1',
      autoPort: true,
      open: false,
      entry: path.join(tmpDir, 'src', 'index.js'),
      out: path.join(tmpDir, 'dist', 'bundle.js'),
      rootDir: tmpDir
    });

    const resHtml = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve(data));
      }).on('error', reject);
    });

    assert.ok(resHtml.includes('__zeropack_error_overlay'), 'Should include error overlay element logic');
    assert.ok(resHtml.includes('updateCss'), 'Should include CSS hot-swap updateCss function');
    assert.ok(resHtml.includes('css-update'), 'Should listen for css-update WebSocket frames');
    assert.ok(resHtml.includes('BUILD ERROR'), 'Should render BUILD ERROR badge');

    await devServer.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
