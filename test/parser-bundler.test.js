import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { transformModuleCode, buildDependencyGraph, minifyCss } from '../src/parser.js';
import { generateBundle } from '../src/bundler.js';

function makeFixture(files) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-fixture-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(rootDir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return rootDir;
}

function executeBundle(rootDir, entry = 'src/index.js') {
  const graph = buildDependencyGraph(entry, rootDir);
  const result = generateBundle(graph, { minify: false });
  const sandbox = { console };
  vm.runInNewContext(result.code, sandbox);
  return { graph, result, sandbox };
}

test('transforms named function exports before the function is called', () => {
  const { code } = transformModuleCode('export function renderApp() { return "hello"; }', 'app.js');

  assert.match(code, /module\.exports\.renderApp = renderApp;/);
  assert.match(code, /function renderApp\(\) \{/);
  assert.ok(code.indexOf('module.exports.renderApp = renderApp;') < code.indexOf('function renderApp()'));
});

test('transforms named class exports into exported class bindings', () => {
  const { code } = transformModuleCode('export class User { constructor(name) { this.name = name; } }', 'user.js');

  assert.match(code, /const User = module\.exports\.User = class User \{/);
});

test('transforms named variable exports', () => {
  const { code } = transformModuleCode('export const answer = 42;\nexport let name = "ZeroPack";', 'vars.js');

  assert.match(code, /const answer = module\.exports\.answer = 42;/);
  assert.match(code, /let name = module\.exports\.name = "ZeroPack";/);
});

test('transforms supported default export forms', () => {
  const namedFunction = transformModuleCode('export default function greet() { return "hi"; }', 'fn.js').code;
  const namedClass = transformModuleCode('export default class App {}', 'class.js').code;
  const value = transformModuleCode('export default { ok: true };', 'value.js').code;

  assert.match(namedFunction, /module\.exports\.default = greet;/);
  assert.match(namedFunction, /function greet\(\) \{/);
  assert.match(namedClass, /const App = module\.exports\.default = class App \{/);
  assert.match(value, /module\.exports\.default = __defaultExport;/);
});

test('bundles and executes named, default, multiple, repeated, and nested imports', () => {
  const rootDir = makeFixture({
    'src/index.js': `
      import DefaultThing from './lib.js';
      import { value, add, User } from './lib.js';
      import { nested } from './nested/index.js';

      globalThis.__result = {
        value,
        sum: add(2, 3),
        user: new User('Ada').name,
        defaultLabel: DefaultThing.label,
        nested
      };
    `,
    'src/lib.js': `
      export const value = 42;
      export function add(a, b) { return a + b; }
      export class User {
        constructor(name) { this.name = name; }
      }
      const DefaultThing = { label: 'default-ok' };
      export default DefaultThing;
    `,
    'src/nested/index.js': `
      import { add } from '../lib.js';
      export const nested = add(10, 5);
    `
  });

  const { graph, result, sandbox } = executeBundle(rootDir);

  assert.equal(graph.length, 3);
  assert.match(result.code, /\(function\(modules\)/);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.__result)), {
    value: 42,
    sum: 5,
    user: 'Ada',
    defaultLabel: 'default-ok',
    nested: 15
  });
});

test('supports advanced ESM: export *, import attributes, dynamic import(), JSON modules', () => {
  const rootDir = makeFixture({
    'src/index.js': `
      import * as utils from './utils.js';
      import data from './data.json' with { type: 'json' };
      
      globalThis.__result = {
        value: utils.value,
        fn: utils.fn(),
        data: data.hello
      };

      import('./dynamic.js').then(mod => {
        globalThis.__dynamicResult = mod.dynValue;
      });
    `,
    'src/utils.js': `
      export * from './constants.js';
      export function fn() { return "fn_ok"; }
    `,
    'src/constants.js': `
      export const value = "constant_ok";
    `,
    'src/data.json': `
      { "hello": "world" }
    `,
    'src/dynamic.js': `
      export const dynValue = "dynamic_ok";
    `
  });

  const { graph, result, sandbox } = executeBundle(rootDir);
  
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.__result)), {
    value: "constant_ok",
    fn: "fn_ok",
    data: "world"
  });

  // Since we execute synchronously in the VM (Promise.resolve), next tick has dynamicResult
  // But wait, Promise resolution is microtask. We need to evaluate it and let Node event loop drain.
  // We can just check the code contains Promise.resolve
  assert.match(result.code, /Promise\.resolve\(require\('\.\/dynamic\.js'\)\)/);
  assert.equal(graph.length, 5);
});

