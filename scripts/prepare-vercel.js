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

console.log('[Vercel Build] Successfully prepared public assets:');
console.log('  - public/index.html (Contemporary Bento Grid UI)');
console.log('  - public/dist/bundle.js (Compiled ZeroPack bundle)');
console.log('  - public/dashboard.html (ZeroPack Developer Dashboard)');
