# ZeroPack Correctness Audit: `src/parser.js` & `src/bundler.js`

**Date:** 2026-10-04  
**Audit Target:** Parser (`src/parser.js`) & Bundler / Minifier (`src/bundler.js`)  
**Environment:** Node.js >= 18 (zero third-party dependencies)

---

## 1. Executive Summary

A comprehensive correctness audit of `src/parser.js` and `src/bundler.js` confirmed critical bugs in the handwritten minifier and ESM-to-CJS transform pipeline. These bugs cause runtime crashes, syntax errors, and broken semantics for standard JavaScript patterns.

---

## 2. Confirmed Bugs & Analysis

### 2.1 Minifier (`src/bundler.js: minifyCode`)

#### Bug 1: ASI (Automatic Semicolon Insertion) Destroyed by Newline Stripping
- **Location:** `src/bundler.js:120-130`
- **Issue:** All whitespace including newlines (`\n`, `\r`) outside string literals is collapsed into spaces (`' '`) or stripped. Statements separated by newlines without semicolons (e.g. `let a = 1\nlet b = 2`) become `let a=1 let b=2`.
- **Impact:** Throws `SyntaxError: Unexpected identifier 'let'` upon bundle execution.
- **Failing Test Case:**
  ```javascript
  const input = 'let a = 1\nlet b = 2';
  const minified = minifyCode(input);
  new Function(minified)(); // Throws SyntaxError
  ```

#### Bug 2: Unary Operator Spacing Collapsed (`a + +b` and `a - -b`)
- **Location:** `src/bundler.js:122-126` & `src/bundler.js:133-141`
- **Issue:** When the output ends with `+` or `-`, whitespace after it is dropped. `a + +b` is collapsed into `a++b` and `a - -b` into `a--b`.
- **Impact:** Converts binary addition of a unary positive into a postfix increment (e.g. `a++b` which is a `SyntaxError: Unexpected identifier 'b'`).
- **Failing Test Case:**
  ```javascript
  const input = 'const a = 1, b = 2; const c = a + +b; const d = a - -b;';
  const minified = minifyCode(input);
  // minified contains 'a++b' and 'a--b', throwing SyntaxError
  new Function(minified)();
  ```

#### Bug 3: Division Followed by Regex Literal Stripped as Single-Line Comment (`//`)
- **Location:** `src/bundler.js:78-84` & `src/bundler.js:97-111`
- **Issue:** In an expression like `const x = total / /pattern/i.exec(str)[0];`, whitespace between the division operator `/` and regex `/` is stripped. When the second `/` is encountered, `/` + `/` matches the single-line comment branch `char === '/' && nextChar === '/'`, stripping the rest of the line as a comment.
- **Impact:** Drops code silently, resulting in truncated statements and unrecoverable `SyntaxError`.
- **Failing Test Case:**
  ```javascript
  const input = 'const total = 100; const x = total / /10/i.exec("100")[0];';
  const minified = minifyCode(input);
  assert.ok(!minified.includes('//10/'));
  ```

#### Bug 4: Regex Character Class Slashes Prematurely Terminate Regex State
- **Location:** `src/bundler.js:106-111`
- **Issue:** Regex scanning does not track `[...]` character classes. A slash inside `[...]` (such as `/[/]/` or `/[a/b]/`) satisfies `char === '/' && inRegex` and toggles `inRegex = false`.
- **Impact:** Corrupts regex literals and parses following regex contents as JavaScript code.
- **Failing Test Case:**
  ```javascript
  const input = 'const r = /[/]/; const a = 1;';
  const minified = minifyCode(input);
  assert.strictEqual(new RegExp('[/]').test('/'), true);
  ```

