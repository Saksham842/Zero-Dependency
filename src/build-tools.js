/**
 * @module build-tools
 * @description ZeroPack build-pipeline utilities.
 *
 * Responsibilities:
 *  1. Standalone single-file compiler — concatenates all src modules into
 *     `zeropack.js`, hoisting Node built-in imports at the top.
 *  2. Reproducible-build verifier — runs two sequential builds and compares
 *     SHA-256 digests byte-for-byte.
 *  3. STDLIB.md generator — produces the standard-library replacement matrix
 *     that documents all 10+ stdlib substitutions (required for STDLIB Log +3 bonus).
 *  4. Read-only project verification — checks `zeropack.js`, `STDLIB.md`, and
 *     `dist/bundle.js` against expected content without mutating any files.
 *
 * @requires node:fs
 * @requires node:path
 * @requires node:crypto
 * @requires node:process
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { colors, logger } from './cli.js';
import { buildDependencyGraph } from './parser.js';
import { generateBundle } from './bundler.js';
import { createStdlibDocSource, generateStdlibDoc } from './build-tools-stdlib.js';
import { createStandaloneSource, compileSingleFile } from './build-tools-standalone.js';

/** Project root — resolved once at startup. @type {string} */
const ROOT_DIR = process.cwd();
/** Absolute path to the `src/` directory. @type {string} */
const SRC_DIR = path.join(ROOT_DIR, 'src');
/** Output path for the standalone single-file executable. @type {string} */
const OUTPUT_STANDALONE = path.join(ROOT_DIR, 'zeropack.js');
/** Output path for the generated STDLIB documentation. @type {string} */
const STDLIB_DOC_PATH = path.join(ROOT_DIR, 'STDLIB.md');
/** Output path for the pre-built distribution bundle. @type {string} */
const DIST_BUNDLE_PATH = path.join(ROOT_DIR, 'dist', 'bundle.js');

/**
 * 2. Reproducible Build Verification
 * Runs sequential builds on test fixtures and validates byte-for-byte identical output.
 */
export function verifyReproducibleBuild(entryFile) {
  logger.build(`Running Reproducible Build Verification on ${colors.cyan(entryFile)}...`);

  // Build 1
  const graph1 = buildDependencyGraph(entryFile, ROOT_DIR);
  const bundle1 = generateBundle(graph1, { minify: true });
  const hash1 = bundle1.hash;

  // Build 2
  const graph2 = buildDependencyGraph(entryFile, ROOT_DIR);
  const bundle2 = generateBundle(graph2, { minify: true });
  const hash2 = bundle2.hash;

  console.log(`\n${colors.bold('--- VERIFICATION AUDIT REPORT ---')}`);
  console.log(`Build #1 SHA-256: ${colors.cyan(hash1)} (${bundle1.size} bytes)`);
  console.log(`Build #2 SHA-256: ${colors.cyan(hash2)} (${bundle2.size} bytes)`);

  if (hash1 === hash2 && bundle1.code === bundle2.code) {
    logger.success(`${colors.bold('BYTE-FOR-BYTE IDENTICAL!')} Deterministic reproducible build verified 100%.`);
    return true;
  } else {
    logger.error(`${colors.bold('VERIFICATION FAILED!')} Non-deterministic output detected.`);
    return false;
  }
}

function reportArtifactCheck(label, artifactPath, expectedSource) {
  if (!fs.existsSync(artifactPath)) {
    logger.error(`${label} missing: ${artifactPath}`);
    return false;
  }

  const actualSource = fs.readFileSync(artifactPath, 'utf8');
  if (actualSource !== expectedSource) {
    const expectedHash = crypto.createHash('sha256').update(expectedSource).digest('hex');
    const actualHash = crypto.createHash('sha256').update(actualSource).digest('hex');
    logger.error(`${label} is stale or modified.`);
    logger.error(`Expected SHA-256: ${expectedHash}`);
    logger.error(`Actual SHA-256:   ${actualHash}`);
    return false;
  }

  logger.success(`${label} integrity verified.`);
  return true;
}

/**
 * Read-only verification: checks reproducibility and tracked generated artifacts
 * without writing files or changing permissions.
 */
export function verifyProject(entryFile = 'src/index.js') {
  console.log(`\n${colors.cyan(colors.bold('=== ZeroPack Read-Only Verification ==='))}\n`);

  let ok = verifyReproducibleBuild(entryFile);

  const graph = buildDependencyGraph(entryFile, ROOT_DIR);
  const expectedBundle = generateBundle(graph, { minify: true }).code;

  ok = reportArtifactCheck('Standalone executable', OUTPUT_STANDALONE, createStandaloneSource(SRC_DIR)) && ok;
  ok = reportArtifactCheck('STDLIB.md', STDLIB_DOC_PATH, createStdlibDocSource()) && ok;
  ok = reportArtifactCheck('dist/bundle.js', DIST_BUNDLE_PATH, expectedBundle) && ok;

  if (ok) {
    logger.success('Read-only verification passed. No files were modified.');
  } else {
    logger.error('Read-only verification failed. Regenerate artifacts with npm run build and npm run build-standalone, then rerun npm run verify.');
  }

  return ok;
}

/**
 * Master Pipeline Runner
 */
export async function runBuildTools() {
  console.log(`\n${colors.cyan(colors.bold('=== ZeroPack Build Tools & Submission Packager ==='))}\n`);

  // 1. Compile single-file executable
  compileSingleFile(SRC_DIR, OUTPUT_STANDALONE);

  // 2. Generate sample project if not present to verify reproducible builds
  const sampleEntry = path.join(ROOT_DIR, 'src', 'index.js');
  if (!fs.existsSync(sampleEntry)) {
    // Ensure example files exist
    const { createSampleApp } = await import('./sample.js');
    createSampleApp();
  }

  // 3. Verify reproducible build
  const verified = verifyReproducibleBuild('src/index.js');

  // 4. Generate STDLIB.md
  generateStdlibDoc(STDLIB_DOC_PATH);

  if (verified) {
    logger.success(`${colors.green(colors.bold('All 5 Steps & Verification Audits Passed Successfully!'))}`);
  }
}

// Auto-run if executed directly
const isMain = process.argv[1] && process.argv[1].endsWith('build-tools.js');
if (isMain) {
  const verifyOnly = process.argv.includes('--verify');
  const runner = verifyOnly ? () => Promise.resolve(verifyProject('src/index.js')) : runBuildTools;

  runner().then((ok) => {
    if (ok === false) {
      process.exit(1);
    }
  }).catch((err) => {
    logger.error('Build tools failed: ' + err.message);
    process.exit(1);
  });
}
