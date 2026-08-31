/**
 * @module graph-core
 * @description State and core utilities for the incremental dependency graph.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { transformModuleCode, BuildError } from './parser.js';

export const state = {
  modules: new Map(),
  byId: new Map(),
  nextId: 0,
  rootDir: process.cwd(),
  metrics: {
    totalModules: 0,
    modulesReused: 0,
    modulesReprocessed: 0,
    fullRebuilds: 0,
    incrementalRebuilds: 0,
    lastBuildDurationMs: 0
  }
};

export function canonical(p) {
  return path.resolve(p);
}

export function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function createModuleState(filePath, id) {
  const relativePath = path.relative(state.rootDir, filePath).replace(/\\/g, '/');
  return {
    id,
    filePath,
    relativePath,
    code: '',
    dependencies: [],
    mapping: {},
    dependents: new Set(),
    hash: ''
  };
}

export function processFile(filePath) {
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

export function getMetrics() {
  return { ...state.metrics };
}

export function __resetForTest() {
  state.modules.clear();
  state.byId.clear();
  state.nextId = 0;
  state.metrics = { totalModules: 0, modulesReused: 0, modulesReprocessed: 0, fullRebuilds: 0, incrementalRebuilds: 0, lastBuildDurationMs: 0 };
}
