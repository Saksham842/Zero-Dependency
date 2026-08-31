/**
 * @module cli-env
 * @description Native `.env` reader for ZeroPack.
 */
import fs from 'node:fs';
import path from 'node:path';
import { logger } from './cli-logger.js';

export function loadEnv(envPath = '.env', baseDir = process.cwd()) {
  const resolvedPath = path.isAbsolute(envPath) ? envPath : path.resolve(baseDir, envPath);

  if (!fs.existsSync(resolvedPath)) {
    return { loaded: false, count: 0, path: resolvedPath };
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines   = content.split(/\r?\n/);
    let count = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const sanitizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
      const eqIdx = sanitizedLine.indexOf('=');
      if (eqIdx === -1) continue;

      const key = sanitizedLine.slice(0, eqIdx).trim();
      let value  = sanitizedLine.slice(eqIdx + 1).trim();

      if (!key) continue;

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      const commentIdx = value.indexOf(' #');
      if (commentIdx !== -1) {
        value = value.slice(0, commentIdx).trim();
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
        count++;
      }
    }

    return { loaded: true, count, path: resolvedPath };
  } catch (err) {
    logger.warn(`Failed to parse .env file at ${resolvedPath}: ${err.message}`);
    return { loaded: false, count: 0, error: err };
  }
}
