// src/graph.js
// Internal incremental dependency‑graph engine for ZeroPack (Phase 5A)
// This module is deliberately minimal and not part of the public API.
// It maintains an in‑memory representation of modules, their hashes,
// forward and reverse dependencies, and provides safe incremental rebuilds.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger, colors } from './cli.js';
import { resolveModulePath, transformModuleCode, BuildError } from './parser.js';

/** Internal module state */
const state = {
  // Map canonical absolute path -> ModuleState
  modules: new Map(),
  // Counter for assigning stable numeric IDs (entry will be 0 after first full build)
  nextId: 0,
  // Root directory used for resolving absolute entry paths
  rootDir: process.cwd(),
  // Metrics (reset on each build step)
  metrics: {
    totalModules: 0,
    modulesReused: 0,
    modulesReprocessed: 0,
    fullRebuilds: 0,
    incrementalRebuilds: 0,
    lastBuildDurationMs: 0
  }
};

/** Helper – canonical absolute path */
function canonical(p) {
  return path.resolve(p);
}

/** Compute SHA‑256 of source string */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/** Create a new ModuleState (without dependencies resolved yet) */
function createModuleState(filePath, id) {
  const relativePath = path.relative(state.rootDir, filePath).replace(/\\\\/g, '/');
  return {
    id,
    filePath,
    relativePath,
    code: '',
    dependencies: [], // raw specifiers
    mapping: {}, // specifier -> child id
    dependents: new Set(), // reverse edges (ids of modules that import this)
    hash: ''
  };
}

/** Load source, transform, and compute dependencies */
function processFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new BuildError({
      message: `Failed to read file: ${err.message}`,
      file: filePath,
      suggestion: 'Check file permissions or if the file was deleted.',
      category: 'FileSystem'
    });
  }
  const srcHash = hashContent(raw);
  const { code, dependencies } = transformModuleCode(raw, filePath);
  return { srcHash, code, dependencies };
}

/**
 * Recursively ensure a module exists in the graph and is up‑to‑date.
 * Returns the ModuleState instance.
 */
function ensureModule(filePath) {
  const absPath = canonical(filePath);
  let mod = state.modules.get(absPath);

  // If module exists, check if source changed
  if (mod) {
    const { srcHash, code, dependencies } = processFile(absPath);
    if (mod.hash === srcHash) {
      // Source unchanged – reuse existing transformed code & deps.
      state.metrics.modulesReused++;
      return mod;
    }
    // Source changed – we will reprocess.
    mod.code = code;
    mod.dependencies = dependencies;
    mod.hash = srcHash;
    state.metrics.modulesReprocessed++;
  } else {
    // New module – assign new id.
    const id = state.nextId++;
    mod = createModuleState(absPath, id);
    const { srcHash, code, dependencies } = processFile(absPath);
    mod.code = code;
    mod.dependencies = dependencies;
    mod.hash = srcHash;
    state.modules.set(absPath, mod);
    state.metrics.modulesReprocessed++;
  }

  // Update forward dependencies (mapping) and reverse edges.
  // First, clear any old reverse links that may no longer be needed.
  for (const childId of Object.values(mod.mapping)) {
    const child = [...state.modules.values()].find(m => m.id === childId);
    if (child) child.dependents.delete(mod.id);
  }
  mod.mapping = {};

  for (const spec of mod.dependencies) {
    let resolved;
    try {
      resolved = resolveModulePath(absPath, spec, state.rootDir);
    } catch (err) {
      // Propagate resolution errors as BuildError (already formatted)
      throw err;
    }
    const child = ensureModule(resolved);
    mod.mapping[spec] = child.id;
    child.dependents.add(mod.id);
  }

  return mod;
}

