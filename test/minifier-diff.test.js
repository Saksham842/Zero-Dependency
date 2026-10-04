import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';

import { minifyCode, bundleToFile } from '../src/bundler.js';
import { transformModuleCode, buildDependencyGraph } from '../src/parser.js';

function toHost(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object') {
    return JSON.parse(JSON.stringify(val));
  }
  return val;
}

function runInSandbox(code, filename = 'eval.js') {
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Buffer,
    URL
  };
  sandbox.module.exports = sandbox.exports;
  const ctx = vm.createContext(sandbox);
  const script = new vm.Script(code, { filename });
  const result = script.runInContext(ctx);
  return { result, exports: sandbox.module.exports };
}

test('Minifier Differential: parses all JS files in src/, scripts/, and test/fixtures/', () => {
  const roots = [
    path.resolve('src'),
    path.resolve('scripts'),
    path.resolve('test/fixtures')
  ];

  const jsFiles = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(fullPath);
      } else if (ent.isFile() && ent.name.endsWith('.js')) {
        jsFiles.push(fullPath);
      }
    }
  }

  roots.forEach(walk);
  assert.ok(jsFiles.length > 10, 'Found at least 10 JS files to differential test');

  for (const file of jsFiles) {
    const raw = fs.readFileSync(file, 'utf8');

    // If file has ESM import/export, convert to CJS first so vm.Script can parse it
    let codeToMinify = raw;
    if (/(?:^|[\n;])\s*(?:import|export)\s/m.test(raw)) {
      const transformed = transformModuleCode(raw, file);
      codeToMinify = `(async function(require, module, exports) {\n${transformed.code}\n})`;
    }

    const minified = minifyCode(codeToMinify);
    assert.strictEqual(typeof minified, 'string');
    assert.ok(minified.length <= codeToMinify.length, `Minified length should be <= original for ${path.basename(file)}`);

    // Verify minified output parses cleanly in node:vm without any syntax error
    assert.doesNotThrow(() => {
      new vm.Script(minified, { filename: `min-${path.basename(file)}` });
    }, `Failed to parse minified output of ${file}`);
  }
});

test('Minifier Differential: preserves identical execution semantics across complex JS expressions', () => {
  const snippets = [
    {
      name: 'Unary and arithmetic spacing (+ +, - -)',
      code: `
        const a = 10;
        const b = 5;
        const r1 = a + +b;
        const r2 = a - -b;
        const r3 = a + + +5;
        const r4 = a - - -5;
        module.exports = { r1, r2, r3, r4 };
      `
    },
    {
      name: 'Division and RegExp literal disambiguation',
      code: `
        const x = 50;
        const y = 2;
        const z = 5;
        const div = x / y / z;
        const pattern = /foo\\/bar[a-z\\/]/;
        const isMatch = pattern.test('foo/barb');
        module.exports = { div, isMatch };
      `
    },
    {
      name: 'ASI preservation with return statements',
      code: `
        function getObj() {
          return {
            success: true,
            val: 42
          };
        }
        function multiLine() {
          let count = 0;
          count++
          count++
          return count;
        }
        module.exports = { obj: getObj(), count: multiLine() };
      `
    },
    {
      name: 'Nested template literals and interpolation',
      code: `
        const name = 'World';
        const num = 42;
        const str = \`Greeting: \${\`Hello, \${name}! Your score is \${num * 2}.\`}\`;
        module.exports = { str };
      `
    },
    {
      name: 'Object destructuring, rest/spread, and class methods',
      code: `
        class Calculator {
          constructor(base) {
            this.base = base;
          }
          add(...nums) {
            return nums.reduce((acc, n) => acc + n, this.base);
          }
        }
        const calc = new Calculator(100);
        const sum = calc.add(1, 2, 3, 4);
        const { a, ...rest } = { a: 1, b: 2, c: 3 };
        module.exports = { sum, a, rest };
      `
    }
  ];

  for (const snippet of snippets) {
    const rawRes = runInSandbox(snippet.code);
    const minCode = minifyCode(snippet.code);
    const minRes = runInSandbox(minCode);

    assert.deepStrictEqual(toHost(minRes.exports), toHost(rawRes.exports), `Mismatch in snippet: ${snippet.name}`);
  }
});

test('Minifier Differential: unminified vs minified ZeroPack bundles produce identical results', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-min-diff-'));
  try {
    const fixtures = [
      { name: 'tiny-emitter', entry: 'test/fixtures/tiny-emitter/index.js' },
      { name: 'kleur-mini', entry: 'test/fixtures/kleur-mini/index.js' },
      { name: 'cyclic-app', entry: 'test/fixtures/cyclic-app/index.js' },
      { name: 'json-app', entry: 'test/fixtures/json-app/index.js' },
      { name: 'dynamic-import-app', entry: 'test/fixtures/dynamic-import-app/index.js' },
      { name: 'css-import-app', entry: 'test/fixtures/css-import-app/index.js' },
      { name: 'realworld-pkg', entry: 'test/fixtures/realworld-pkg/index.js' }
    ];

    for (const fix of fixtures) {
      const entryAbs = path.resolve(fix.entry);
      const graph = buildDependencyGraph(entryAbs, path.dirname(entryAbs));

      const unminPath = path.join(tmpDir, `${fix.name}.unmin.js`);
      const minPath = path.join(tmpDir, `${fix.name}.min.js`);

      const unminResult = bundleToFile(graph, unminPath, { minify: false });
      const minResult = bundleToFile(graph, minPath, { minify: true });

      assert.ok(minResult.size <= unminResult.size, `Minified bundle for ${fix.name} should be <= unminified`);

      // Run both in sandbox
      const unminMod = runInSandbox(fs.readFileSync(unminPath, 'utf8')).result;
      const minMod = runInSandbox(fs.readFileSync(minPath, 'utf8')).result;

      // Assert export types match
      assert.strictEqual(typeof minMod, typeof unminMod);

      if (fix.name === 'cyclic-app') {
        assert.deepStrictEqual(toHost(minMod.runCycle(3)), toHost(unminMod.runCycle(3)));
      } else if (fix.name === 'json-app') {
        assert.deepStrictEqual(toHost(minMod.getJsonInfo()), toHost(unminMod.getJsonInfo()));
      } else if (fix.name === 'dynamic-import-app') {
        const u = await unminMod.compute(10, 5);
        const m = await minMod.compute(10, 5);
        assert.deepStrictEqual(toHost(m), toHost(u));
      } else if (fix.name === 'css-import-app') {
        assert.deepStrictEqual(toHost(minMod.getCssMeta()), toHost(unminMod.getCssMeta()));
      } else if (fix.name === 'realworld-pkg') {
        const u = await unminMod.runAllRealworldChecks();
        const m = await minMod.runAllRealworldChecks();
        assert.deepStrictEqual(toHost(m), toHost(u));
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
