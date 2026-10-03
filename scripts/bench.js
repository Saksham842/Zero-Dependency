import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks';

import { buildDependencyGraph } from '../src/parser.js';
import { generateBundle, minifyCode } from '../src/bundler.js';
import { colors } from '../src/cli.js';

console.log(colors.cyan(colors.bold('\n========================================================================')));
console.log(colors.brightCyan(colors.bold('   ⚡ ZeroPack Native Performance Benchmark Suite')));
console.log(colors.gray(`   OS: ${os.type()} ${os.release()} (${os.arch()}) | Node: ${process.version}`));
console.log(colors.cyan(colors.bold('========================================================================\n')));

// Helper to compute stats
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
// 1. Cold Bundle Performance
// -----------------------------------------------------------------------------
console.log(colors.bold('1. Cold Bundling Benchmark (src/index.js):'));
const entryFile = path.resolve(process.cwd(), 'src/index.js');
const coldRuns = [];

for (let i = 0; i < 20; i++) {
  const t0 = performance.now();
  const graph = buildDependencyGraph(entryFile);
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
// 3. State-Machine Minifier Throughput
// -----------------------------------------------------------------------------
console.log(colors.bold('3. Minifier Throughput on Synthetic Workload:'));
const sampleCode = `
  // ZeroPack Synthetic Test Module
  function computeHeavyTask(data) {
    const regex = /test\\/pattern/g;
    const template = \`Template with \${data.value} and expressions\`;
    let count = 0;
    for (let i = 0; i < 1000; i++) {
      count = count + +1 - -2;
    }
    return { count, template, regex };
  }
`.repeat(500); // ~150 KB

const sampleBytes = Buffer.byteLength(sampleCode, 'utf8');
const minifyRuns = [];

for (let i = 0; i < 15; i++) {
  const t0 = performance.now();
  minifyCode(sampleCode);
  const t1 = performance.now();
  minifyRuns.push(t1 - t0);
}

const miniStats = stats(minifyRuns);
const mbPerSec = ((sampleBytes / (1024 * 1024)) / (miniStats.mean / 1000)).toFixed(2);
console.log(`   Payload Size: ${colors.cyan((sampleBytes / 1024).toFixed(1) + ' KB')}`);
console.log(`   Mean Speed:   ${colors.green(miniStats.mean.toFixed(2) + ' ms')}`);
console.log(`   Throughput:   ${colors.brightCyan(colors.bold(mbPerSec + ' MB/s'))}\n`);

// -----------------------------------------------------------------------------
// 4. Memory Footprint
// -----------------------------------------------------------------------------
console.log(colors.bold('4. Memory Footprint:'));
const mem = process.memoryUsage();
console.log(`   RSS:          ${(mem.rss / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   Heap Total:   ${(mem.heapTotal / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   Heap Used:    ${colors.green((mem.heapUsed / (1024 * 1024)).toFixed(2) + ' MB')}`);
console.log(`   External:     ${(mem.external / (1024 * 1024)).toFixed(2)} MB\n`);

console.log(colors.green(colors.bold('✔ All performance benchmarks completed successfully!\n')));
