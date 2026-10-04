import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const testDir = path.resolve('test');
const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js') || f === 'test-server.js')
  .sort()
  .map(f => path.join('test', f));

console.log(`[ZeroPack Test Runner] Running ${files.length} test suites with Node ${process.version}...`);

const child = spawn(process.execPath, ['--test', ...files], {
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
