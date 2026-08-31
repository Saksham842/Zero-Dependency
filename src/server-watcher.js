/**
 * @module server-watcher
 * @description Native file watcher with debounce logic.
 */
import fs from 'node:fs';
import path from 'node:path';
import { logger } from './cli.js';

export function createWatcher({ watchDir, publicDir, onFileChange }) {
  let debounceTimer = null;
  let pendingPaths = new Set();
  const watchers = [];

  function handleWatchEvent(eventType, filename, baseDir) {
    if (!filename) return;
    if (filename.endsWith('bundle.js') || filename.includes('node_modules') || filename.startsWith('.')) return;

    pendingPaths.add(path.resolve(baseDir, filename));

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const paths = Array.from(pendingPaths);
      pendingPaths.clear();
      onFileChange(paths);
    }, 100);
  }

  function start() {
    if (fs.existsSync(watchDir)) {
      const w1 = fs.watch(watchDir, { recursive: true }, (eventType, filename) => handleWatchEvent(eventType, filename, watchDir));
      w1.on('error', (err) => logger.warn(`Watcher error on ${watchDir}: ${err.message}`));
      watchers.push(w1);
    }
    if (fs.existsSync(publicDir)) {
      const w2 = fs.watch(publicDir, { recursive: true }, (eventType, filename) => handleWatchEvent(eventType, filename, publicDir));
      w2.on('error', (err) => logger.warn(`Watcher error on ${publicDir}: ${err.message}`));
      watchers.push(w2);
    }
  }

  function close() {
    if (debounceTimer) clearTimeout(debounceTimer);
    for (const w of watchers) {
      try { w.close(); } catch(e) {}
    }
  }

  return { start, close };
}
