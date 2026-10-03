import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { encodeVlq, decodeVlq, generateSourceMap } from '../src/sourcemap.js';
import { resolveModulePath, resolveNodeModule, transformModuleCode, buildDependencyGraph } from '../src/parser.js';
import { generateBundle, bundleToFile } from '../src/bundler.js';
import { BuildError } from '../src/errors.js';
import * as nodeModule from 'node:module';

const ROOT_DIR = process.cwd();

// =============================================================================
// 1. Source Map Generation & Base64 VLQ Tests
// =============================================================================
test('Base64 VLQ encoder & decoder', () => {
  const testValues = [0, 1, -1, 2, -2, 15, -15, 16, -16, 31, 32, 100, -100, 12345];
  for (const val of testValues) {
    const encoded = encodeVlq(val);
    assert.ok(typeof encoded === 'string' && encoded.length > 0);
    const decoded = decodeVlq(encoded);
    assert.strictEqual(decoded[0], val, `VLQ roundtrip failed for ${val}`);
  }
});

test('generateSourceMap generates valid v3 SourceMap structure', () => {
  const sources = [
    { path: 'src/index.js', content: 'console.log("hello");' },
    { path: 'src/utils.js', content: 'export const x = 1;' }
  ];
  const lineMappings = [
    [],
    [[0, 0, 0, 0]],
    [[0, 1, 0, 0]]
  ];

  const map = generateSourceMap({
    file: 'bundle.js',
    sources,
    lineMappings
  });

  assert.strictEqual(map.version, 3);
  assert.strictEqual(map.file, 'bundle.js');
  assert.deepStrictEqual(map.sources, ['src/index.js', 'src/utils.js']);
  assert.strictEqual(map.sourcesContent.length, 2);
  assert.ok(typeof map.mappings === 'string');
  assert.strictEqual(map.mappings, ';AAAA;ACAA');
});

test('Source map generation for unminified bundle', () => {
  const graph = buildDependencyGraph('src/index.js', ROOT_DIR);
  const result = generateBundle(graph, {
    minify: false,
    sourcemap: true,
    outFile: 'dist/bundle.js'
  });

  assert.ok(result.code.includes('//# sourceMappingURL=bundle.js.map'));
  assert.ok(result.sourceMap);
  assert.strictEqual(result.sourceMap.version, 3);
  assert.ok(result.sourceMap.sources.length >= 4);
  assert.ok(result.sourceMap.mappings.length > 0);
});

test('Source map generation for minified bundle', () => {
  const graph = buildDependencyGraph('src/index.js', ROOT_DIR);
  const result = generateBundle(graph, {
    minify: true,
    sourcemap: true,
    outFile: 'dist/bundle.js'
  });

  assert.ok(result.code.includes('//# sourceMappingURL=bundle.js.map'));
  assert.ok(result.sourceMap);
  assert.strictEqual(result.sourceMap.version, 3);
  assert.ok(result.sourceMap.mappings.length > 0);
});

test('bundleToFile writes .map file to disk when sourcemap: true', () => {
  const testOut = path.join(ROOT_DIR, 'dist', 'test-sourcemap-bundle.js');
  const testMap = `${testOut}.map`;

  const graph = buildDependencyGraph('src/index.js', ROOT_DIR);
  const res = bundleToFile(graph, testOut, {
    minify: false,
    sourcemap: true
  });

  assert.ok(fs.existsSync(testOut));
  assert.ok(fs.existsSync(testMap));

  const mapJson = JSON.parse(fs.readFileSync(testMap, 'utf8'));
  assert.strictEqual(mapJson.version, 3);
  assert.strictEqual(mapJson.file, 'test-sourcemap-bundle.js');

  // Cleanup
  fs.unlinkSync(testOut);
  fs.unlinkSync(testMap);
});

// =============================================================================
// 2. Bare-Import Resolution from node_modules
// =============================================================================
test('Bare import resolution with package.json "module" field', () => {
  // Create a temporary mock node_modules package
  const mockPkgDir = path.join(ROOT_DIR, 'node_modules', 'mock-esm-pkg');
  fs.mkdirSync(mockPkgDir, { recursive: true });
  fs.writeFileSync(path.join(mockPkgDir, 'package.json'), JSON.stringify({
    name: 'mock-esm-pkg',
    module: './es/index.js',
    main: './lib/index.js'
  }));
  const esDir = path.join(mockPkgDir, 'es');
  fs.mkdirSync(esDir, { recursive: true });
  fs.writeFileSync(path.join(esDir, 'index.js'), 'export const greeting = "hello from mock esm";');

  const importer = path.join(ROOT_DIR, 'src', 'index.js');
  const resolved = resolveModulePath(importer, 'mock-esm-pkg', ROOT_DIR);
  assert.strictEqual(resolved.replace(/\\/g, '/'), path.join(esDir, 'index.js').replace(/\\/g, '/'));

  // Cleanup
  fs.rmSync(mockPkgDir, { recursive: true, force: true });
});

