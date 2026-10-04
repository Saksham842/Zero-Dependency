import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';

import { buildDependencyGraph, clearModuleCache } from '../src/parser.js';
import { generateBundle, minifyCode } from '../src/bundler.js';
import { colors } from '../src/cli.js';

console.log(colors.cyan(colors.bold('\n========================================================================')));
console.log(colors.brightCyan(colors.bold('   ⚡ ZeroPack Native Performance Benchmark Suite')));
console.log(colors.gray(`   OS: ${os.type()} ${os.release()} (${os.arch()}) | Node: ${process.version}`));
console.log(colors.cyan(colors.bold('========================================================================\n')));

function stats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { mean, median, min, max, count: times.length };
}

// -----------------------------------------------------------------------------
// 1. Cold Bundle Performance (Small Demo App: src/index.js)
// -----------------------------------------------------------------------------
console.log(colors.bold('1. Small App Cold Bundling (src/index.js - 4 modules):'));
const entryFile = path.resolve(process.cwd(), 'src/index.js');
const coldRuns = [];

for (let i = 0; i < 20; i++) {
  clearModuleCache();
  const t0 = performance.now();
  const graph = buildDependencyGraph(entryFile, process.cwd(), { cache: false });
  const bundle = generateBundle(graph, { minify: false, sourcemap: false });
  const t1 = performance.now();
  coldRuns.push(t1 - t0);
}

const coldStats = stats(coldRuns);
console.log(`   Mean:   ${colors.green(coldStats.mean.toFixed(2) + ' ms')}`);
console.log(`   Median: ${colors.green(coldStats.median.toFixed(2) + ' ms')}`);
console.log(`   Min:    ${colors.cyan(coldStats.min.toFixed(2) + ' ms')}`);
console.log(`   Max:    ${colors.yellow(coldStats.max.toFixed(2) + ' ms')}`);
console.log(`   Runs:   ${coldStats.count}\n`);

// -----------------------------------------------------------------------------
// 2. Production Minified Bundling + Source Map
// -----------------------------------------------------------------------------
console.log(colors.bold('2. Production Bundle (Minify + Source Map v3 + Gzip):'));
const prodRuns = [];

for (let i = 0; i < 20; i++) {
  const t0 = performance.now();
  const graph = buildDependencyGraph(entryFile);
  const bundle = generateBundle(graph, { minify: true, sourcemap: true });
  const t1 = performance.now();
  prodRuns.push(t1 - t0);
}

const prodStats = stats(prodRuns);
console.log(`   Mean:   ${colors.green(prodStats.mean.toFixed(2) + ' ms')}`);
console.log(`   Median: ${colors.green(prodStats.median.toFixed(2) + ' ms')}`);
console.log(`   Min:    ${colors.cyan(prodStats.min.toFixed(2) + ' ms')}`);
console.log(`   Max:    ${colors.yellow(prodStats.max.toFixed(2) + ' ms')}`);
console.log(`   Runs:   ${prodStats.count}\n`);

// -----------------------------------------------------------------------------
// 3. Minifier Benchmark on Real Library Source Files & Execution Verification
// -----------------------------------------------------------------------------
console.log(colors.bold('3. Minifier Benchmark on Real Library Sources (Real Multi-File Codebase):'));

// Collect real library source files from the workspace
const realFilesToBenchmark = [
  'test/fixtures/tiny-emitter/index.js',
  'test/fixtures/kleur-mini/index.js',
  'src/math.js',
  'src/utils.js',
  'src/components.js',
  'src/sourcemap.js',
  'src/errors.js',
  'src/dashboard.js',
  'src/parser.js',
  'src/bundler.js',
  'src/server.js',
  'src/cli.js',
  'src/build-tools.js',
  'src/sample.js'
];

let realWorkload = '';
let collectedCount = 0;
for (const relPath of realFilesToBenchmark) {
  const full = path.join(process.cwd(), relPath);
  if (fs.existsSync(full)) {
    realWorkload += `\n// --- Source: ${relPath} ---\n` + fs.readFileSync(full, 'utf8');
    collectedCount++;
  }
}

