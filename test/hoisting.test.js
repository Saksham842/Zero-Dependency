import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { transformModuleCode, buildDependencyGraph } from '../src/parser.js';
import { generateBundle } from '../src/bundler.js';

test('Hoisting: verify that ONLY function declarations are hoisted to the top of the module wrapper', () => {
  const code = `
export const CONST_VAL = 42;
export class MyClass { constructor() { this.v = 1; } }
export default class DefaultClass { constructor() { this.v = 2; } }
export function myFunc() { return 100; }
export default function defFunc() { return 200; }
`;

  const transformed = transformModuleCode(code, 'test.js');
  const lines = transformed.code.trim().split('\n').map(l => l.trim()).filter(Boolean);

  // The first lines should only be the hoisted function exports
  const hoistedLines = [];
  for (const line of lines) {
    if (line.startsWith('module.exports.')) {
      hoistedLines.push(line);
    } else {
      break;
    }
  }

  // Confirm hoisted lines contain ONLY functions
  assert.ok(hoistedLines.includes('module.exports.myFunc = myFunc;'), 'Exported function should be hoisted');
  assert.ok(hoistedLines.includes('module.exports.default = defFunc;'), 'Default exported function should be hoisted');

  // Verify that const, class, and default class are NEVER hoisted before their declarations
  assert.strictEqual(hoistedLines.some(l => l.includes('CONST_VAL')), false, 'const must NOT be hoisted');
  assert.strictEqual(hoistedLines.some(l => l.includes('MyClass')), false, 'class must NOT be hoisted');
  assert.strictEqual(hoistedLines.some(l => l.includes('DefaultClass')), false, 'default class must NOT be hoisted');
});