#### Bug 5: Nested Template Literals Corrupt State and Strip Code
- **Location:** `src/bundler.js:63-75`
- **Issue:** `inTemplateLiteral` is represented by a flat boolean rather than a lexical context stack. When a nested template literal occurs inside `${ ... }` (e.g. `` `outer ${ `inner // comment` }` ``), encountering the inner backtick toggles `inTemplateLiteral` to `false`.
- **Impact:** Inside the nested template, whitespace is collapsed and comments like `//` are stripped, corrupting string content or truncating template expressions.
- **Failing Test Case:**
  ```javascript
  const input = 'const x = `a ${ `b // not comment` } c`;';
  const minified = minifyCode(input);
  // minified truncates everything after //
  assert.ok(minified.includes('not comment'));
  ```

---

### 2.2 ESM to CJS Transform (`src/parser.js: transformModuleCode`)

#### Bug 6: Unsupported Destructured Exports
- **Location:** `src/parser.js:166-171`
- **Issue:** The export transform regex only handles single identifiers:
  `/(?:^|\n)\s*export\s+(const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g`
  Destructured exports such as `export const { x, y } = obj;` or `export const [ a, b ] = arr;` are unmatched and left as raw ESM syntax inside CJS runtime functions.
- **Impact:** Throws `SyntaxError: Unexpected token 'export'`.
- **Failing Test Case:**
  ```javascript
  const code = 'export const { x, y } = { x: 1, y: 2 }; export const [ a, b ] = [ 3, 4 ];';
  const transformed = transformModuleCode(code, 'mod.js');
  assert.ok(!transformed.code.includes('export '));
  ```

#### Bug 7: Unsupported Namespace Re-Exports (`export * as ns` and `export *`)
- **Location:** `src/parser.js`
- **Issue:** Only `import * as ns from 'specifier'` is implemented. Statements like `export * as utils from './utils.js';` and `export * from './math.js';` are completely ignored and left in the output bundle.
- **Impact:** Bundling fails with `SyntaxError: Unexpected token 'export'`.
- **Failing Test Case:**
  ```javascript
  const code1 = "export * as utils from './utils.js';";
  const code2 = "export * from './math.js';";
  assert.ok(!transformModuleCode(code1, 'mod.js').code.includes('export *'));
  assert.ok(!transformModuleCode(code2, 'mod.js').code.includes('export *'));
  ```

#### Bug 8: Trailing Syntax Error on Import Attributes (`with` / `assert`)
- **Location:** `src/parser.js:81`
- **Issue:** Regex for `import ... from 'specifier'` stops matching at the closing quote. Statements using standard import attributes such as `import data from './data.json' with { type: 'json' };` leave ` with { type: 'json' };` as unparsed trailing code.
- **Impact:** Throws `SyntaxError: Unexpected token 'with'`.
- **Failing Test Case:**
  ```javascript
  const code = "import data from './data.json' with { type: 'json' };";
  const transformed = transformModuleCode(code, 'mod.js');
  assert.ok(!transformed.code.includes("with { type: 'json' }"));
  ```

#### Bug 9: `export default` Object Pollution of Named Exports
- **Location:** `src/parser.js:161`
- **Issue:** When handling `export default <expr>`, line 161 injects:
  `if (typeof __defaultExport === 'object' && __defaultExport !== null) { Object.assign(module.exports, __defaultExport); }`
  This erroneously copies all properties of the default export object directly onto `module.exports`, causing collisions with named exports and corrupting arrays and custom classes.
- **Impact:** Non-standard ESM behavior and named export namespace pollution.
- **Failing Test Case:**
  ```javascript
  const code = "export default { a: 1, b: 2 }; export const a = 99;";
  // Should preserve module.exports.a = 99 and module.exports.default = { a: 1, b: 2 }
  ```

#### Bug 10: Missing Live Bindings for Mutable Exports
- **Location:** `src/parser.js:167-171`
- **Issue:** Exported mutable variables (`export let count = 0; export function inc() { count++; }`) are assigned by value (`let count = module.exports.count = 0;`). When `inc()` mutates `count`, `module.exports.count` remains `0`.
- **Impact:** Importers receive stale values rather than live ESM bindings.
- **Failing Test Case:**
  ```javascript
  // Importers should observe updated value when count is modified
  ```

#### Bug 11: Circular Imports Resolution Order
- **Location:** `src/parser.js` & `src/bundler.js`
- **Issue:** Exported functions and bindings must be available on `module.exports` before importing modules invoke them in circular dependency cycles.
