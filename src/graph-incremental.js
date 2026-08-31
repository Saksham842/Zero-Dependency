/**
 * @module graph-incremental
 * @description Incremental build logic for ZeroPack's graph.
 */
import fs from 'node:fs';
import { state, canonical } from './graph-core.js';
import { ensureModule, fullBuild } from './graph-build.js';

/** Collect all dependents (upstream) of a set of module IDs. */
export function collectDependents(startIds) {
  const visited = new Set();
  const stack = [...startIds];
  while (stack.length) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    const mod = state.byId.get(id);
    if (!mod) continue;
    for (const parentId of mod.dependents) {
      stack.push(parentId);
    }
  }
  return visited;
}

/** Incremental rebuild based on a list of changed file paths. */
export function incrementalBuild(entryPath, changedPaths) {
  const start = Date.now();
  state.metrics.incrementalRebuilds++;
  const entryAbs = canonical(entryPath);
  if (!state.modules.has(entryAbs)) {
    return { graph: fullBuild(entryPath, state.rootDir), fallback: true };
  }

  const changedIds = new Set();
  for (let p of changedPaths) {
    const abs = canonical(p);
    if (!fs.existsSync(abs)) {
      const old = state.modules.get(abs);
      if (old) {
        for (const parentId of old.dependents) {
          const parent = state.byId.get(parentId);
          if (parent) {
            for (const [spec, childId] of Object.entries(parent.mapping)) {
              if (childId === old.id) {
                delete parent.mapping[spec];
              }
            }
          }
        }
        state.modules.delete(abs);
        state.byId.delete(old.id);
        for (const depId of old.dependents) changedIds.add(depId);
      }
      continue;
    }
    try {
      const mod = ensureModule(abs);
      changedIds.add(mod.id);
    } catch (e) {
      if (e.name === 'BuildError') throw e;
      return { graph: fullBuild(entryPath, state.rootDir), fallback: true };
    }
  }

  const affectedIds = collectDependents(changedIds);
  const entryMod = state.modules.get(entryAbs);
  if (entryMod) affectedIds.add(entryMod.id);

  for (const id of affectedIds) {
    const mod = state.byId.get(id);
    if (!mod) continue;
    try {
      ensureModule(mod.filePath);
    } catch (e) {
      if (e.name === 'BuildError') throw e;
      return { graph: fullBuild(entryPath, state.rootDir), fallback: true };
    }
  }

  const graphArray = [...state.modules.values()];
  state.metrics.totalModules = graphArray.length;
  state.metrics.lastBuildDurationMs = Date.now() - start;
  return { graph: graphArray, fallback: false };
}
