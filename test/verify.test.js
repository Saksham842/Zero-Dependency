import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('npm run verify succeeds without mutating tracked files', () => {
  const before = spawnSync('git', ['status', '--short'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  }).stdout;

  const result = spawnSync('npm', ['run', 'verify'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  const after = spawnSync('git', ['status', '--short'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  }).stdout;

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(after, before);
});

test('read-only verification reports failure without rewriting stale generated artifacts', () => {
  const repoRoot = process.cwd();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zeropack-verify-copy-'));

  for (const entry of ['src', 'dist', 'package.json', 'STDLIB.md', 'zeropack.js']) {
    fs.cpSync(path.join(repoRoot, entry), path.join(tempRoot, entry), { recursive: true });
  }

  const standalonePath = path.join(tempRoot, 'zeropack.js');
  const before = fs.readFileSync(standalonePath, 'utf8');
  fs.writeFileSync(standalonePath, before + '\n// stale generated artifact\n', 'utf8');

  const result = spawnSync(process.execPath, [path.join(repoRoot, 'src/build-tools.js'), '--verify'], {
    cwd: tempRoot,
    encoding: 'utf8'
  });

  const after = fs.readFileSync(standalonePath, 'utf8');

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /verification failed|stale or modified/i);
  assert.equal(after, before + '\n// stale generated artifact\n');
});
