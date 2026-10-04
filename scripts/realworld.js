import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import assert from 'node:assert';
import { pathToFileURL } from 'node:url';

import { buildDependencyGraph } from '../src/parser.js';
import { bundleToFile } from '../src/bundler.js';

console.log('\n=============================================================');
console.log('  ZeroPack Real-World ESM Package & Project Validation Suite  ');
console.log('=============================================================\n');

const FIXTURES_DIR = path.resolve('test/fixtures');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-realworld-'));

/**
 * Normalizes objects across node:vm context boundaries to avoid prototype divergence.
 */
function toHost(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object') {
    return JSON.parse(JSON.stringify(val));
  }
  return val;
}

/**
 * Runs a ZeroPack bundle inside a sandboxed node:vm context.
 */
function runBundleInVm(bundleFilePath, contextOverrides = {}) {
  const code = fs.readFileSync(bundleFilePath, 'utf8');
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    Buffer,
    URL,
    ...contextOverrides
  };
  const ctx = vm.createContext(sandbox);
  const script = new vm.Script(code, { filename: bundleFilePath });
  return script.runInContext(ctx);
}

const testSuites = [
  {
    name: 'TinyEmitter (Real-World Pure ESM Event Emitter)',
    entry: path.join(FIXTURES_DIR, 'tiny-emitter', 'index.js'),
    async run(originalMod, bundledMod) {
      // 1. Original
      const OriginalEmitter = originalMod.default || originalMod;
      const orig = new OriginalEmitter();
      const origEvents = [];
      orig.on('test', (msg) => origEvents.push(msg));
      orig.emit('test', 'payload-1');
      orig.emit('test', 'payload-2');

      // 2. Bundled
      const BundledEmitter = bundledMod.default || bundledMod;
      const bnd = new BundledEmitter();
      const bndEvents = [];
      bnd.on('test', (msg) => bndEvents.push(msg));
      bnd.emit('test', 'payload-1');
      bnd.emit('test', 'payload-2');

      assert.deepStrictEqual(toHost(bndEvents), toHost(origEvents));
      return { eventsCount: bndEvents.length, payload: bndEvents };
    }
  },
  {
    name: 'KleurMini (Real-World ANSI String Styler)',
    entry: path.join(FIXTURES_DIR, 'kleur-mini', 'index.js'),
    async run(originalMod, bundledMod) {
      const origRed = originalMod.red('Hello');
      const bndRed = bundledMod.red('Hello');
      assert.strictEqual(bndRed, origRed);

      const origGreen = originalMod.green('World');
      const bndGreen = bundledMod.green('World');
      assert.strictEqual(bndGreen, origGreen);

      const origBold = originalMod.bold('Bold');
      const bndBold = bundledMod.bold('Bold');
      assert.strictEqual(bndBold, origBold);

      return { styledOutput: bndRed };
    }
  },
  {
    name: 'Cyclic Imports (Mutually Dependent ESM Cycles)',
    entry: path.join(FIXTURES_DIR, 'cyclic-app', 'index.js'),
    async run(originalMod, bundledMod) {
      const origResult = originalMod.runCycle(4);
      const bndResult = bundledMod.runCycle(4);
      assert.deepStrictEqual(toHost(bndResult), toHost(origResult));
      assert.deepStrictEqual(toHost(bndResult.fromA), ['A:4', 'B:3', 'A:2', 'B:1', 'A:0']);
      assert.deepStrictEqual(toHost(bndResult.fromB), ['B:4', 'A:3', 'B:2', 'A:1', 'B:0']);
      return bndResult;
    }
  },
  {
    name: 'JSON Modules (Named and Default Import Attributes)',
    entry: path.join(FIXTURES_DIR, 'json-app', 'index.js'),
    async run(originalMod, bundledMod) {
      const origInfo = originalMod.getJsonInfo();
      const bndInfo = bundledMod.getJsonInfo();
      assert.deepStrictEqual(toHost(bndInfo), toHost(origInfo));
      assert.strictEqual(bndInfo.defaultName, 'zeropack-json-fixture');
      assert.strictEqual(bndInfo.namedName, 'zeropack-json-fixture');
      assert.strictEqual(bndInfo.version, '1.0.0');
      assert.strictEqual(bndInfo.port, 4321);
      assert.strictEqual(bndInfo.matches, true);
      return bndInfo;
    }
  },
  {
    name: 'Dynamic Imports (import() with Promisified Evaluation)',
    entry: path.join(FIXTURES_DIR, 'dynamic-import-app', 'index.js'),
    async run(originalMod, bundledMod) {
      const origMath = await originalMod.compute(15, 3);
      const bndMath = await bundledMod.compute(15, 3);
      assert.deepStrictEqual(toHost(bndMath), toHost(origMath));
      assert.strictEqual(bndMath.sum, 18);
      assert.strictEqual(bndMath.product, 45);
      return bndMath;
    }
  },
  {
    name: 'CSS Imports (Universal String Export & DOM Injection)',
    entry: path.join(FIXTURES_DIR, 'css-import-app', 'index.js'),
    isCss: true,
    async run(originalMod, bundledMod) {
      const bndCss = bundledMod.getCssMeta();
      assert.strictEqual(bndCss.hasCard, true);
      assert.strictEqual(bndCss.hasBtn, true);
      assert.ok(bndCss.length > 20);
      assert.strictEqual(bndCss.hasCard, originalMod.hasCard);
      return bndCss;
    }
  },
  {
    name: 'Full Real-World Application (All Features Combined)',
    entry: path.join(FIXTURES_DIR, 'realworld-pkg', 'index.js'),
    async run(originalMod, bundledMod) {
      const origAll = await originalMod.runAllRealworldChecks();
      const bndAll = await bundledMod.runAllRealworldChecks();
      assert.deepStrictEqual(toHost(bndAll), toHost(origAll));
      return bndAll;
    }
  }
];

let allPassed = true;

for (let i = 0; i < testSuites.length; i++) {
  const suite = testSuites[i];
  const outPath = path.join(tmpDir, `bundle-${i}.js`);
  const t0 = performance.now();

  try {
    // 1. Bundle with ZeroPack
    const graph = buildDependencyGraph(suite.entry, path.dirname(suite.entry));
    const bundleRes = bundleToFile(graph, outPath, { minify: false });

    // 2. Load original code
    let originalMod = null;
    if (suite.isCss) {
      const cssPath = path.join(FIXTURES_DIR, 'css-import-app', 'styles.css');
      const rawCss = fs.readFileSync(cssPath, 'utf8');
      originalMod = { hasCard: rawCss.includes('.card'), hasBtn: rawCss.includes('.btn-primary') };
    } else {
      const origUrl = pathToFileURL(suite.entry).href + '?t=' + Date.now();
      originalMod = await import(origUrl);
    }

    // 3. Execute bundled code in node:vm
    const bundledMod = runBundleInVm(outPath);

    // 4. Assert identical outputs and behavior
    const details = await suite.run(originalMod, bundledMod);

    const elapsed = (performance.now() - t0).toFixed(2);
    console.log(`[PASS] ${suite.name} (${bundleRes.size} bytes, ${elapsed}ms)`);
  } catch (err) {
    allPassed = false;
    console.error(`[FAIL] ${suite.name}:`, err.message);
    console.error(err.stack);
  }
}

// Cleanup temp directory
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (_) {}

if (allPassed) {
  console.log('\n[SUCCESS] All Real-World ESM Packages and Projects validated successfully!\n');
  process.exit(0);
} else {
  console.error('\n[ERROR] Real-World validation failed.\n');
  process.exit(1);
}