test('Hoisting: circular imports with const export', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-circ-const-'));
  try {
    const aFile = path.join(tmpDir, 'a.js');
    const bFile = path.join(tmpDir, 'b.js');

    // a.js imports b.js and exports a const
    fs.writeFileSync(aFile, `
import { getConstFromA } from './b.js';
export const NUM = 42;
export function test() {
  return getConstFromA();
}
`);

    // b.js imports a.js
    fs.writeFileSync(bFile, `
import { NUM } from './a.js';
export function getConstFromA() {
  return NUM;
}
`);

    const graph = buildDependencyGraph(aFile, tmpDir);
    const bundle = generateBundle(graph);

    // Ensure the bundle does not crash with ReferenceError during module evaluation
    const sandbox = { module: { exports: {} }, exports: {}, console };
    vm.createContext(sandbox);
    const result = vm.runInContext(bundle.code, sandbox);
    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(typeof result.test, 'function');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Hoisting: circular imports with class export', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-circ-class-'));
  try {
    const aFile = path.join(tmpDir, 'a.js');
    const bFile = path.join(tmpDir, 'b.js');

    fs.writeFileSync(aFile, `
import { instantiateClass } from './b.js';
export class Service {
  constructor(name) {
    this.name = name;
  }
}
export function run() {
  return instantiateClass('zero');
}
`);

    fs.writeFileSync(bFile, `
import { Service } from './a.js';
export function instantiateClass(name) {
  return typeof Service === 'function' ? new Service(name) : { fallback: true };
}
`);

    const graph = buildDependencyGraph(aFile, tmpDir);
    const bundle = generateBundle(graph);

    // Confirm module evaluation does not throw TDZ ReferenceError at module wrapper level
    const sandbox = { module: { exports: {} }, exports: {}, console };
    vm.createContext(sandbox);
    const result = vm.runInContext(bundle.code, sandbox);
    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(typeof result.run, 'function');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Hoisting: circular imports with default-exported class', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-circ-defclass-'));
  try {
    const aFile = path.join(tmpDir, 'a.js');
    const bFile = path.join(tmpDir, 'b.js');

    fs.writeFileSync(aFile, `
import { instantiateDefault } from './b.js';
export default class AppEngine {
  constructor(id) {
    this.id = id;
  }
}
export function run() {
  return instantiateDefault('app-1');
}
`);

    fs.writeFileSync(bFile, `
import AppEngine from './a.js';
export function instantiateDefault(id) {
  return typeof AppEngine === 'function' ? new AppEngine(id) : { fallback: true };
}
`);

    const graph = buildDependencyGraph(aFile, tmpDir);
    const bundle = generateBundle(graph);

    // Confirm module evaluation does not throw TDZ ReferenceError at module wrapper level
    const sandbox = { module: { exports: {} }, exports: {}, console };
    vm.createContext(sandbox);
    const result = vm.runInContext(bundle.code, sandbox);
    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(typeof result.run, 'function');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Hoisting: side-by-side comparison of circular const, class, and defclass against native Node ESM', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-circ-esm-compare-'));
  try {
    // 1. Const test
    fs.writeFileSync(path.join(tmpDir, 'const_a.mjs'), `
import { getVal } from './const_b.mjs';
export const VAL = 123;
export function run() { return getVal(); }
`);
    fs.writeFileSync(path.join(tmpDir, 'const_b.mjs'), `
import { VAL } from './const_a.mjs';
export function getVal() { return VAL !== undefined ? VAL : 0; }
`);
    fs.copyFileSync(path.join(tmpDir, 'const_a.mjs'), path.join(tmpDir, 'const_a.js'));
    fs.copyFileSync(path.join(tmpDir, 'const_b.mjs'), path.join(tmpDir, 'const_b.js'));

    const esmMod1 = await import('file:///' + path.join(tmpDir, 'const_a.mjs').replace(/\\/g, '/'));
    const graph1 = buildDependencyGraph(path.join(tmpDir, 'const_a.js'), tmpDir);
    const bundle1 = generateBundle(graph1);
    const sandbox1 = { module: { exports: {} }, exports: {}, console };
    vm.createContext(sandbox1);
    const bMod1 = vm.runInContext(bundle1.code, sandbox1);

    assert.strictEqual(typeof esmMod1.run, 'function');
    assert.strictEqual(typeof bMod1.run, 'function');

    // 2. Class test
    fs.writeFileSync(path.join(tmpDir, 'class_a.mjs'), `
import { createObj } from './class_b.mjs';
export class Widget { constructor(x) { this.x = x; } }
export function run() { return createObj(10); }
`);
    fs.writeFileSync(path.join(tmpDir, 'class_b.mjs'), `
import { Widget } from './class_a.mjs';
export function createObj(x) { return typeof Widget === 'function' ? new Widget(x) : { fallback: x }; }
`);
    fs.copyFileSync(path.join(tmpDir, 'class_a.mjs'), path.join(tmpDir, 'class_a.js'));
    fs.copyFileSync(path.join(tmpDir, 'class_b.mjs'), path.join(tmpDir, 'class_b.js'));

    const esmMod2 = await import('file:///' + path.join(tmpDir, 'class_a.mjs').replace(/\\/g, '/'));
    const graph2 = buildDependencyGraph(path.join(tmpDir, 'class_a.js'), tmpDir);
    const bundle2 = generateBundle(graph2);
    const sandbox2 = { module: { exports: {} }, exports: {}, console };
    vm.createContext(sandbox2);
    const bMod2 = vm.runInContext(bundle2.code, sandbox2);

    assert.strictEqual(typeof esmMod2.run, 'function');
    assert.strictEqual(typeof bMod2.run, 'function');

    // 3. Default class test
    fs.writeFileSync(path.join(tmpDir, 'def_a.mjs'), `
import { createDef } from './def_b.mjs';
export default class Engine { constructor(y) { this.y = y; } }
export function run() { return createDef(20); }
`);
    fs.writeFileSync(path.join(tmpDir, 'def_b.mjs'), `
import Engine from './def_a.mjs';
export function createDef(y) { return typeof Engine === 'function' ? new Engine(y) : { fallback: y }; }
`);
    fs.copyFileSync(path.join(tmpDir, 'def_a.mjs'), path.join(tmpDir, 'def_a.js'));
    fs.copyFileSync(path.join(tmpDir, 'def_b.mjs'), path.join(tmpDir, 'def_b.js'));

    const esmMod3 = await import('file:///' + path.join(tmpDir, 'def_a.mjs').replace(/\\/g, '/'));
    const graph3 = buildDependencyGraph(path.join(tmpDir, 'def_a.js'), tmpDir);
    const bundle3 = generateBundle(graph3);
    const sandbox3 = { module: { exports: {} }, exports: {}, console };
    vm.createContext(sandbox3);
    const bMod3 = vm.runInContext(bundle3.code, sandbox3);

    assert.strictEqual(typeof esmMod3.run, 'function');
    assert.strictEqual(typeof bMod3.run, 'function');

    // 4. Eval-time circular access triggers TDZ in native ESM
    fs.writeFileSync(path.join(tmpDir, 'tdz_a.mjs'), `
import { b } from './tdz_b.mjs';
export const a = 1;
`);
    fs.writeFileSync(path.join(tmpDir, 'tdz_b.mjs'), `
import { a } from './tdz_a.mjs';
export const b = a + 1;
`);
    let nativeEsmThrew = false;
    try {
      await import('file:///' + path.join(tmpDir, 'tdz_a.mjs').replace(/\\/g, '/'));
    } catch (err) {
      nativeEsmThrew = err instanceof ReferenceError;
    }
    assert.strictEqual(nativeEsmThrew, true, 'Native ESM must throw ReferenceError for eval-time circular access');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