test('Bare import resolution with package.json "exports" field', () => {
  const mockPkgDir = path.join(ROOT_DIR, 'node_modules', 'mock-exports-pkg');
  fs.mkdirSync(mockPkgDir, { recursive: true });
  fs.writeFileSync(path.join(mockPkgDir, 'package.json'), JSON.stringify({
    name: 'mock-exports-pkg',
    exports: {
      '.': './dist/esm.js',
      './sub': './dist/sub.js'
    }
  }));
  const distDir = path.join(mockPkgDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'esm.js'), 'export const root = true;');
  fs.writeFileSync(path.join(distDir, 'sub.js'), 'export const sub = true;');

  const importer = path.join(ROOT_DIR, 'src', 'index.js');
  const resolvedRoot = resolveModulePath(importer, 'mock-exports-pkg', ROOT_DIR);
  assert.strictEqual(resolvedRoot.replace(/\\/g, '/'), path.join(distDir, 'esm.js').replace(/\\/g, '/'));

  const resolvedSub = resolveModulePath(importer, 'mock-exports-pkg/sub', ROOT_DIR);
  assert.strictEqual(resolvedSub.replace(/\\/g, '/'), path.join(distDir, 'sub.js').replace(/\\/g, '/'));

  // Cleanup
  fs.rmSync(mockPkgDir, { recursive: true, force: true });
});

test('Bare import resolution fallback to index.js and CJS package', () => {
  const mockPkgDir = path.join(ROOT_DIR, 'node_modules', 'mock-cjs-pkg');
  fs.mkdirSync(mockPkgDir, { recursive: true });
  fs.writeFileSync(path.join(mockPkgDir, 'package.json'), JSON.stringify({
    name: 'mock-cjs-pkg',
    main: './index.js'
  }));
  fs.writeFileSync(path.join(mockPkgDir, 'index.js'), 'module.exports = { isCjs: true };');

  const importer = path.join(ROOT_DIR, 'src', 'index.js');
  const resolved = resolveModulePath(importer, 'mock-cjs-pkg', ROOT_DIR);
  assert.strictEqual(resolved.replace(/\\/g, '/'), path.join(mockPkgDir, 'index.js').replace(/\\/g, '/'));

  // Cleanup
  fs.rmSync(mockPkgDir, { recursive: true, force: true });
});

test('Missing package throws clear BuildError with suggestion', () => {
  const importer = path.join(ROOT_DIR, 'src', 'index.js');
  assert.throws(() => {
    resolveModulePath(importer, 'non-existent-lib-xyz', ROOT_DIR);
  }, (err) => {
    assert.ok(err instanceof BuildError);
    assert.ok(err.message.includes("Cannot find package 'non-existent-lib-xyz'"));
    assert.ok(err.suggestion.includes("npm install non-existent-lib-xyz"));
    return true;
  });
});

// =============================================================================
// 3. Native TypeScript Type Stripping Tests
// =============================================================================
test('Native TypeScript type stripping on .ts files', () => {
  const tsCode = `
    export interface Config {
      port: number;
      host: string;
    }
    export const serverConfig: Config = { port: 8080, host: 'localhost' };
    export function start(cfg: Config): boolean {
      return cfg.port > 0;
    }
  `;

  const hasStrip = typeof (nodeModule.stripTypeScriptTypes || nodeModule.default?.stripTypeScriptTypes) === 'function';

  if (hasStrip) {
    const result = transformModuleCode(tsCode, 'server.ts');
    assert.ok(!result.code.includes('interface Config'));
    assert.ok(!result.code.includes(': Config'));
    assert.ok(!result.code.includes(': boolean'));

    // Verify it compiles and executes in runtime
    const mod = { exports: {} };
    const fn = new Function('require', 'module', 'exports', result.code);
    fn(() => {}, mod, mod.exports);
    assert.strictEqual(mod.exports.serverConfig.port, 8080);
    assert.strictEqual(mod.exports.start(mod.exports.serverConfig), true);
  } else {
    // On older Node.js, should throw clear BuildError
    assert.throws(() => {
      transformModuleCode(tsCode, 'server.ts');
    }, (err) => {
      assert.ok(err instanceof BuildError);
      assert.ok(err.message.includes('Native TypeScript type stripping is not available'));
      return true;
    });
  }
});
