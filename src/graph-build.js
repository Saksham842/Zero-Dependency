/**
 * @module graph-build
 * @description Graph building engine for ZeroPack.
 */
import process from 'node:process';
import { resolveModulePath } from './parser.js';
import { state, canonical, createModuleState, processFile } from './graph-core.js';

/**
 * Recursively ensure a module exists in the graph and is up-to-date.
 * Returns the ModuleState instance.
 */
export function ensureModule(filePath) {
  const absPath = canonical(filePath);
  let mod = state.modules.get(absPath);

  // If module exists, check if source changed
  if (mod) {
    const { srcHash, code, dependencies } = processFile(absPath);
    
    // Check if any mapped children are missing from the graph index
    let allDepsExist = true;
    for (const childId of Object.values(mod.mapping)) {
      if (!state.byId.has(childId)) {
        allDepsExist = false;
        break;
      }
    }

    if (mod.hash === srcHash && Object.keys(mod.mapping).length === mod.dependencies.length && allDepsExist) {
      // Source unchanged and all dependencies exist – reuse existing transformed code & deps.
      state.metrics.modulesReused++;
      return mod;
    }
    // Source changed or deps missing – we will reprocess.
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
    state.byId.set(id, mod);
    state.metrics.modulesReprocessed++;
  }

  // Update forward dependencies (mapping) and reverse edges.
  // First, clear any old reverse links that may no longer be needed.
  for (const childId of Object.values(mod.mapping)) {
    const child = state.byId.get(childId);
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
export function fullBuild(entryPath, rootDir = process.cwd()) {
  const start = Date.now();
  // Reset state but keep same nextId counter for deterministic ids across runs.
  state.modules.clear();
  state.byId.clear();
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
    const zeroMod = state.byId.get(0);
    if (zeroMod) {
      const tmp = zeroMod.id;
      zeroMod.id = entryMod.id;
      entryMod.id = tmp;
      // Update byId index
      state.byId.set(zeroMod.id, zeroMod);
      state.byId.set(entryMod.id, entryMod);
    } else {
      state.byId.delete(entryMod.id);
      entryMod.id = 0;
      state.byId.set(0, entryMod);
    }
  }

  const graphArray = [...state.modules.values()];
  state.metrics.totalModules = graphArray.length;
  state.metrics.lastBuildDurationMs = Date.now() - start;
  return graphArray;
}
