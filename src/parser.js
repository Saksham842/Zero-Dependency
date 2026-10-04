import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import * as nodeModule from 'node:module';
import { logger, colors } from './cli.js';
import { BuildError } from './errors.js';

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
  const extensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json'];
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
    throw new BuildError(`Cannot find package '${pkgName}' imported from '${path.relative(rootDir, fromFile).replace(/\\/g, '/')}'`, {
      file: fromFile,
      suggestion: `Run 'npm install ${pkgName}' or verify that the package exists in node_modules.`
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
 * Extracts import/require specifiers and transforms ESM syntax into runtime CJS format.
 */
export function transformModuleCode(rawCode, filePath) {
  const dependencies = new Set();
  let code = rawCode;

  // Disallow .tsx and explain why (type stripping does not transform JSX)
  if (filePath && /\.[cm]?tsx$/i.test(filePath)) {
    throw new BuildError(
      `TypeScript JSX (.tsx) is not supported by native Node.js type stripping in '${filePath}'.`,
      {
        file: filePath,
        suggestion: `stripTypeScriptTypes only removes type annotations and cannot transform JSX syntax. Enums and namespaces also require transform mode. Use standard .ts/.js or pre-compile with a JSX transform.`
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

  // If JSON file, wrap as module export
  if (filePath && filePath.endsWith('.json')) {
    return {
      code: `module.exports = ${rawCode.trim() || '{}'};`,
      dependencies: []
    };
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

  // 4. Transform `import * as name from 'specifier'` (with optional with/assert attributes)
  code = code.replace(
    /(?:^|[\n;])\s*import\s+\*\s+as\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, varName, quote, specifier) => {
      dependencies.add(specifier);
      return `\nconst ${varName} = require('${specifier}');`;
    }
  );

  // 5. Transform `import DefaultName, { a, b as c } from 'specifier'` or `import DefaultName from 'specifier'`
  // or `import { a, b as c } from 'specifier'` (with optional with/assert attributes)
  code = code.replace(
    /(?:^|[\n;])\s*import\s+([\s\S]*?)\s+from\s+(['"])(.*?)\2(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, importClause, quote, specifier) => {
      dependencies.add(specifier);
      const clause = importClause.trim();
      const specifierHash = crypto.createHash('sha256').update(specifier).digest('hex').slice(0, 8);
      const tempVar = `__mod_${specifierHash}`;

      let lines = [`const ${tempVar} = require('${specifier}');`];

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
      } else if (clause.includes('{')) {
        // Default and named: `import DefaultName, { a, b as c } from '...'`
        const [defaultPart, namedPart] = clause.split(/,(.+)/);
        const defName = defaultPart.trim();
        const inside = namedPart.trim().slice(1, -1).trim();
        lines.push(`const ${defName} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
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
      } else {
        // Pure default import: `import DefaultName from '...'`
        lines.push(`const ${clause} = ${tempVar}.default !== undefined ? ${tempVar}.default : ${tempVar};`);
      }

      return '\n' + lines.join('\n');
    }
  );

  // 6. Transform bare side-effect `import 'specifier'`
  code = code.replace(
    /(?:^|[\n;])\s*import\s+(['"])(.*?)\1(?:\s*(?:with|assert)\s*\{[\s\S]*?\})?;?/g,
    (_, quote, specifier) => {
      dependencies.add(specifier);
      return `\nrequire('${specifier}');`;
    }
  );

  // 7. Transform `export default function foo() {}` or `export default async function foo() {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+(async\s+)?function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, isAsync, funcName, params) => {
      return `\nmodule.exports.default = ${funcName};\n${isAsync || ''}function ${funcName}(${params}) {\n`;
    }
  );

  // 8. Transform `export default class Foo {}`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\nmodule.exports.default = ${className};\n`;
    }
  );

  // 9. Transform generic `export default ...` (expressions, objects, anonymous functions/classes)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+default\s+([\s\S]+?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (match, expr) => {
      const trimmedExpr = expr.trim();
      if (!trimmedExpr) return match;
      if (trimmedExpr.startsWith('function') && !trimmedExpr.startsWith('function(') && !trimmedExpr.startsWith('function (')) {
        return match; // Named function handled above
      }
      return `\nconst __defaultExport = (${trimmedExpr});\nmodule.exports.default = __defaultExport;\n`;
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
    /(?:^|[\n;])\s*export\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\nmodule.exports.${className} = ${className};\n`;
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
      return `\n${decl} ${pattern} = ${expr.trim()};\n${exportBindings}\n`;
    }
  );

  // 13. Transform `export let/var name = ...` (with live bindings)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+(let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*([\s\S]*?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (_, decl, varName, expr) => {
      return `\n${decl} ${varName} = ${expr.trim()};\ntry { Object.defineProperty(module.exports, '${varName}', { get: () => ${varName}, set: (v) => { ${varName} = v; }, enumerable: true, configurable: true }); } catch (_) { module.exports.${varName} = ${varName}; }\n`;
    }
  );

  // 14. Transform `export const name = ...`
  code = code.replace(
    /(?:^|[\n;])\s*export\s+const\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g,
    (_, varName) => {
      return `\nconst ${varName} = module.exports.${varName} =`;
    }
  );

  // 15. Transform `export { a, b as c }` (with live getter bindings)
  code = code.replace(
    /(?:^|[\n;])\s*export\s+\{([\s\S]*?)\};?/g,
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

  return {
    code,
    dependencies: Array.from(dependencies)
  };
}

/**
 * Builds the complete dependency graph starting from entry file.
 * Returns an array of module node objects.
 */
export function buildDependencyGraph(entryPath, rootDir = process.cwd()) {
  const absoluteEntry = path.isAbsolute(entryPath) ? entryPath : path.resolve(rootDir, entryPath);

  if (!fs.existsSync(absoluteEntry)) {
    throw new Error(`Entry file not found: ${absoluteEntry}`);
  }

  let nextId = 0;
  const fileToIdMap = new Map();
  const graph = [];
  const visitedFiles = new Set();
  const recursionStack = new Set();

  function createModule(absoluteFilePath) {
    const rawContent = fs.readFileSync(absoluteFilePath, 'utf8');
    const hash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const { code, dependencies } = transformModuleCode(rawContent, absoluteFilePath);

    const id = nextId++;
    fileToIdMap.set(absoluteFilePath, id);

    const moduleNode = {
      id,
      filePath: absoluteFilePath,
      relativePath: path.relative(rootDir, absoluteFilePath).replace(/\\/g, '/'),
      rawCode: rawContent,
      code,
      dependencies,
      mapping: {},
      hash
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
        throw err;
      }
    }

    recursionStack.delete(absoluteFilePath);
    return moduleNode.id;
  }

  traverse(absoluteEntry);

  return graph;
}
