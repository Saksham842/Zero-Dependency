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
    function safeWatch(targetDir, baseDir) {
      if (!fs.existsSync(targetDir)) return;
      try {
        const w = fs.watch(targetDir, { recursive: true }, (eventType, filename) => handleWatchEvent(eventType, filename, baseDir));
        w.on('error', (err) => logger.warn(`Watcher error on ${targetDir}: ${err.message}`));
        watchers.push(w);
      } catch (_) {
        try {
          const w = fs.watch(targetDir, (eventType, filename) => handleWatchEvent(eventType, filename, baseDir));
          w.on('error', (err) => logger.warn(`Watcher error on ${targetDir}: ${err.message}`));
          watchers.push(w);
          function walk(cur) {
            try {
              const entries = fs.readdirSync(cur, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                  const sub = path.join(cur, entry.name);
                  const sw = fs.watch(sub, (eventType, filename) => handleWatchEvent(eventType, filename, sub));
                  watchers.push(sw);
                  walk(sub);
                }
              }
            } catch (_) {}
          }
          walk(targetDir);
        } catch (_) {}
      }
    }

    safeWatch(watchDir, watchDir);
    safeWatch(publicDir, publicDir);
  }

  function close() {
    if (debounceTimer) clearTimeout(debounceTimer);
    for (const w of watchers) {
      try { w.close(); } catch(e) {}
    }
  }

  return { start, close };
}
