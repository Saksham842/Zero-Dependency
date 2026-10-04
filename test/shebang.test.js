import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { buildDependencyGraph } from '../src/parser.js';
import { generateBundle, minifyCode } from '../src/bundler.js';

test('Shebang: standalone zeropack.js has #!/usr/bin/env node as the very first line', () => {
  const zeropackPath = path.join(process.cwd(), 'zeropack.js');
  assert.ok(fs.existsSync(zeropackPath), 'zeropack.js should exist');
  const content = fs.readFileSync(zeropackPath, 'utf8');
  const firstLine = content.split(/\r?\n/)[0].trim();
  assert.strictEqual(firstLine, '#!/usr/bin/env node', 'Standalone zeropack.js must have shebang on line 1');
});

test('Shebang: bin entry keeps shebang after unminified and minified builds', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-shebang-'));
  try {
    const entryFile = path.join(tmpDir, 'cli.js');
    fs.writeFileSync(entryFile, `#!/usr/bin/env node
export const version = '1.0.0';
export function run() {
  return 'running v' + version;
}
`);

    const graph = buildDependencyGraph(entryFile, tmpDir);

    // 1. Unminified bundle
    const unminified = generateBundle(graph, { minify: false });
    const unminifiedFirstLine = unminified.code.split(/\r?\n/)[0].trim();
    assert.strictEqual(unminifiedFirstLine, '#!/usr/bin/env node', 'Unminified bundle must keep shebang on line 1');

    // 2. Minified bundle
    const minified = generateBundle(graph, { minify: true });
    const minifiedFirstLine = minified.code.split(/\r?\n/)[0].trim();
    assert.strictEqual(minifiedFirstLine, '#!/usr/bin/env node', 'Minified bundle must keep shebang on line 1');

    // 3. Execution check: both run cleanly in vm
    for (const bundle of [unminified, minified]) {
      const sandbox = { module: { exports: {} }, exports: {}, console };
      vm.createContext(sandbox);
      // vm.runInContext handles leading shebang if stripped or passed
      const codeWithoutShebang = bundle.code.replace(/^#![^\r\n]*/, '');
      const res = vm.runInContext(codeWithoutShebang, sandbox);
      assert.strictEqual(res.run(), 'running v1.0.0');
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Shebang: minifyCode directly preserves shebang as first line of output', () => {
  const inputCode = `#!/usr/bin/env node
const greeting = "Hello, world!"; // greeting comment
console.log(greeting);
`;

  const minified = minifyCode(inputCode);
  const firstLine = minified.split(/\r?\n/)[0].trim();
  assert.strictEqual(firstLine, '#!/usr/bin/env node', 'minifyCode must keep shebang on line 1');
  assert.ok(!minified.includes('// greeting comment'), 'Comments must still be stripped');
});

test('Shebang: entry without shebang does NOT receive an artificial shebang', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-no-shebang-'));
  try {
    const entryFile = path.join(tmpDir, 'lib.js');
    fs.writeFileSync(entryFile, `export const name = 'my-library';`);
    const graph = buildDependencyGraph(entryFile, tmpDir);

    const unminified = generateBundle(graph, { minify: false });
    assert.ok(!unminified.code.startsWith('#!'), 'Library bundle should not start with shebang');

    const minified = generateBundle(graph, { minify: true });
    assert.ok(!minified.code.startsWith('#!'), 'Minified library bundle should not start with shebang');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
