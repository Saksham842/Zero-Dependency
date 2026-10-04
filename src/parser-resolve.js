/**
 * @module parser-resolve
 * @description Module path resolution for ZeroPack. Zero npm dependencies.
 *
 * Replaces: node-resolve, enhanced-resolve
 * Standard library: node:fs, node:path
 */
import fs from 'node:fs';
import path from 'node:path';
import { BuildError, checkUnsupportedExtension } from './parser-errors.js';

const RESOLVE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.css'];

/**
 * Resolves a module specifier to an absolute file path.
 *
 * Resolution order:
 *  1. Exact file match.
 *  2. Append known extensions: .js, .mjs, .cjs, .ts, .jsx, .tsx, .json, .css
 *  3. Directory index file with the same extension candidates.
 *
 * Bare specifiers are rejected — ZeroPack does not resolve npm packages.
 *
 * @param {string} fromFile   Absolute path of the importing file.
 * @param {string} specifier  Raw import string (e.g. `'./utils'`).
 * @param {string} [rootDir=process.cwd()] Project root used in error messages.
 * @returns {string} Resolved absolute file path.
 * @throws {BuildError}
 */
export function resolveModulePath(fromFile, specifier, rootDir = process.cwd()) {
  let candidate = '';

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    candidate = path.resolve(path.dirname(fromFile), specifier);
  } else {
    candidate = path.resolve(rootDir, specifier);
  }

  // 1. Exact file match
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    checkUnsupportedExtension(candidate);
    return candidate;
  }

  // 2. Try file extensions
  for (const ext of RESOLVE_EXTENSIONS) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 3. Try directory index file
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of RESOLVE_EXTENSIONS) {
      const indexFile = path.join(candidate, `index${ext}`);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        checkUnsupportedExtension(indexFile);
        return indexFile;
      }
    }
  }

  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    throw new BuildError({
      message: `Unable to resolve bare module specifier '${specifier}'`,
      file: fromFile,
      suggestion: 'ZeroPack does not currently support full npm package resolution from node_modules. Please use relative paths for local files.',
      category: 'Resolution'
    });
  }

  throw new BuildError({
    message: `Cannot resolve module '${specifier}' requested by '${path.relative(rootDir, fromFile)}'`,
    file: fromFile,
    suggestion: 'Check that the file exists and that the import path is correct.',
    category: 'Resolution'
  });
}
