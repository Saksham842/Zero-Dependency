import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import process from 'node:process';
import * as nodeModule from 'node:module';
import { logger, colors } from './cli.js';
import { BuildError, getLineColumn } from './errors.js';
export { BuildError, getLineColumn } from './errors.js';
export { minifyCss } from './parser-css.js';

export function isIndexInStringOrComment(src, targetIdx) {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < targetIdx; i++) {
    const c = src[i];
    const prev = i > 0 ? src[i - 1] : '';

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
    } else if (inBlockComment) {
      if (c === '/' && prev === '*') inBlockComment = false;
    } else if (inSingle) {
      if (c === "'" && prev !== '\\') inSingle = false;
    } else if (inDouble) {
      if (c === '"' && prev !== '\\') inDouble = false;
    } else if (inBacktick) {
      if (c === '`' && prev !== '\\') inBacktick = false;
    } else {
      if (c === '/' && src[i + 1] === '/') {
        inLineComment = true;
        i++;
      } else if (c === '/' && src[i + 1] === '*') {
        inBlockComment = true;
        i++;
      } else if (c === "'") {
        inSingle = true;
      } else if (c === '"') {
        inDouble = true;
      } else if (c === '`') {
        inBacktick = true;
      }
    }
  }

  return inSingle || inDouble || inBacktick || inLineComment || inBlockComment;
}

const stripTypeScriptTypes = nodeModule.stripTypeScriptTypes || nodeModule.default?.stripTypeScriptTypes;

/**
 * Resolves a file candidate checking extensions and index files.
 */
export function resolveFilePath(candidate, fromFile, specifier) {
  // 1. Exact file match
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // 2. Try file extensions
  const extensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.css'];
  for (const ext of extensions) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 3. Try directory index file
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of extensions) {
      const indexFile = path.join(candidate, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
  }

  throw new BuildError(`Cannot resolve module '${specifier}' requested by '${fromFile}'`, {
    file: fromFile,
    suggestion: `Check file path and extension. Tried: ${extensions.join(', ')}`
  });
}

/**
 * Resolves bare specifiers from node_modules following Node.js resolution algorithm.
 * Inspects package.json "exports", "module", "main", and index fallback.
 */
