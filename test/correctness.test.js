import { test } from 'node:test';
import assert from 'node:assert';
import { minifyCode, generateBundle } from '../src/bundler.js';
import { transformModuleCode } from '../src/parser.js';

test('Bug 1: ASI should not be broken by stripping newlines', () => {
  const code = 'let a = 1\nlet b = 2\nlet c = a + b';
  const minified = minifyCode(code);
  const fn = new Function(`${minified}; return c;`);
  assert.strictEqual(fn(), 3);
});

test('Bug 2: Spacing for a + +b and a - -b must not collapse into ++ or --', () => {
  const code = 'const a = 5; const b = 2; const c = a + +b; const d = a - -b;';
  const minified = minifyCode(code);
  assert.ok(!minified.includes('a++b'), 'Should not collapse a + +b into a++b');
  assert.ok(!minified.includes('a--b'), 'Should not collapse a - -b into a--b');
  const fn = new Function(`${minified}; return { c, d };`);
  assert.deepStrictEqual(fn(), { c: 7, d: 7 });
});

test('Bug 3: Division followed by regex must not be treated as comment', () => {
  const code = 'const total = 100; const x = total / /10/i.exec("100")[0];';
  const minified = minifyCode(code);
  assert.ok(!minified.includes('//10/'), 'Should not convert division and regex into comment //');
  const fn = new Function(`${minified}; return x;`);
  assert.strictEqual(fn(), 10);
});

test('Bug 4: Regex with slash in character class must not terminate regex early', () => {
  const code = 'const r = /[/]/; const val = r.test("/");';
  const minified = minifyCode(code);
  const fn = new Function(`${minified}; return val;`);
  assert.strictEqual(fn(), true);
});

test('Bug 5: Nested template literals with expressions and comments', () => {
  const code = 'const x = `hello ${ `world ${ 1 + 2 } // not a comment` } end`;';
  const minified = minifyCode(code);
  assert.ok(minified.includes('not a comment'), 'Should preserve string content in nested template');
  const fn = new Function(`${minified}; return x;`);
  assert.strictEqual(fn(), 'hello world 3 // not a comment end');
});

test('Bug 6: Destructured exports (objects and arrays)', () => {
  const code = `
    const source = { x: 10, y: 20, z: 30 };
    export const { x, y } = source;
    export const [ a, b ] = [ 1, 2 ];
  `;
  const result = transformModuleCode(code, 'test.js');
  assert.ok(!result.code.includes('export '), 'All export statements should be transformed');
  
  // Test execution in module context
  const mod = { exports: {} };
  const fn = new Function('require', 'module', 'exports', result.code);
  fn(() => {}, mod, mod.exports);
  assert.strictEqual(mod.exports.x, 10);
  assert.strictEqual(mod.exports.y, 20);
  assert.strictEqual(mod.exports.a, 1);
  assert.strictEqual(mod.exports.b, 2);
});

test('Bug 7: Namespace re-exports export * as ns and export *', () => {
  const code1 = "export * as utils from './utils.js';";
  const result1 = transformModuleCode(code1, 'index.js');
  assert.ok(!result1.code.includes('export *'), 'export * as should be transformed');
  assert.ok(result1.dependencies.includes('./utils.js'));

  const code2 = "export * from './math.js';";
  const result2 = transformModuleCode(code2, 'index.js');
  assert.ok(!result2.code.includes('export *'), 'export * from should be transformed');
  assert.ok(result2.dependencies.includes('./math.js'));
});

test('Bug 8: Import attributes with and assert must be cleanly parsed', () => {
  const code = "import data from './data.json' with { type: 'json' };";
  const result = transformModuleCode(code, 'app.js');
  assert.ok(!result.code.includes("with { type: 'json' }"), 'with attribute should not leave trailing syntax error');
  assert.ok(result.dependencies.includes('./data.json'));
});

test('Bug 9: export default object must not pollute named exports', () => {
  const code = "export const a = 99; export default { a: 1, b: 2 };";
  const result = transformModuleCode(code, 'config.js');
  const mod = { exports: {} };
  const fn = new Function('require', 'module', 'exports', result.code);
  fn(() => {}, mod, mod.exports);
  assert.strictEqual(mod.exports.a, 99, 'Named export a should be 99, not overwritten by default');
  assert.deepStrictEqual(mod.exports.default, { a: 1, b: 2 });
});

test('Bug 10: Live bindings for exported mutable variables', () => {
  const code = `
    export let count = 0;
    export function increment() { count++; }
  `;
  const result = transformModuleCode(code, 'counter.js');
  const mod = { exports: {} };
  const fn = new Function('require', 'module', 'exports', result.code);
  fn(() => {}, mod, mod.exports);
  assert.strictEqual(mod.exports.count, 0);
  mod.exports.increment();
  assert.strictEqual(mod.exports.count, 1, 'count getter should return updated live value 1');
});

test('Circular imports: functions are exported and callable across cycles', () => {
  // Module A: imports b, exports a()
  const codeA = `
    import { b } from './b.js';
    export function a() { return 'a' + b(); }
  `;
  // Module B: imports a, exports b()
  const codeB = `
    import { a } from './a.js';
    export function b() { return 'b'; }
  `;

  const transA = transformModuleCode(codeA, 'a.js');
  const transB = transformModuleCode(codeB, 'b.js');

  const modules = {
    './a.js': transA.code,
    './b.js': transB.code
  };

  const installed = {};
  function fakeRequire(id) {
    if (installed[id]) return installed[id].exports;
    const m = installed[id] = { exports: {} };
    const fn = new Function('require', 'module', 'exports', modules[id]);
    fn(fakeRequire, m, m.exports);
    return m.exports;
  }

  const modA = fakeRequire('./a.js');
  assert.strictEqual(typeof modA.a, 'function');
  assert.strictEqual(modA.a(), 'ab');
});
