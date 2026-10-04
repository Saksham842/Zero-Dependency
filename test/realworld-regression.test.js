import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { buildDependencyGraph, transformModuleCode } from '../src/parser.js';
import { generateBundle } from '../src/bundler.js';

test('Regression Bug A: Anonymous export default function with internal semicolons and nested Map/objects', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-reg-mitt-'));
  try {
    const entryFile = path.join(tmpDir, 'entry.js');
    const libFile = path.join(tmpDir, 'mitt-like.js');

    // Reproduces exact minified pattern from mitt.mjs
    fs.writeFileSync(libFile, `
export default function(n){return{all:n=n||new Map,on:function(t,e){var i=n.get(t);i?i.push(e):n.set(t,[e])},emit:function(t,e){var i=n.get(t);i&&i.slice().map(function(n){n(e)})}}}
`);

    fs.writeFileSync(entryFile, `
import createEmitter from './mitt-like.js';
export function run() {
  const emitter = createEmitter();
  let val = null;
  emitter.on('event', (v) => { val = v; });
  emitter.emit('event', 'hello world');
  return val;
}
`);

    const graph = buildDependencyGraph(entryFile, tmpDir);
    const bundle = generateBundle(graph, { minify: true });

    const sandbox = { module: { exports: {} }, exports: {}, Map, console };
    vm.createContext(sandbox);
    const mod = vm.runInContext(bundle.code, sandbox);

    assert.strictEqual(typeof mod.run, 'function');
    assert.strictEqual(mod.run(), 'hello world');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Regression Bug B: export let with multi-line arrow functions and no trailing semicolon', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-reg-nanoid-'));
  try {
    const entryFile = path.join(tmpDir, 'entry.js');
    const libFile = path.join(tmpDir, 'nanoid-like.js');

    // Reproduces exact pattern from nanoid/index.browser.js
    fs.writeFileSync(libFile, `
export let random = bytes => new Uint8Array(bytes)

export let customRandom = (alphabet, defaultSize, getRandom) => {
  let safeByteCutoff = 256 - (256 % alphabet.length)
  if (safeByteCutoff === 256) {
    let mask = alphabet.length - 1
    return (size = defaultSize) => {
      let id = ''
      let bytes = getRandom(size)
      let j = size
      while (j--) {
        id += alphabet[bytes[j] & mask]
      }
      return id
    }
  }
  return () => ''
}

export let nanoid = (size = 21) => {
  let id = ''
  let bytes = random(size)
  while (size--) {
    id += 'a'
  }
  return id
}
`);

    fs.writeFileSync(entryFile, `
import { nanoid, customRandom } from './nanoid-like.js';
export function run() {
  const gen = customRandom('abc', 5, (s) => new Uint8Array(s));
  return {
    nanoidRes: nanoid(10),
    customRes: gen()
  };
}
`);

    const graph = buildDependencyGraph(entryFile, tmpDir);
    const bundle = generateBundle(graph, { minify: true });

    const sandbox = { module: { exports: {} }, exports: {}, Uint8Array, console };
    vm.createContext(sandbox);
    const mod = vm.runInContext(bundle.code, sandbox);

    assert.strictEqual(typeof mod.run, 'function');
    const res = mod.run();
    assert.strictEqual(res.nanoidRes, 'aaaaaaaaaa');
    assert.strictEqual(typeof res.customRes, 'string');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Regression: generic export default expressions (arrow functions, objects, arrays, primitives)', () => {
  const inputs = [
    { code: 'export default (x, y) => x + y;', expect: 7, callWith: [3, 4] },
    { code: 'export default { key: "value", num: 99 };', expect: 99, prop: 'num' },
    { code: 'export default [10, 20, 30];', expect: 30, index: 2 },
    { code: 'export default 12345;', expect: 12345 }
  ];

  for (const item of inputs) {
    const transformed = transformModuleCode(item.code, 'test.js');
    const sandbox = { module: { exports: {} }, exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(transformed.code, sandbox);

    const def = sandbox.module.exports.default;
    if (typeof item.callWith !== 'undefined') {
      assert.strictEqual(def(...item.callWith), item.expect);
    } else if (typeof item.prop !== 'undefined') {
      assert.strictEqual(def[item.prop], item.expect);
    } else if (typeof item.index !== 'undefined') {
      assert.strictEqual(def[item.index], item.expect);
    } else {
      assert.strictEqual(def, item.expect);
    }
  }
});
