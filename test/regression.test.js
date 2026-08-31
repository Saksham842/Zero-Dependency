import test from 'node:test';
import assert from 'node:assert/strict';
import { minifyCss, transformModuleCode } from '../src/parser.js';
import { minifyCode } from '../src/bundler-minify.js';
import { build, rebuild, __resetForTest } from '../src/graph.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';

function makeFixture(files) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-reg-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return tmpDir;
}

test('P0.2: minifyCss preserves strings containing comment-like text', () => {
  const css1 = 'body { content: "/* not a comment */"; }';
  assert.equal(minifyCss(css1), 'body{content:"/* not a comment */";}');

  const css2 = "body { content: '/* safe */'; }";
  assert.equal(minifyCss(css2), "body{content:'/* safe */';}");

  const css3 = '/* real comment */ body { color: red; }';
  assert.equal(minifyCss(css3), 'body{color:red;}');

  const css4 = 'body { content: "a */ b"; }';
  assert.equal(minifyCss(css4), 'body{content:"a */ b";}');
});

test('P0.1: parseExport destructured export throws BuildError', () => {
  assert.throws(() => {
    transformModuleCode('export const { x, y } = obj;', 'test.js');
  }, (err) => err.name === 'BuildError' && err.message.includes('Destructured export declarations'));

  assert.throws(() => {
    transformModuleCode('export let [a, b] = arr;', 'test.js');
  }, (err) => err.name === 'BuildError' && err.message.includes('Destructured export declarations'));
});

test('P1.1: parseExport supports multiple bindings in a single declaration', () => {
  const { code } = transformModuleCode('export let a = 1, b = 2;', 'test.js');
  assert.match(code, /let a = module\.exports\.a\s*=\s*1,\s*b = module\.exports\.b\s*=\s*2;/);

  const { code: code2 } = transformModuleCode('export const x = f(1, 2), y = g(3, 4);', 'test.js');
  assert.match(code2, /const x = module\.exports\.x\s*=\s*f\(1, 2\),\s*y = module\.exports\.y\s*=\s*g\(3, 4\);/);
});

test('P1.2: minifyCode preserves ASI semantics for return, throw, break, continue', () => {
  const retCode = minifyCode('function f() { return\n42; } const res = f();');
  assert.ok(retCode.includes('return;'), 'return statement should be terminated with semicolon');

  const throwCode = minifyCode('function g() { throw\nnew Error("x"); }');
  assert.ok(throwCode.includes('throw;'), 'throw statement should be terminated with semicolon');

  const continueCode = minifyCode('while(true) { continue\nlabel; }');
  assert.ok(continueCode.includes('continue;'));
});

test('P1.3: incrementalBuild propagates BuildError when imported file is deleted', () => {
  const dir = makeFixture({
    'src/a.js': "import { b } from './b.js'; export const a = 'A' + b;",
    'src/b.js': "export const b = 'B';",
    'src/index.js': "import { a } from './a.js'; console.log(a);"
  });

  __resetForTest();
  build(path.join(dir, 'src/index.js'), dir);
  
  // Delete b.js
  const bPath = path.join(dir, 'src/b.js');
  fs.unlinkSync(bPath);

  assert.throws(() => {
    rebuild(path.join(dir, 'src/index.js'), [bPath]);
  }, (err) => err.name === 'BuildError' && err.message.includes("Cannot resolve module"));

  // Restore b.js
  fs.writeFileSync(bPath, "export const b = 'B_new';");
  const result = rebuild(path.join(dir, 'src/index.js'), [bPath]);
  assert.ok(result.length === 3, 'Graph should recover after file is restored');
});
