/**
 * @module graph
 * @description Incremental dependency-graph engine for ZeroPack.
 *
 * Maintains an in-memory module cache keyed by absolute file path. On each
 * rebuild, only modules whose SHA-256 hash has changed (or whose dependencies
 * have been structurally altered) are reprocessed. Unchanged modules are
 * reused directly, making hot-path rebuilds sub-millisecond for small change sets.
 *
 * Key concepts:
 *  - **Full build** (`build`): clears state, traverses all imports from entry.
 *  - **Incremental build** (`rebuild`): re-processes only changed files and
 *    their transitive dependents (reverse-edge propagation).
 *  - **Fallback**: any graph inconsistency triggers a safe full rebuild.
 *
 * This module is the **production path** used by the CLI and dev server.
 * `src/parser.js#buildDependencyGraph` is the simpler test/legacy path.
 *
 * @requires node:fs
 * @requires node:path
 * @requires node:crypto
 */

import process from 'node:process';
import { getMetrics, __resetForTest } from './graph-core.js';
import { fullBuild } from './graph-build.js';
import { incrementalBuild } from './graph-incremental.js';

// =============================================================================
// Public API
// =============================================================================

/**
 * Performs a full clean build from `entryPath`.
 *
 * Clears all cached module state and rebuilds the entire dependency graph
 * from scratch. Guarantees the entry module receives ID `0`, which is the
 * module ID the IIFE runtime boots from.
 *
 * @param {string} entryPath  Entry JS file (absolute or relative to cwd).
 * @param {string} [rootDir=process.cwd()] Project root for path resolution.
 * @returns {object[]} Array of `ModuleState` objects (compatible with bundler).
 */
export function build(entryPath, rootDir = process.cwd()) {
  return fullBuild(entryPath, rootDir);
}

/**
 * Performs an incremental rebuild after one or more source files changed.
 *
 * Only the changed files and their transitive dependents (tracked via reverse
 * edges in `ModuleState.dependents`) are reprocessed. Falls back to a full
 * build if the graph is in an inconsistent state (e.g. first run, or after a
 * module was added/removed and the graph topology changed).
 *
 * @param {string}   entryPath    Entry JS file (absolute path or relative to cwd).
 * @param {string[]} changedPaths Absolute paths of files that changed on disk.
 * @returns {object[]} Updated module graph array.
 */
export function rebuild(entryPath, changedPaths) {
  const result = incrementalBuild(entryPath, changedPaths);
  return result.graph;
}

export { getMetrics, __resetForTest };