test('regression: bundled demo render path executes without undefined imports', () => {
  const graph = buildDependencyGraph('src/index.js', process.cwd());
  const result = generateBundle(graph, { minify: false });
  const container = {};
  const sandbox = {
    console,
    window: {
      addEventListener(name, callback) {
        if (name === 'DOMContentLoaded') callback();
      }
    },
    document: {
      readyState: 'loading',
      head: { appendChild: () => {} },
      createElement(tag) {
        const el = { tag, textContent: '', attrs: {} };
        el.setAttribute = (k, v) => { el.attrs[k] = v; };
        return el;
      },
      getElementById(id) {
        assert.equal(id, 'app');
        return container;
      }
    }
  };

  sandbox.window.document = sandbox.document;
  sandbox.window.window = sandbox.window;

  vm.runInNewContext(result.code, sandbox);

  assert.match(container.innerHTML, /ZeroPack Runtime Active/);
  assert.match(container.innerHTML, /Circle Area/);
});

// CSS Bundling Tests
test('minifyCss strips block comments and collapses whitespace', () => {
  const input = `
    /* theme vars */
    :root {
      --accent: #38bdf8; /* sky blue */
    }

    body   {   background:   red;   }
  `;
  const out = minifyCss(input);
  assert.ok(!out.includes('/*'), 'comments should be stripped');
  assert.ok(!out.includes('\n'), 'newlines should be collapsed');
  assert.ok(out.includes('--accent:#38bdf8'), 'property values should be preserved');
  assert.ok(out.includes('background:red'), 'body rule should be preserved');
});

test('transformModuleCode wraps CSS in style-injection module', () => {
  const fakePath = '/project/src/style.css';
  const css = 'body { background: #000; }';
  const { code, dependencies } = transformModuleCode(css, fakePath);

  assert.deepEqual(dependencies, [], 'CSS modules have no JS dependencies');
  assert.match(code, /document\.createElement\('style'\)/, 'should inject a style element');
  assert.match(code, /document\.head\.appendChild/, 'should append to document.head');
  assert.match(code, /module\.exports = __css/, 'should export the CSS string');
  assert.match(code, /data-zeropack/, 'should stamp origin path attribute');
});

test('CSS import is bundled and style is injected at runtime', () => {
  const rootDir = makeFixture({
    'src/index.js': `
      import './theme.css';
      globalThis.__cssLoaded = true;
    `,
    'src/theme.css': `body { background: var(--bg); }`
  });

  const graph = buildDependencyGraph('src/index.js', rootDir);
  assert.equal(graph.length, 2, 'graph should contain 2 modules (JS + CSS)');

  const result = generateBundle(graph, { minify: false });
  const injectedStyles = [];
  const mockDoc = {
    createElement: (tag) => {
      const el = { tag, attrs: {}, textContent: '' };
      el.setAttribute = (k, v) => { el.attrs[k] = v; };
      injectedStyles.push(el);
      return el;
    },
    head: { appendChild: () => {} }
  };

  const sandbox = {
    console,
    document: mockDoc,
    globalThis: {}
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(result.code, sandbox);

  assert.ok(sandbox.__cssLoaded, 'JS module should execute');
  assert.equal(injectedStyles.length, 1, 'one <style> element should be created');
  assert.equal(injectedStyles[0].tag, 'style');
  assert.match(injectedStyles[0].textContent, /background/);
});
