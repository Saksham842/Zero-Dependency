import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DASHBOARD_HTML } from '../src/dashboard.js';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const publicDistDir = path.join(publicDir, 'dist');
const distDir = path.join(rootDir, 'dist');

// 1. Ensure public/dist directory exists
fs.mkdirSync(publicDistDir, { recursive: true });

// 2. Copy compiled bundle files to public/dist
const files = ['bundle.js', 'bundle.js.map', 'bundle.min.js'];
for (const file of files) {
  const src = path.join(distDir, file);
  const dest = path.join(publicDistDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// 3. Export standalone dashboard to public/dashboard.html
fs.writeFileSync(path.join(publicDir, 'dashboard.html'), DASHBOARD_HTML, 'utf8');

// 4. Generate static API stats in public/api/stats and public/api/stats.json
const statsDir = path.join(publicDir, 'api');
fs.mkdirSync(statsDir, { recursive: true });
const statsPayload = JSON.stringify({
  name: 'ZeroPack',
  version: '1.0.0',
  description: 'Zero-dependency JavaScript bundler & dev server built exclusively with Node.js built-ins.',
  status: 'online',
  dependencies: 0,
  features: [
    'Zero external dependencies (0 runtime, 0 dev)',
    'Deterministic AST parser and module bundler',
    'RFC 6455 WebSocket HMR server',
    'Zero-dependency JavaScript minifier with token compression',
    'V3 Source Maps with Base64-VLQ encoder'
  ],
  timestamp: new Date().toISOString()
}, null, 2);
fs.writeFileSync(path.join(statsDir, 'stats'), statsPayload, 'utf8');
fs.writeFileSync(path.join(statsDir, 'stats.json'), statsPayload, 'utf8');

console.log('[Vercel Build] Successfully prepared public assets:');
console.log('  - public/index.html (Contemporary Bento Grid UI)');
console.log('  - public/dist/bundle.js (Compiled ZeroPack bundle)');
console.log('  - public/dashboard.html (ZeroPack Developer Dashboard)');
console.log('  - public/api/stats (Zero-dependency stats JSON endpoint)');