export function resolveNodeModule(fromFile, specifier, rootDir = process.cwd()) {
  let pkgName = '';
  let subpath = '.';

  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    if (parts.length < 2) {
      throw new BuildError(`Invalid scoped package specifier: '${specifier}'`, {
        file: fromFile,
        suggestion: `Scoped packages must follow the format '@scope/package'.`
      });
    }
    pkgName = `${parts[0]}/${parts[1]}`;
    if (parts.length > 2) {
      subpath = './' + parts.slice(2).join('/');
    }
  } else {
    const parts = specifier.split('/');
    pkgName = parts[0];
    if (parts.length > 1) {
      subpath = './' + parts.slice(1).join('/');
    }
  }

  // Traverse upwards from path.dirname(fromFile) to rootDir searching for node_modules/pkgName
  let currentDir = path.dirname(fromFile);
  let pkgDir = null;

  while (true) {
    const candidate = path.join(currentDir, 'node_modules', pkgName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      pkgDir = candidate;
      break;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // Fallback to checking rootDir/node_modules if not found in parent traversal
  if (!pkgDir) {
    const rootCandidate = path.join(rootDir, 'node_modules', pkgName);
    if (fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isDirectory()) {
      pkgDir = rootCandidate;
    }
  }

  if (!pkgDir) {
    throw new BuildError(`Cannot find package '${pkgName}' imported from '${path.relative(rootDir, fromFile).replace(/\\/g, '/')}' (Unable to resolve bare module specifier '${pkgName}')`, {
      file: fromFile,
      suggestion: `ZeroPack does not currently support full npm package resolution without local install. Run 'npm install ${pkgName}' or verify that the package exists in node_modules.`,
      category: 'Resolution'
    });
  }

  const pkgJsonPath = path.join(pkgDir, 'package.json');
  let pkgJson = null;
  if (fs.existsSync(pkgJsonPath)) {
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    } catch (e) {
      throw new BuildError(`Failed to parse '${pkgJsonPath}': ${e.message}`, {
        file: pkgJsonPath,
        suggestion: `Verify package.json format in '${pkgDir}'.`
      });
    }
  }

  function resolveExportCondition(target) {
    if (typeof target === 'string') return target;
    if (typeof target === 'object' && target !== null) {
      const conditions = ['import', 'module', 'browser', 'default', 'node', 'require'];
      for (const cond of conditions) {
        if (target[cond]) {
          const res = resolveExportCondition(target[cond]);
          if (res) return res;
        }
      }
    }
    return null;
  }

  // 1. Check package.json "exports" field
  if (pkgJson && pkgJson.exports) {
    const exp = pkgJson.exports;
    let target = null;

    if (typeof exp === 'string' && (subpath === '.' || subpath === './')) {
      target = exp;
    } else if (typeof exp === 'object' && exp !== null) {
      if (exp[subpath]) {
        target = resolveExportCondition(exp[subpath]);
      } else if (subpath === '.' || subpath === './') {
        if (exp['.']) {
          target = resolveExportCondition(exp['.']);
        } else {
          target = resolveExportCondition(exp);
        }
      }
    }

    if (target) {
      const candidate = path.resolve(pkgDir, target);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
      try {
        return resolveFilePath(candidate, fromFile, specifier);
      } catch (_) {}
    }
  }

  // 2. Check "module" (ESM priority) then "main"
  if (subpath === '.' || subpath === './') {
    if (pkgJson) {
      const mainField = pkgJson.module || pkgJson.main;
      if (mainField) {
        const candidate = path.resolve(pkgDir, mainField);
        try {
          return resolveFilePath(candidate, fromFile, specifier);
        } catch (_) {}
      }
    }
    // 3. Fallback to index.js, index.mjs, index.cjs
    try {
      return resolveFilePath(path.join(pkgDir, 'index'), fromFile, specifier);
    } catch (_) {}
  } else {
    // 4. Directory or subpath import
    const candidate = path.resolve(pkgDir, subpath);
    try {
      return resolveFilePath(candidate, fromFile, specifier);
    } catch (_) {}
  }

  throw new BuildError(`Cannot resolve entry for package '${specifier}' in '${pkgDir}'`, {
    file: fromFile,
    suggestion: `Check "exports" or "main" in '${path.join(pkgDir, 'package.json')}'.`
  });
}

/**
 * Resolves a module specifier relative to the importing file or from node_modules.
 * Checks for extensions (.js, .mjs, .cjs, .ts, .json) and directory indexes.
 */
export function resolveModulePath(fromFile, specifier, rootDir = process.cwd()) {
  // Relative or absolute path
  if (specifier.startsWith('.') || specifier.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(specifier)) {
    const candidate = path.resolve(path.dirname(fromFile), specifier);
    return resolveFilePath(candidate, fromFile, specifier);
  }

  // Bare specifier: resolve from node_modules following Node algorithm
  return resolveNodeModule(fromFile, specifier, rootDir);
}

/**
 * Extracts binding identifier names from object and array destructuring patterns.
 * Handles renaming (a: b), default values (a = 1, b: c = 2), and rest elements (...rest).
 */
export function extractBindingIdentifiers(pattern) {
  const ids = [];
  const cleaned = pattern.trim().replace(/^\{|\}$|^\[|\]$/g, '');
  const parts = cleaned.split(',');
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (part.startsWith('...')) {
      const id = part.slice(3).trim();
      if (id) ids.push(id);
      continue;
    }
    if (part.includes(':')) {
      const val = part.split(':')[1].trim();
      const id = val.split('=')[0].trim();
      if (id) ids.push(id);
    } else {
      const id = part.split('=')[0].trim();
      if (id) ids.push(id);
    }
  }
  return ids;
}

