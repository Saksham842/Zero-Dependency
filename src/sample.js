/**
 * @module sample
 * @description Demo project scaffolder for ZeroPack.
 *
 * Responsibilities:
 *  1. Scaffolds a zero-dependency sample application into `src/` and `public/`.
 *  2. Generates `math.js`, `utils.js`, `components.js`, `styles.css`, `index.js`.
 *  3. Generates a basic `public/index.html` and `.env` file.
 *
 * @requires node:fs
 * @requires node:path
 * @requires node:process
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { cssCode } from './sample-assets-css.js';
import { mathCode, utilsCode, componentsCode, indexCode, htmlCode, envCode } from './sample-assets-js.js';

/**
 * Creates the ZeroPack sample application in the specified root directory.
 * Writes sample JS, CSS, HTML, and .env files to disk if they do not exist.
 *
 * @param {string} [rootDir=process.cwd()] Project root directory.
 */
export function createSampleApp(rootDir = process.cwd()) {
  const srcDir = path.join(rootDir, 'src');
  const publicDir = path.join(rootDir, 'public');

  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'math.js'), mathCode, 'utf8');
  fs.writeFileSync(path.join(srcDir, 'utils.js'), utilsCode, 'utf8');
  fs.writeFileSync(path.join(srcDir, 'styles.css'), cssCode, 'utf8');
  fs.writeFileSync(path.join(srcDir, 'components.js'), componentsCode, 'utf8');
  fs.writeFileSync(path.join(srcDir, 'index.js'), indexCode, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'index.html'), htmlCode, 'utf8');
  fs.writeFileSync(path.join(rootDir, '.env'), envCode, 'utf8');
}
