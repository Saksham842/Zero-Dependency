import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { build, rebuild } from '../src/graph.js';
import { bundleToFile } from '../src/bundler.js';

function makeFixture(files) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-inc-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return tmpDir;
}

test('incremental rebuild produces identical bundle to fresh full build', async () => {
  // Initial fixture
  const dir = makeFixture({
    'src/a.js': "import { b } from './b.js';\nexport const a = b + 1;",
    'src/b.js': "export const b = 2;",
    'src/c.js': "export const c = 3;",
    'src/index.js': "import { a } from './a.js';\nconsole.log(a);"
  });

  const entry = path.join(dir, 'src/index.js');
  const outFull = path.join(dir, 'dist/full.js');
  const outInc = path.join(dir, 'dist/inc.js');

  // Full build first
  const graphFull = build(entry);
  const resultFull = bundleToFile(graphFull, outFull, { minify: false });

  // Modify b.js
  const bPath = path.join(dir, 'src/b.js');
  fs.writeFileSync(bPath, "export const b = 42;");

  // Incremental rebuild
  const graphInc = rebuild(entry, [bPath]);
  const resultInc = bundleToFile(graphInc, outInc, { minify: false });

  // Fresh full build on modified source
  const graphFresh = build(entry);
  const resultFresh = bundleToFile(graphFresh, path.join(dir, 'dist/fresh.js'), { minify: false });

  // Compare hashes and code
  assert.equal(resultInc.hash, resultFresh.hash, 'Incremental bundle hash should match fresh full build');
  assert.equal(resultInc.code, resultFresh.code, 'Incremental bundle code should be identical to fresh full build');
});
