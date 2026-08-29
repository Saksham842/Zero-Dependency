import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger, colors } from './cli.js';

/**
 * Resolves a module specifier relative to the importing file.
 * Checks for extensions (.js, .mjs, .cjs, .ts, .json) and directory indexes.
 */
export function resolveModulePath(fromFile, specifier, rootDir = process.cwd()) {
  let candidate = '';

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    candidate = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // Treat bare specifier as relative to root or node_modules-like structure
    candidate = path.resolve(rootDir, specifier);
  }

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

  throw new Error(`Cannot resolve module '${specifier}' requested by '${fromFile}'`);
}

/**
 * Extracts import/require specifiers and transforms ESM syntax into runtime CJS format.
 */
export function transformModuleCode(rawCode, filePath) {
  const dependencies = new Set();
  let code = rawCode;

  // If JSON file, wrap as module export
  if (filePath.endsWith('.json')) {
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

  // 2. Transform `import * as name from 'specifier'`
  code = code.replace(
    /(?:^|\n)\s*import\s+\*\s+as\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s+from\s+(['"])(.*?)\2;?/g,
    (_, varName, quote, specifier) => {
      dependencies.add(specifier);
      return `\nconst ${varName} = require('${specifier}');`;
    }
  );

  // 3. Transform `import DefaultName, { a, b as c } from 'specifier'` or `import DefaultName from 'specifier'`
  // or `import { a, b as c } from 'specifier'`
  code = code.replace(
    /(?:^|\n)\s*import\s+([\s\S]*?)\s+from\s+(['"])(.*?)\2;?/g,
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

  // 4. Transform bare side-effect `import 'specifier'`
  code = code.replace(
    /(?:^|\n)\s*import\s+(['"])(.*?)\1;?/g,
    (_, quote, specifier) => {
      dependencies.add(specifier);
      return `\nrequire('${specifier}');`;
    }
  );

  // 5. Transform `export default function foo() {}` or `export default class Bar {}`
  code = code.replace(
    /(?:^|\n)\s*export\s+default\s+function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, funcName, params) => {
      return `\nfunction ${funcName}(${params}) {\nmodule.exports.default = ${funcName};\n`;
    }
  );

  code = code.replace(
    /(?:^|\n)\s*export\s+default\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\n`;
    }
  );

  // 6. Transform generic `export default ...` (handles multiline objects, expressions, anonymous functions)
  code = code.replace(
    /(?:^|\n)\s*export\s+default\s+([\s\S]+?)(?:;|\n\s*(?:export|import|\/\*|\/\/|$))/g,
    (match, expr) => {
      const trimmedExpr = expr.trim();
      if (!trimmedExpr) return match;
      if (trimmedExpr.startsWith('function') && !trimmedExpr.startsWith('function(')) {
        return match; // already handled
      }
      return `\nconst __defaultExport = (${trimmedExpr});\nmodule.exports.default = __defaultExport;\nif (typeof __defaultExport === 'object' && __defaultExport !== null) { Object.assign(module.exports, __defaultExport); }\n`;
    }
  );

  // 7. Transform `export const/let/var name = ...`
  code = code.replace(
    /(?:^|\n)\s*export\s+(const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g,
    (_, decl, varName) => {
      return `\n${decl} ${varName} = module.exports.${varName} =`;
    }
  );

  // 8. Transform `export function name(...) {}`
  code = code.replace(
    /(?:^|\n)\s*export\s+function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([\s\S]*?)\)\s*\{/g,
    (_, funcName, params) => {
      return `\nfunction ${funcName}(${params}) {\nmodule.exports.${funcName} = ${funcName};\n`;
    }
  );

  // 9. Transform `export class name {}`
  code = code.replace(
    /(?:^|\n)\s*export\s+class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)([\s\S]*?)\{/g,
    (_, className, rest) => {
      return `\nclass ${className}${rest}{\n`;
    }
  );

  // 10. Transform `export { a, b as c }`
  code = code.replace(
    /(?:^|\n)\s*export\s+\{([\s\S]*?)\};?/g,
    (_, inside) => {
      const exportsList = inside.split(',').map((part) => {
        const p = part.trim();
        if (!p) return '';
        if (p.includes(' as ')) {
          const [orig, alias] = p.split(' as ').map((s) => s.trim());
          return `module.exports.${alias} = ${orig};`;
        }
        return `module.exports.${p} = ${p};`;
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