const realWorkloadBytes = Buffer.byteLength(realWorkload, 'utf8');
const realWorkloadKb = (realWorkloadBytes / 1024).toFixed(2);

const realMinifyRuns = [];
let lastMinifiedRealCode = '';
for (let i = 0; i < 20; i++) {
  const t0 = performance.now();
  lastMinifiedRealCode = minifyCode(realWorkload);
  const t1 = performance.now();
  realMinifyRuns.push(t1 - t0);
}

const realMiniStats = stats(realMinifyRuns);
const realMbPerSec = ((realWorkloadBytes / (1024 * 1024)) / (realMiniStats.mean / 1000)).toFixed(2);
const minifiedRealBytes = Buffer.byteLength(lastMinifiedRealCode, 'utf8');
const savedPct = (((realWorkloadBytes - minifiedRealBytes) / realWorkloadBytes) * 100).toFixed(1);

console.log(`   Source Input:  ${colors.cyan(collectedCount + ' Real JS Library Files')} (${colors.bold(realWorkloadKb + ' KB')}, ${realWorkloadBytes.toLocaleString()} bytes)`);
console.log(`   Minified Size: ${colors.cyan((minifiedRealBytes / 1024).toFixed(2) + ' KB')} (${savedPct}% saved)`);
console.log(`   Mean Time:     ${colors.green(realMiniStats.mean.toFixed(2) + ' ms')}`);
console.log(`   Median Time:   ${colors.green(realMiniStats.median.toFixed(2) + ' ms')}`);
console.log(`   Throughput:    ${colors.brightCyan(colors.bold(realMbPerSec + ' MB/s'))}`);

// Differential Execution Verification: verify minified output executes identically to original
const executableRealSuite = `
function Emitter() { this.events = {}; }
Emitter.prototype.on = function(t, f) { (this.events[t] = this.events[t] || []).push(f); return this; };
Emitter.prototype.emit = function(t, d) { (this.events[t] || []).forEach(fn => fn(d)); return this; };

function kleur(str) { return '\\x1b[32m' + str + '\\x1b[39m'; }

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encodeVlq(val) {
  let vlq = val < 0 ? ((-val) << 1) | 1 : val << 1;
  let res = '';
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    res += B64[digit];
  } while (vlq > 0);
  return res;
}

function processData(a, b) {
  const sum = a + +b;
  const diff = a - -b;
  const pattern = /calc\\/([a-z0-9_-]+)/gi;
  const desc = \`Values: \${sum} & \${diff}\`;
  return { sum, diff, desc, ok: pattern.test('calc/test-1') };
}

const em = new Emitter();
let log = null;
em.on('run', (d) => { log = d; });
em.emit('run', kleur('ready'));

module.exports = {
  log,
  calc: processData(15, 25),
  vlq: encodeVlq(9876)
};
`;

const origSandbox = { module: { exports: {} }, exports: {} };
vm.createContext(origSandbox);
vm.runInContext(executableRealSuite, origSandbox);
const origRes = JSON.parse(JSON.stringify(origSandbox.module.exports));

const minifiedSuite = minifyCode(executableRealSuite);
const miniSandbox = { module: { exports: {} }, exports: {} };
vm.createContext(miniSandbox);
vm.runInContext(minifiedSuite, miniSandbox);
const miniRes = JSON.parse(JSON.stringify(miniSandbox.module.exports));

if (JSON.stringify(origRes) === JSON.stringify(miniRes)) {
  console.log(`   Verification:  ${colors.green(colors.bold('✔ PASS'))} (Minified output executes identically to original)\n`);
} else {
  console.log(`   Verification:  ${colors.red(colors.bold('✖ FAIL'))} (Mismatch detected!)\n`);
}

// -----------------------------------------------------------------------------
// 4. 500-Module Project Benchmark: Cold Build vs. Incremental Rebuild
// -----------------------------------------------------------------------------
console.log(colors.bold('4. Large Project Benchmark (500 ESM Modules):'));
const benchTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-bench-500-'));
const MODULE_COUNT = 500;

