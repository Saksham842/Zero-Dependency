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
