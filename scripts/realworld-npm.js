import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { buildDependencyGraph } from '../src/parser.js';
import { generateBundle } from '../src/bundler.js';

const PACKAGES = [
  {
    name: 'nanoid',
    entryCode: `
import { nanoid } from 'nanoid';
export function run() {
  const id = nanoid();
  return { isString: typeof id === 'string', length: id.length };
}
`,
    validate: (res) => res && res.isString === true && res.length === 21
  },
  {
    name: 'dayjs',
    entryCode: `
import dayjs from 'dayjs';
export function run() {
  const d = dayjs('2026-10-04');
  return { year: d.year(), month: d.month() + 1, date: d.date() };
}
`,
    validate: (res) => res && res.year === 2026 && res.month === 10 && res.date === 4
  },
  {
    name: 'mitt',
    entryCode: `
import mitt from 'mitt';
export function run() {
  const emitter = mitt();
  let received = null;
  emitter.on('foo', (e) => { received = e; });
  emitter.emit('foo', 'bar');
  return { received };
}
`,
    validate: (res) => res && res.received === 'bar'
  },
  {
    name: 'camelcase',
    entryCode: `
import camelCase from 'camelcase';
export function run() {
  return {
    simple: camelCase('foo-bar'),
    spaced: camelCase('Foo Bar'),
    dotted: camelCase('foo.bar')
  };
}
`,
    validate: (res) => res && res.simple === 'fooBar' && res.spaced === 'fooBar' && res.dotted === 'fooBar'
  },
  {
    name: 'ms',
    entryCode: `
import ms from 'ms';
export function run() {
  return {
    strToMs: ms('2 days'),
    msToStr: ms(60000)
  };
}
`,
    validate: (res) => res && res.strToMs === 172800000 && res.msToStr === '1m'
  }
];

async function runNpmValidation() {
  console.log('\n=============================================================');
  console.log('  ZeroPack Real-World External NPM Package Validation Suite  ');
  console.log('=============================================================\n');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-npm-val-'));
  console.log(`[INFO] Working in isolated temporary directory: ${tempDir}`);

  // Create isolated package.json in temp directory
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ name: 'zeropack-validation-sandbox', type: 'module' }, null, 2)
  );

  const pkgNames = PACKAGES.map(p => p.name).join(' ');
  console.log(`[INFO] Running npm install for: ${pkgNames}...`);
  try {
    execSync(`npm install --no-audit --no-fund --no-package-lock ${pkgNames}`, {
      cwd: tempDir,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    console.log('[SUCCESS] npm install completed successfully.\n');
  } catch (err) {
    console.error('[ERROR] npm install failed:', err.stderr ? err.stderr.toString() : err.message);
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  const results = [];

  for (const pkg of PACKAGES) {
    const entryFile = path.join(tempDir, `test-${pkg.name}.js`);
    fs.writeFileSync(entryFile, pkg.entryCode.trim());

    const result = {
      name: pkg.name,
      nativeSuccess: false,
      bundleSuccess: false,
      nativeResult: null,
      bundleResult: null,
      error: null
    };

    // 1. Run natively in Node.js
    try {
      const fileUrl = pathToFileURL(entryFile).href;
      const nativeMod = await import(fileUrl);
      result.nativeResult = nativeMod.run();
      result.nativeSuccess = pkg.validate(result.nativeResult);
    } catch (err) {
      result.error = `Native ESM Error: ${err.message}`;
    }

    // 2. Bundle with ZeroPack
    if (result.nativeSuccess) {
      try {
        const graph = buildDependencyGraph(entryFile, tempDir);
        const bundle = generateBundle(graph, { minify: true });

        const sandbox = {
          module: { exports: {} },
          exports: {},
          console,
          Buffer,
          crypto: globalThis.crypto,
          setTimeout,
          clearTimeout
        };
        vm.createContext(sandbox);
        const bundleMod = vm.runInContext(bundle.code, sandbox);
        
        let bundleRunResult;
        if (typeof bundleMod.run === 'function') {
          bundleRunResult = bundleMod.run();
        } else if (bundleMod.default && typeof bundleMod.default.run === 'function') {
          bundleRunResult = bundleMod.default.run();
        } else {
          throw new Error('bundle does not export run() function');
        }

        result.bundleResult = bundleRunResult;
        result.bundleSuccess = pkg.validate(bundleRunResult);

        // Compare native and bundle results
        const nativeStr = JSON.stringify(result.nativeResult);
        const bundleStr = JSON.stringify(result.bundleResult);
        if (nativeStr !== bundleStr) {
          result.bundleSuccess = false;
          result.error = `Mismatch: Native returned ${nativeStr}, bundle returned ${bundleStr}`;
        }
      } catch (err) {
        result.bundleSuccess = false;
        result.error = err.message || String(err);
      }
    }

    results.push(result);
  }

  // Cleanup temp dir
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}

  // Print Summary Table
  console.log('-------------------------------------------------------------');
  console.log('Package       | Native ESM | ZeroPack Bundle | Status');
  console.log('-------------------------------------------------------------');
  let hasFailures = false;
  for (const r of results) {
    const nativeStatus = r.nativeSuccess ? 'PASS' : 'FAIL';
    const bundleStatus = r.bundleSuccess ? 'PASS' : 'FAIL';
    const overall = (r.nativeSuccess && r.bundleSuccess) ? '✔ OK' : '✖ FAILED';
    if (!r.bundleSuccess) hasFailures = true;

    console.log(
      `${r.name.padEnd(13)} | ${nativeStatus.padEnd(10)} | ${bundleStatus.padEnd(15)} | ${overall}`
    );
    if (r.error) {
      console.log(`  └─ Details: ${r.error}`);
    }
  }
  console.log('-------------------------------------------------------------\n');

  if (hasFailures) {
    console.log('[WARN] One or more real-world npm packages encountered issues.');
  } else {
    console.log('[SUCCESS] All real-world npm packages passed validation 100%!');
  }

  return results;
}

// Auto-run if executed directly
const isMain = process.argv[1] && process.argv[1].endsWith('realworld-npm.js');
if (isMain) {
  runNpmValidation().catch((err) => {
    console.error('Fatal validation error:', err);
    process.exit(1);
  });
}