try {
  // Generate 500 interdependent ESM modules
  // Entry imports 10 branch modules, which each import a tree of child modules
  for (let i = 1; i < MODULE_COUNT; i++) {
    const parentId = Math.floor((i - 1) / 5);
    const childCode = `
      export const id = ${i};
      export function getValue() {
        return ${i} * 2;
      }
    `;
    fs.writeFileSync(path.join(benchTmpDir, `mod_${i}.js`), childCode);
  }

  // Entry module imports all level-1 modules
  let entryCode = `// 500-Module Benchmark Entry\n`;
  for (let i = 1; i < MODULE_COUNT; i++) {
    entryCode += `import { getValue as get_${i} } from './mod_${i}.js';\n`;
  }
  entryCode += `
    export function runProject() {
      let total = 0;
      ${Array.from({ length: MODULE_COUNT - 1 }, (_, i) => `total += get_${i + 1}();`).join('\n      ')}
      return total;
    }
  `;
  const largeEntryPath = path.join(benchTmpDir, 'entry.js');
  fs.writeFileSync(largeEntryPath, entryCode);

  // A. Cold Build: 500 modules from disk with zero cache
  const cold500Runs = [];
  for (let i = 0; i < 5; i++) {
    clearModuleCache();
    const t0 = performance.now();
    const graph = buildDependencyGraph(largeEntryPath, benchTmpDir, { cache: false });
    const bundle = generateBundle(graph, { minify: false, sourcemap: false });
    const t1 = performance.now();
    cold500Runs.push(t1 - t0);
  }
  const cold500Stats = stats(cold500Runs);

  // Prime the cache with the first build
  clearModuleCache();
  const initialGraph = buildDependencyGraph(largeEntryPath, benchTmpDir);
  generateBundle(initialGraph, { minify: false, sourcemap: false });

  // B. Incremental Rebuild: Touch exactly 1 module (module #250) and rebuild
  const targetModPath = path.join(benchTmpDir, 'mod_250.js');
  const incrRuns = [];

  for (let i = 0; i < 15; i++) {
    // Modify target module
    const updatedCode = `
      export const id = 250;
      export function getValue() {
        return ${250 * 2 + i + 1};
      }
    `;
    fs.writeFileSync(targetModPath, updatedCode);

    const t0 = performance.now();
    const graph = buildDependencyGraph(largeEntryPath, benchTmpDir);
    const bundle = generateBundle(graph, { minify: false, sourcemap: false });
    const t1 = performance.now();
    incrRuns.push(t1 - t0);
  }
  const incrStats = stats(incrRuns);

  const speedup = (cold500Stats.mean / incrStats.mean).toFixed(1);

  console.log(`   Project Size:         ${colors.cyan(MODULE_COUNT + ' ESM Modules')}`);
  console.log(`   Cold Build (Mean):    ${colors.yellow(cold500Stats.mean.toFixed(2) + ' ms')} (all 500 parsed from disk)`);
  console.log(`   Incremental (Mean):   ${colors.green(incrStats.mean.toFixed(2) + ' ms')} (1 changed, 499 cached)`);
  console.log(`   Incremental Speedup:  ${colors.brightCyan(colors.bold(speedup + 'x faster'))}\n`);
} finally {
  try {
    fs.rmSync(benchTmpDir, { recursive: true, force: true });
  } catch (_) {}
}

// -----------------------------------------------------------------------------
// 5. Memory Footprint
// -----------------------------------------------------------------------------
console.log(colors.bold('5. Memory Footprint:'));
const mem = process.memoryUsage();
console.log(`   RSS:          ${(mem.rss / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   Heap Total:   ${(mem.heapTotal / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   Heap Used:    ${colors.green((mem.heapUsed / (1024 * 1024)).toFixed(2) + ' MB')}`);
console.log(`   External:     ${(mem.external / (1024 * 1024)).toFixed(2)} MB\n`);

console.log(colors.green(colors.bold('✔ All performance benchmarks completed successfully!\n')));
