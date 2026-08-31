/**
 * @module parser
 * @description Lexical scanner, ESM→CJS transformer, CSS bundler, and
 * dependency-graph builder for ZeroPack.
 *
 * Responsibilities (delegated to sub-modules):
 *  1. `BuildError`, `getLineColumn`       → parser-errors.js
 *  2. `resolveModulePath`                  → parser-resolve.js
 *  3. `minifyCss`, `transformCssModule`    → parser-css.js
 *  4. `transformModuleCode`                → parser-transform.js
 *  5. `buildDependencyGraph`               → this file (legacy/test path)
 *
 * Replaces (npm ecosystem):
 *  - `esbuild` / `webpack`    → custom AST scanner + IIFE bundler
 *  - `postcss` / `css-loader` → native CSS string parser
 *
 * @requires node:fs
 * @requires node:path
 * @requires node:crypto
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger, colors } from './cli.js';

export { BuildError, getLineColumn } from './parser-errors.js';
export { resolveModulePath } from './parser-resolve.js';
export { minifyCss } from './parser-css.js';
export { transformModuleCode } from './parser-transform.js';

import { BuildError } from './parser-errors.js';
import { resolveModulePath } from './parser-resolve.js';
import { transformModuleCode } from './parser-transform.js';

/**
 * Builds the complete module dependency graph via depth-first traversal.
 *
 * Each node in the returned array is a `ModuleNode`:
 * ```
 * {
 *   id:           number,   // Unique numeric ID; entry is always 0.
 *   filePath:     string,   // Absolute path.
 *   relativePath: string,   // Path relative to rootDir (forward slashes).
 *   code:         string,   // Transformed CJS source.
 *   dependencies: string[], // Raw import specifiers.
 *   mapping:      Record<string, number>, // specifier → child module ID.
 *   hash:         string,   // SHA-256 of raw source (for cache invalidation).
 * }
 * ```
 *
 * Circular dependencies are detected via a recursion stack and emit a
 * warning rather than throwing, allowing the build to complete.
 *
 * Note: this is the **legacy / test path**. The production CLI uses
 * `src/graph.js` which adds incremental caching on top.
 *
 * @param {string} entryPath  Entry JS path (absolute or relative to `rootDir`).
 * @param {string} [rootDir=process.cwd()] Project root for path resolution.
 * @returns {object[]} Ordered array of `ModuleNode` objects.
 * @throws {BuildError} When the entry file is missing or a dependency cannot be resolved.
 */
export function buildDependencyGraph(entryPath, rootDir = process.cwd()) {
  const absoluteEntry = path.isAbsolute(entryPath) ? entryPath : path.resolve(rootDir, entryPath);

  if (!fs.existsSync(absoluteEntry)) {
    throw new BuildError({
      message: `Entry file not found: ${absoluteEntry}`,
      file: absoluteEntry,
      suggestion: 'Ensure the entry path specified in the CLI exists.',
      category: 'Build'
    });
  }

  let nextId = 0;
  const fileToIdMap = new Map();
  const graph = [];
  const visitedFiles = new Set();
  const recursionStack = new Set();

  function createModule(absoluteFilePath) {
    let rawContent;
    try {
      rawContent = fs.readFileSync(absoluteFilePath, 'utf8');
    } catch (err) {
      throw new BuildError({
        message: `Failed to read file: ${err.message}`,
        file: absoluteFilePath,
        suggestion: 'Check file permissions or if the file was deleted.',
        category: 'FileSystem'
      });
    }
    const hash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const { code, dependencies } = transformModuleCode(rawContent, absoluteFilePath);
    const id = nextId++;
    fileToIdMap.set(absoluteFilePath, id);
    return {
      id,
      filePath: absoluteFilePath,
      relativePath: path.relative(rootDir, absoluteFilePath).replace(/\\/g, '/'),
      code,
      dependencies,
      mapping: {},
      hash
    };
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
        if (err.name === 'BuildError') throw err;
        throw new BuildError({
          message: `Cannot resolve module '${depSpecifier}' imported from '${path.relative(rootDir, absoluteFilePath)}'`,
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