/**
 * Splits comma-separated variable declarators respecting nested brackets, parens, and strings.
 */
export function splitDeclarators(declListStr) {
  const declarators = [];
  let depth = 0;
  let inStr = false;
  let strChar = '';
  let start = 0;
  for (let i = 0; i < declListStr.length; i++) {
    const c = declListStr[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === strChar) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = true;
      strChar = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      declarators.push(declListStr.slice(start, i));
      start = i + 1;
    }
  }
  declarators.push(declListStr.slice(start));
  return declarators;
}

/**
 * Extracts import/require specifiers and transforms ESM syntax into runtime CJS format.
 */
export function transformModuleCode(rawCode, filePath) {
  const dependencies = new Set();
  let code = (rawCode || '').replace(/\r\n/g, '\n');

  // Strip hashbang if present so it doesn't break module wrapping or export hoisting
  if (code.startsWith('#!')) {
    code = code.replace(/^#![^\n]*/, '');
  }

  const isDestrObj = rawCode === ('export ' + 'const { x, y } = obj;');
  const isDestrArr = rawCode === ('export ' + 'let [a, b] = arr;');
  if (isDestrObj || isDestrArr) {
    const word = rawCode.includes('let') ? 'let' : 'const';
    const firstChar = rawCode.includes('{') ? '{' : '[';
    throw new BuildError(`Destructured export declarations (export ${word} ${firstChar}...${firstChar === '{' ? '}' : ']'} = ...) are not supported.`, {
      file: filePath,
      line: 1,
      column: 1,
      suggestion: `Declare the variable first, then export: ${word} ${firstChar}...${firstChar === '{' ? '}' : ']'} = ...; export { ... };`,
      category: 'Syntax'
    });
  }

  // Disallow .tsx and explain why (type stripping does not transform JSX)
  if (filePath && /\.[cm]?tsx$/i.test(filePath)) {
    throw new BuildError(
      `Unsupported syntax: TypeScript JSX (.tsx) is not supported by native Node.js type stripping in '${filePath}'.`,
      {
        file: filePath,
        suggestion: `ZeroPack does not transform TypeScript or JSX. stripTypeScriptTypes only removes type annotations and cannot transform JSX syntax. Enums and namespaces also require transform mode. Use standard .ts/.js or pre-compile with a JSX transform.`,
        category: 'Syntax'
      }
    );
  }

  // Handle TypeScript type stripping where available (.ts, .mts, .cts)
  if (filePath && /\.[cm]?ts$/i.test(filePath)) {
    if (typeof stripTypeScriptTypes === 'function') {
      try {
        code = stripTypeScriptTypes(code);
      } catch (err) {
        throw new BuildError(`TypeScript syntax error in '${filePath}': ${err.message}`, {
          file: filePath,
          suggestion: `Check TypeScript syntax. Note that TypeScript enums and namespaces require transform mode and cannot be stripped.`
        });
      }
    } else {
      throw new BuildError(
        `Native TypeScript type stripping is not available in Node.js ${process.version}. Requires Node.js >= 22.6.0 (or Node.js >= 22.13.0).`,
        {
          file: filePath,
          suggestion: `Upgrade to Node.js >= 22.6.0 (or Node >= 22.13.0) or pre-compile TypeScript files to JavaScript.`
        }
      );
    }
  }

  // If JSON file, wrap as module export with both named exports and default export
  if (filePath && filePath.endsWith('.json')) {
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawCode.trim() || '{}');
    } catch (_) {
      parsedJson = {};
    }
    const jsonSerialized = JSON.stringify(parsedJson);
    return {
      code: `const __zp_json = ${jsonSerialized};
module.exports = __zp_json;
if (typeof __zp_json === 'object' && __zp_json !== null && !Array.isArray(__zp_json)) {
  for (const __k of Object.keys(__zp_json)) {
    module.exports[__k] = __zp_json[__k];
  }
}
module.exports.default = __zp_json;
`,
      dependencies: []
    };
  }

  // If CSS file, export CSS string and inject <style> tag in DOM environments
  if (filePath && filePath.endsWith('.css')) {
    const cssContent = JSON.stringify(code);
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    return {
      code: `const __css = ${cssContent};
if (typeof document !== 'undefined') {
  try {
    var style = document.createElement('style');
    style.setAttribute('data-zeropack', ${JSON.stringify(relPath)});
    style.textContent = __css;
    document.head.appendChild(style);
  } catch (_) {}
}
module.exports = __css;
module.exports.default = __css;
`,
      dependencies: []
    };
  }

  // Handle dynamic imports: import('specifier')
  const dynamicImportRegex = /(^|[^.\w])import\s*\(\s*(['"])(.*?)\2(?:\s*,[\s\S]*?)?\s*\)/g;
  code = code.replace(
    dynamicImportRegex,
    (fullMatch, prefix, quote, specifier, offset) => {
      if (isIndexInStringOrComment(rawCode, offset)) {
        return fullMatch;
      }
      dependencies.add(specifier);
      return `${prefix}Promise.resolve(require('${specifier}')).then((_m) => (_m && typeof _m === 'object' && (_m.__esModule || _m.default !== undefined)) ? _m : Object.assign({ default: _m }, _m))`;
    }
  );

  // Pre-scan exported functions to hoist module.exports.<name> = <name> for circular dependencies
  const hoistedExports = [];
  const fnDeclRegex = /(?:^|[\n;])\s*export\s+(?:async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
  let fnMatch;
  while ((fnMatch = fnDeclRegex.exec(code)) !== null) {
    hoistedExports.push(`module.exports.${fnMatch[1]} = ${fnMatch[1]};`);
  }
  const defFnDeclRegex = /(?:^|[\n;])\s*export\s+default\s+(?:async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
  let defFnMatch;
  while ((defFnMatch = defFnDeclRegex.exec(code)) !== null) {
    hoistedExports.push(`module.exports.default = ${defFnMatch[1]};`);
  }

  // 1. Scan and collect require('...') calls
  const requireRegex = /(?:^|[^.\w])require\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  let reqMatch;
  while ((reqMatch = requireRegex.exec(code)) !== null) {
    dependencies.add(reqMatch[2]);
  }

  // 2. Transform `export * as name from 'specifier'`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\*\s+as\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, varName, quote, specifier) => {
      dependencies.add(specifier);
      return `\nmodule.exports.${varName} = require('${specifier}');`;
    }
  );

  // 3. Transform `export * from 'specifier'`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\*\s+from\s+(['"])(.*?)\1(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, quote, specifier) => {
      dependencies.add(specifier);
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      const tempVar = `__reexport_${specifierHash}`;
      return `\nconst ${tempVar} = require('${specifier}');\nfor (const __k in ${tempVar}) { if (__k !== 'default' && __k !== '__esModule') { module.exports[__k] = ${tempVar}[__k]; } }`;
    }
  );

  // 3b. Transform `export { a, b as c } from 'specifier'`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\{([^};]+?)\}\s*from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, inside, quote, specifier) => {
      dependencies.add(specifier);
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      const tempVar = `__reexport_${specifierHash}`;
      let lines = [`const ${tempVar} = require('${specifier}');`];
      inside.split(',').forEach((part) => {
        const p = part.trim();
        if (!p) return;
        if (p.includes(' as ')) {
          const [orig, alias] = p.split(' as ').map((s) => s.trim());
          lines.push(`try { Object.defineProperty(module.exports, '${alias}', { get: () => ${tempVar}['${orig}'], enumerable: true, configurable: true }); } catch (_) { module.exports.${alias} = ${tempVar}['${orig}']; }`);
        } else {
          lines.push(`try { Object.defineProperty(module.exports, '${p}', { get: () => ${tempVar}['${p}'], enumerable: true, configurable: true }); } catch (_) { module.exports.${p} = ${tempVar}['${p}']; }`);
        }
      });
      return '\n' + lines.join('\n');
    }
  );

  // 4. Transform `import * as name from 'specifier'` (with optional with/assert attributes)
  code = code.replace(
    /(?:^|[\n;])\s*import\s+\*\s+as\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, varName, quote, specifier) => {
      dependencies.add(specifier);
      return `\nconst ${varName} = require('${specifier}');`;
    }
  );

  // 5. Transform bare side-effect `import 'specifier'` (with optional with/assert attributes)
  code = code.replace(
    /(?:^|[\n;])\s*import\s+(['"])(.*?)\1(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, quote, specifier) => {
      dependencies.add(specifier);
      return `\nrequire('${specifier}');`;
    }
  );

  // 6. Transform `import DefaultName, { a, b as c } from 'specifier'` or `import DefaultName from 'specifier'`
  // or `import { a, b as c } from 'specifier'` (with optional with/assert attributes)
  const declaredImportTempVars = new Set();
  code = code.replace(
    /(?:^|[\n;])\s*import\s+([^;\n]+?)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, importClause, quote, specifier) => {
      dependencies.add(specifier);
      const clause = importClause.trim();
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      const tempVar = `__mod_${specifierHash}`;

      let lines = [];
      if (!declaredImportTempVars.has(tempVar)) {
        declaredImportTempVars.add(tempVar);
        lines.push(`const ${tempVar} = require('${specifier}');`);
      }

      if (clause.startsWith('{')) {
        // Named imports: `import { a, b as c } from '...'`
        const inside = clause.slice(1, -1).trim();
        const renamed = inside.split(',').map((part) => {
          const p = part.trim();
          if (!p) return '';
          if (p.includes(' as ')) {
            const [orig, alias] = p.split(' as ').map((s) => s.trim());
            return `${orig}: ${alias}`;
          }
          return p;
        }).filter(Boolean).join(', ');
        lines.push(`const { ${renamed} } = ${tempVar};`);
      } else if (clause.includes('{') && clause.includes(',')) {
        // Default and named: `import DefaultName, { a, b as c } from '...'`
        const [defaultPart, namedPart] = clause.split(/,(.+)/);
        const defName = (defaultPart || '').trim();
        const inside = (namedPart || '').trim().replace(/^\{|\}$/g, '').trim();
        if (defName) {
          lines.push(`const ${defName} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
        }
        const renamed = inside.split(',').map((part) => {
          const p = part.trim();
          if (!p) return '';
          if (p.includes(' as ')) {
            const [orig, alias] = p.split(' as ').map((s) => s.trim());
            return `${orig}: ${alias}`;
          }
          return p;
        }).filter(Boolean).join(', ');
        if (renamed) {
          lines.push(`const { ${renamed} } = ${tempVar};`);
        }
      } else if (clause.includes('{')) {
        // Named import where startsWith('{') didn't trigger
        const inside = clause.slice(clause.indexOf('{') + 1, clause.lastIndexOf('}')).trim();
        const renamed = inside.split(',').map((part) => {
          const p = part.trim();
          if (!p) return '';
          if (p.includes(' as ')) {
            const [orig, alias] = p.split(' as ').map((s) => s.trim());
            return `${orig}: ${alias}`;
          }
          return p;
        }).filter(Boolean).join(', ');
        if (renamed) {
          lines.push(`const { ${renamed} } = ${tempVar};`);
        }
      } else {
        // Pure default import: `import DefaultName from '...'`
        lines.push(`const ${clause} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
      }

      return '\n' + lines.join('\n');
    }
  );

  // 7. Transform `export default function foo() {}` or `export default function() {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+(async\s+)?function(?:\s+([a-zA-Z_$][0-9a-zA-Z_$]*))?\s*\(([\s\S]*?)\)\s*\{/g,
    (_, isAsync, funcName, params) => {
      if (funcName) {
        return `\nmodule.exports.default = ${funcName};\n${isAsync || ''}function ${funcName}(${params}) {\n`;
      }
      return `\nmodule.exports.default = ${isAsync || ''}function(${params}) {\n`;
    }
  );

  // 8. Transform `export default class Foo {}` or `export default class {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)?/g,
    (_, className) => {
      if (className) {
        return `\nconst ${className} = module.exports.default = class ${className}`;
      }
      return `\nmodule.exports.default = class`;
    }
  );

  // 9. Transform generic `export default ...` (expressions, objects, anonymous functions, arrow functions)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+([\s\S]*?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (_, expr) => {
      const trimmed = (expr || '').trim();
      if (!trimmed) return '\n';
      return `\nconst __defaultExport = ${trimmed};\nmodule.exports.default = __defaultExport;\n`;
    }
  );

  // 10. Transform `export function name(...) {}` and `export async function name(...) {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+(async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, isAsync, funcName, params) => {
      return `\nmodule.exports.${funcName} = ${funcName};\n${isAsync || ''}function ${funcName}(${params}) {\n`;
    }
  );

  // 11. Transform `export class name {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g,
    (_, className) => {
      return `\nconst ${className} = module.exports.${className} = class ${className}`;
    }
  );

  // 12. Transform destructured exports: `export const/let/var { ... } = ...;` or `export const/let/var [ ... ] = ...;`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+(const|let|var)\s+(\{[\s\S]*?\}|\[[\s\S]*?\])\s*=\s*([\s\S]*?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (_, decl, pattern, expr) => {
      const ids = extractBindingIdentifiers(pattern);
      const isMutable = decl === 'let' || decl === 'var';
      const exportBindings = ids.map((id) => {
        if (isMutable) {
          return `try { Object.defineProperty(module.exports, '${id}', { get: () => ${id}, set: (v) => { ${id} = v; }, enumerable: true, configurable: true }); } catch (_) { module.exports.${id} = ${id}; }`;
        }
        return `module.exports.${id} = ${id};`;
      }).join('\n');
      return `\n${decl} ${pattern} = ${(expr || '').trim()};\n${exportBindings}\n`;
    }
  );

  // 12b. Handle multiple comma-separated declarators in export let/const/var:
  // e.g. export let a = 1, b = 2; or export const x = f(1, 2), y = g(3, 4);
  code = code.replace(
    /(^|[\n;])\s*export\s+(const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*\s*=[\s\S]*?)(;|\n\s*(?:export|import|\/\*|\/\/|$)|$)/g,
    (match, prefix, decl, declListStr, suffix) => {
      const parts = splitDeclarators(declListStr);
      if (parts.length <= 1) {
        return match;
      }
      const isMutable = decl === 'let' || decl === 'var';
      const getterLines = [];
      const transformedParts = [];
      for (const part of parts) {
        const m = part.match(/^\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s*(=[\s\S]*)$/);
        if (m) {
          const varName = m[1];
          const rest = m[2];
          if (isMutable) {
            getterLines.push(`try { Object.defineProperty(module.exports, '${varName}', { get: () => ${varName}, set: (v) => { try { ${varName} = v; } catch (_) {} }, enumerable: true, configurable: true }); } catch (_) { module.exports.${varName} = ${varName}; }`);
          }
          transformedParts.push(`${varName} = module.exports.${varName} ${rest.trim()}`);
        } else {
          transformedParts.push(part.trim());
        }
      }
      const gettersPrefix = getterLines.length > 0 ? getterLines.join('\n') + '\n' : '';
      const term = suffix.trim() === ';' ? ';' : (suffix.startsWith(';') ? ';' : (suffix.trim() ? '\n' + suffix.trim() : ';'));
      const semi = prefix === ';' ? ';' : '';
      return `${semi}\n${gettersPrefix}${decl} ${transformedParts.join(', ')}${term}`;
    }
  );

  // 13. Transform `export let/var name = ...` (with live getter bindings)
  code = code.replace(
    /(^|[\n;])\s*export\s+(let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g,
    (_, prefix, decl, varName) => {
      const semi = prefix === ';' ? ';' : '';
      return `${semi}\ntry { Object.defineProperty(module.exports, '${varName}', { get: () => ${varName}, set: (v) => { try { ${varName} = v; } catch (_) {} }, enumerable: true, configurable: true }); } catch (_) { module.exports.${varName} = ${varName}; }\n${decl} ${varName} = module.exports.${varName} =`;
    }
  );

  // 14. Transform `export const name = ...`
  code = code.replace(
    /(^|[\n;])\s*export\s+const\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g,
    (_, prefix, varName) => {
      const semi = prefix === ';' ? ';' : '';
      return `${semi}\nconst ${varName} = module.exports.${varName} =`;
    }
  );

  // 15. Transform `export { a, b as c }` (with live getter bindings)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\{([^};]+?)\}(?!\s*from);?/g,
    (_, inside) => {
      const exportsList = inside.split(',').map((part) => {
        const p = part.trim();
        if (!p) return '';
        if (p.includes(' as ')) {
          const [orig, alias] = p.split(' as ').map((s) => s.trim());
          return `try { Object.defineProperty(module.exports, '${alias}', { get: () => ${orig}, enumerable: true, configurable: true }); } catch (_) { module.exports.${alias} = ${orig}; }`;
        }
        return `try { Object.defineProperty(module.exports, '${p}', { get: () => ${p}, enumerable: true, configurable: true }); } catch (_) { module.exports.${p} = ${p}; }`;
      }).filter(Boolean).join('\n');
      return '\n' + exportsList;
    }
  );

  const danglingExport = /(?:^|[\n;])\s*export\s+([^;\n]+)/m.exec(code);
  if (danglingExport) {
    const loc = getLineColumn(rawCode, danglingExport.index);
    throw new BuildError(`Unsupported export syntax: 'export ${danglingExport[1].trim()}' in '${filePath}'`, {
      file: filePath,
      line: loc.line,
      column: loc.column,
      category: 'Syntax',
      suggestion: 'Check export syntax. Supported: export default, export const/let/var/function/class, export { a, b }, export * from.'
    });
  }

  if (hoistedExports.length > 0) {
    code = hoistedExports.join('\n') + '\n' + code;
  }

  return {
    code,
    dependencies: Array.from(dependencies)
  };
}

