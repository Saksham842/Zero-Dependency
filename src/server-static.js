/**
 * @module server-static
 * @description Native HTTP dev server static file resolution.
 */
import path from 'node:path';
import fs from 'node:fs';

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function isPathInsideRoot(rootDir, candidatePath) {
  const resolvedRoot      = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(candidatePath);
  const relative          = path.relative(resolvedRoot, resolvedCandidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveStaticFilePath(rootDir, requestPathname) {
  let pathname = requestPathname || '/';
  pathname = pathname.replace(/\\/g, '/');

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const relativePath = pathname.replace(/^\/+/, '');
  const staticRoots = [rootDir, path.join(rootDir, 'public'), path.join(rootDir, 'dist')];

  for (const staticRoot of staticRoots) {
    const candidatePath = path.resolve(staticRoot, relativePath);
    if (!isPathInsideRoot(staticRoot, candidatePath)) {
      continue;
    }
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return null;
}
