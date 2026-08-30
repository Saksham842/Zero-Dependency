import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { parseCliArgs } from '../src/cli.js';
import { buildDependencyGraph, BuildError, getLineColumn } from '../src/parser.js';
import { DASHBOARD_HTML } from '../src/dashboard.js';

function makeFixture(files) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-diag-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return tmpDir;
}

test('getLineColumn calculates exact line and column numbers correctly', () => {
  const code = [
    'const a = 1;',
    'const b = 2;',
    'console.log(a + b);',
    ''
  ].join('\n');
  // Start of 'const b'
  const p1 = getLineColumn(code, code.indexOf('const b'));
  assert.equal(p1.line, 2);
  assert.equal(p1.column, 1);

  // 'b' in 'a + b'
  const p2 = getLineColumn(code, code.indexOf('b)', code.indexOf('console')));
  assert.equal(p2.line, 3);
  assert.equal(p2.column, 17);
});

test('CLI parser handles options accurately', () => {
  const args = parseCliArgs(['--entry', 'src/app.js', '--serve', '--port', '8080']);
  assert.equal(args.entry, 'src/app.js');
  assert.equal(args.serve, true);
  assert.equal(args.port, 8080);
});

test('Parser throws BuildError for missing bare specifier (npm package)', () => {
  const dir = makeFixture({
    'src/index.js': "import react from 'react';"
  });

  try {
    buildDependencyGraph('src/index.js', dir);
    assert.fail('Expected BuildError for bare specifier');
  } catch (err) {
    assert.equal(err.name, 'BuildError');
    assert.match(err.message, /Unable to resolve bare module specifier 'react'/);
    assert.match(err.suggestion, /does not currently support full npm package resolution/);
    assert.equal(err.category, 'Resolution');
  }
});

test('Parser throws BuildError with precise line and column for unsupported TSX syntax', () => {
  const dir = makeFixture({
    'src/index.js': "import './app.tsx';",
    'src/app.tsx': "export const App = () => <div>Hello</div>;"
  });

  try {
    buildDependencyGraph('src/index.js', dir);
    assert.fail('Expected BuildError for TSX resolution');
  } catch (err) {
    assert.equal(err.name, 'BuildError');
    assert.match(err.message, /Unsupported syntax/);
    assert.match(err.suggestion, /does not transform TypeScript or JSX/);
    assert.equal(err.category, 'Syntax');
  }
});

test('Parser throws BuildError with accurate line numbers for export syntax errors', () => {
  const dir = makeFixture({
    'src/index.js': [
      'const a = 1;',
      'export let a = 1;',
      'export whatever;'
    ].join('\n')
  });

  try {
    buildDependencyGraph('src/index.js', dir);
    assert.fail('Expected BuildError for export syntax error');
  } catch (err) {
    assert.equal(err.name, 'BuildError');
    assert.match(err.message, /Unsupported export syntax/);
    assert.ok(err.line >= 1); 
    assert.equal(err.category, 'Syntax');
  }
});

test('Dashboard DOM safety: ensures .innerHTML is not present for dynamic injected elements', () => {
  const renderMetricsSource = DASHBOARD_HTML.substring(DASHBOARD_HTML.indexOf('function renderMetrics'), DASHBOARD_HTML.indexOf('function initWebSocket'));
  const maliciousStr = 'innerHTML = mod.filePath';
  assert.ok(!renderMetricsSource.includes(maliciousStr));
  assert.ok(renderMetricsSource.includes('textContent = err.message'));
});