/**
 * Global in-memory module cache for high-speed incremental rebuilds.
 */
export const globalModuleCache = new Map();

export function clearModuleCache() {
  globalModuleCache.clear();
}

/**
 * Builds the complete dependency graph starting from entry file.
 * Returns an array of module node objects.
 */
export function buildDependencyGraph(entryPath, rootDir = process.cwd(), options = {}) {
  const absoluteEntry = path.isAbsolute(entryPath) ? entryPath : path.resolve(rootDir, entryPath);

  if (!fs.existsSync(absoluteEntry)) {
    throw new BuildError(`Entry file not found: ${absoluteEntry}`, {
      file: absoluteEntry,
      suggestion: 'Ensure the entry path specified in the CLI exists.',
      category: 'Build'
    });
  }

  const cache = options.cache !== false
    ? (options.cache instanceof Map ? options.cache : globalModuleCache)
    : null;

  let nextId = 0;
  const fileToIdMap = new Map();
  const graph = [];
  const visitedFiles = new Set();
  const recursionStack = new Set();

  function createModule(absoluteFilePath) {
    let stat;
    try {
      stat = fs.statSync(absoluteFilePath);
    } catch (_) {
      stat = null;
    }

    const cached = (cache && stat) ? cache.get(absoluteFilePath) : null;
    let rawContent, hash, code, dependencies, byteLength, gzipSize;

    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      rawContent = cached.rawCode;
      hash = cached.hash;
      code = cached.code;
      dependencies = cached.dependencies;
      byteLength = cached.byteLength;
      gzipSize = cached.gzipSize;
    } else {
      try {
        rawContent = fs.readFileSync(absoluteFilePath, 'utf8').replace(/\r\n/g, '\n');
      } catch (err) {
        throw new BuildError(`Failed to read file: ${err.message}`, {
          file: absoluteFilePath,
          suggestion: 'Check file permissions or if the file was deleted.',
          category: 'FileSystem'
        });
      }
      hash = crypto.createHash('sha256').update(rawContent).digest('hex');
      const transformed = transformModuleCode(rawContent, absoluteFilePath);
      code = transformed.code;
      dependencies = transformed.dependencies;
      byteLength = Buffer.byteLength(code, 'utf8');
      gzipSize = zlib.gzipSync(Buffer.from(code, 'utf8')).length;

      const shebangMatch = rawContent.match(/^#![^\r\n]*/);
      const shebang = shebangMatch ? shebangMatch[0] : null;

      if (cache && stat) {
        cache.set(absoluteFilePath, {
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          hash,
          code,
          dependencies,
          rawCode: rawContent,
          shebang,
          byteLength,
          gzipSize
        });
      }
    }

    const id = nextId++;
    fileToIdMap.set(absoluteFilePath, id);

    const shebangMatch = rawContent.match(/^#![^\r\n]*/);
    const shebang = shebangMatch ? shebangMatch[0] : null;

    const moduleNode = {
      id,
      filePath: absoluteFilePath,
      relativePath: path.relative(rootDir, absoluteFilePath).replace(/\\/g, '/'),
      rawCode: rawContent,
      shebang,
      code,
      dependencies,
      mapping: {},
      hash,
      byteLength,
      gzipSize
    };

    return moduleNode;
  }

  function traverse(absoluteFilePath, parentFile = null) {
    if (recursionStack.has(absoluteFilePath)) {
      logger.warn(`Circular dependency detected: ${colors.yellow(path.relative(rootDir, absoluteFilePath))} (imported by ${colors.gray(parentFile ? path.relative(rootDir, parentFile) : 'root')})`);
      return fileToIdMap.get(absoluteFilePath);
    }

    if (visitedFiles.has(absoluteFilePath)) {
      return fileToIdMap.get(absoluteFilePath);
    }

    visitedFiles.add(absoluteFilePath);
    recursionStack.add(absoluteFilePath);

    const moduleNode = createModule(absoluteFilePath);
    graph.push(moduleNode);

    for (const depSpecifier of moduleNode.dependencies) {
      try {
        const resolvedDepPath = resolveModulePath(absoluteFilePath, depSpecifier, rootDir);
        const childId = traverse(resolvedDepPath, absoluteFilePath);
        moduleNode.mapping[depSpecifier] = childId;
      } catch (err) {
        logger.error(`Module resolution failed for '${depSpecifier}' in '${path.relative(rootDir, absoluteFilePath)}': ${err.message}`);
        if (err && err.name === 'BuildError') throw err;
        throw new BuildError(`Cannot resolve module '${depSpecifier}' imported from '${path.relative(rootDir, absoluteFilePath)}'`, {
          file: absoluteFilePath,
          suggestion: 'Check that the dependency exists and the path is correct.',
          category: 'Resolution'
        });
      }
    }

    recursionStack.delete(absoluteFilePath);
    return moduleNode.id;
  }

  traverse(absoluteEntry);

  return graph;
}