/** Full clean build from entry point – clears existing state. */
function fullBuild(entryPath, rootDir = process.cwd()) {
  const start = Date.now();
  // Reset state but keep same nextId counter for deterministic ids across runs.
  state.modules.clear();
  state.nextId = 0;
  state.rootDir = rootDir;
  // Reset metrics for this build.
  state.metrics = {
    totalModules: 0,
    modulesReused: 0,
    modulesReprocessed: 0,
    fullRebuilds: state.metrics.fullRebuilds + 1,
    incrementalRebuilds: state.metrics.incrementalRebuilds,
    lastBuildDurationMs: 0
  };

  // Ensure entry first – its ID will be 0.
  const entryAbs = canonical(entryPath);
  const entryMod = ensureModule(entryAbs);
  // Force entry ID to 0 for reproducibility (if not already).
  if (entryMod.id !== 0) {
    const zeroMod = [...state.modules.values()].find(m => m.id === 0);
    if (zeroMod) {
      const tmp = zeroMod.id;
      zeroMod.id = entryMod.id;
      entryMod.id = tmp;
    } else {
      entryMod.id = 0;
    }
  }

  const graphArray = [...state.modules.values()];
  state.metrics.totalModules = graphArray.length;
  state.metrics.lastBuildDurationMs = Date.now() - start;
  return graphArray;
}

/** Collect all dependents (upstream) of a set of module IDs. */
function collectDependents(startIds) {
  const visited = new Set();
  const stack = [...startIds];
  while (stack.length) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    const mod = [...state.modules.values()].find(m => m.id === id);
    if (!mod) continue;
    for (const parentId of mod.dependents) {
      stack.push(parentId);
    }
  }
  return visited;
}

/** Incremental rebuild based on a list of changed file paths (absolute or relative). */
function incrementalBuild(entryPath, changedPaths) {
  const start = Date.now();
  state.metrics.incrementalRebuilds++;
  const entryAbs = canonical(entryPath);
  if (!state.modules.has(entryAbs)) {
    // Entry not present – full rebuild is safest.
    return { graph: fullBuild(entryPath, state.rootDir), fallback: true };
  }

  const changedIds = new Set();
  for (let p of changedPaths) {
    const abs = canonical(p);
    if (!fs.existsSync(abs)) {
      const old = state.modules.get(abs);
      if (old) {
        // Remove reverse edges from its dependents.
        for (const parentId of old.dependents) {
          const parent = [...state.modules.values()].find(m => m.id === parentId);
          if (parent) {
            // Remove any mapping entries that point to the removed child module
            for (const [spec, childId] of Object.entries(parent.mapping)) {
              if (childId === old.id) {
                delete parent.mapping[spec];
              }
            }
          }
        }
        state.modules.delete(abs);
        for (const depId of old.dependents) changedIds.add(depId);
      }
      continue;
    }
    try {
      const mod = ensureModule(abs);
      changedIds.add(mod.id);
    } catch (e) {
      return { graph: fullBuild(entryPath, state.rootDir), fallback: true };
    }
  }

  const affectedIds = collectDependents(changedIds);
  const entryMod = state.modules.get(entryAbs);
  if (entryMod) affectedIds.add(entryMod.id);

  for (const id of affectedIds) {
    const mod = [...state.modules.values()].find(m => m.id === id);
    if (!mod) continue;
    try {
      ensureModule(mod.filePath);
    } catch (e) {
      return { graph: fullBuild(entryPath, state.rootDir), fallback: true };
    }
  }

  const graphArray = [...state.modules.values()];
  state.metrics.totalModules = graphArray.length;
  state.metrics.lastBuildDurationMs = Date.now() - start;
  return { graph: graphArray, fallback: false };
}

/** Exported minimal API */
export function build(entryPath, rootDir = process.cwd()) {
  return fullBuild(entryPath, rootDir);
}

export function rebuild(entryPath, changedPaths) {
  const result = incrementalBuild(entryPath, changedPaths);
  if (result.fallback) {
    return result.graph;
  }
  return result.graph;
}

export function getMetrics() {
  return { ...state.metrics };
}

/** Internal helper for tests – resets entire in‑memory graph. */
export function __resetForTest() {
  state.modules.clear();
  state.nextId = 0;
  state.metrics = { totalModules: 0, modulesReused: 0, modulesReprocessed: 0, fullRebuilds: 0, incrementalRebuilds: 0, lastBuildDurationMs: 0 };
}
