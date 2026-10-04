import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function waitForServer(url, timeoutMs = 6000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      fetchHttp(url)
        .then(res => {
          if (res.statusCode === 200) resolve(res);
          else setTimeout(check, 100);
        })
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timed out waiting for server at ${url}`));
          } else {
            setTimeout(check, 100);
          }
        });
    }
    check();
  });
}

test('Fresh-clone test: zero-config build, serve, and port fallback with no prior setup', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zp-fresh-clone-'));
  console.log('[TEST] Created fresh clone directory:', tmpDir);

  let proc1 = null;
  let proc2 = null;

  try {
    // 1. Copy repository files
    copyDirRecursive(process.cwd(), tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, 'zeropack.js')), 'zeropack.js must exist in fresh clone');

    // Helper to wait for the server port log
    function waitForPortInLogs(getLogs, timeoutMs = 8000) {
      const start = Date.now();
      return new Promise((resolve, reject) => {
        function check() {
          const match = getLogs().match(/http:\/\/localhost:(\d+)\//);
          if (match) {
            resolve(parseInt(match[1], 10));
          } else if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timed out waiting for server port in logs. Logs:\n${getLogs()}`));
          } else {
            setTimeout(check, 100);
          }
        }
        check();
      });
    }

    // 2. Launch instance 1: node zeropack.js with NO flags (except --no-open to prevent spawning browser window in tests)
    proc1 = spawn(process.execPath, ['zeropack.js', '--no-open'], {
      cwd: tmpDir,
      stdio: 'pipe'
    });

    let proc1Logs = '';
    proc1.stdout.on('data', d => { proc1Logs += d.toString(); });
    proc1.stderr.on('data', d => { proc1Logs += d.toString(); });

    const port1 = await waitForPortInLogs(() => proc1Logs);
    console.log(`[TEST] Instance 1 assigned port: ${port1}`);

    // Wait for instance 1 to bind and serve
    const host1 = '127.0.0.1';
    const res1 = await waitForServer(`http://${host1}:${port1}/`).catch(() => waitForServer(`http://localhost:${port1}/`));
    assert.strictEqual(res1.statusCode, 200, `Instance 1 on port ${port1} must respond with 200 OK`);

    const dashRes1 = await fetchHttp(`http://${host1}:${port1}/__zeropack`).catch(() => fetchHttp(`http://localhost:${port1}/__zeropack`));
    assert.strictEqual(dashRes1.statusCode, 200, 'Developer Dashboard must respond with 200 OK');

    // Verify build artifact was generated automatically
    const bundlePath = path.join(tmpDir, 'dist', 'bundle.js');
    assert.ok(fs.existsSync(bundlePath), 'dist/bundle.js must be created on zero-config run');
    const bundleSize = fs.statSync(bundlePath).size;
    assert.ok(bundleSize > 0, 'dist/bundle.js must not be empty');

    // 3. Launch instance 2: tests automatic port fallback
    proc2 = spawn(process.execPath, ['zeropack.js', '--no-open'], {
      cwd: tmpDir,
      stdio: 'pipe'
    });

    let proc2Logs = '';
    proc2.stdout.on('data', d => { proc2Logs += d.toString(); });
    proc2.stderr.on('data', d => { proc2Logs += d.toString(); });

    const port2 = await waitForPortInLogs(() => proc2Logs);
    console.log(`[TEST] Instance 2 assigned port: ${port2}`);

    assert.notStrictEqual(port2, port1, 'Instance 2 must select a different, non-conflicting port');
    const res2 = await waitForServer(`http://${host1}:${port2}/`).catch(() => waitForServer(`http://localhost:${port2}/`));
    assert.strictEqual(res2.statusCode, 200, `Instance 2 on port ${port2} must respond with 200 OK`);
  } finally {
    if (proc1) {
      try { proc1.kill(); } catch (_) {}
    }
    if (proc2) {
      try { proc2.kill(); } catch (_) {}
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
});
