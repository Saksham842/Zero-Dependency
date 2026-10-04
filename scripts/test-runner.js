import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const testDir = path.resolve('test');
const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js') || f === 'test-server.js')
  .sort()
  .map(f => path.join('test', f));

console.log(`[ZeroPack Test Runner] Found ${files.length} test suites. Running with Node ${process.version} on ${process.platform}...\n`);

let hasFailure = false;
let passedCount = 0;
let failedCount = 0;

for (const file of files) {
  process.stdout.write(`• Running ${file.padEnd(35)} `);
  const result = spawnSync(process.execPath, ['--test', file], {
    encoding: 'utf8',
    env: process.env
  });

  if (result.status === 0) {
    console.log('✔ PASS');
    passedCount++;
  } else {
    console.log('✖ FAIL');
    failedCount++;
    const errMsg = (result.stderr || result.stdout || 'Test failed').trim();
    console.error(`\n=================== FAILURE IN ${file} ===================`);
    console.error(errMsg);
    console.error(`===========================================================\n`);
    
    // GitHub Actions annotation format
    const firstLine = errMsg.split(/\r?\n/).find(l => l.includes('Error') || l.includes('not ok')) || errMsg.split(/\r?\n/)[0] || 'Test suite failed';
    const escapedMsg = firstLine.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    console.log(`::error file=${file}::${escapedMsg}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
      try {
        fs.appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `### ❌ Failure in \`${file}\`\n\`\`\`\n${errMsg.slice(0, 2000)}\n\`\`\`\n\n`
        );
      } catch (_) {}
    }

    hasFailure = true;
  }
}

console.log(`\n-----------------------------------------------------------`);
console.log(`Test Suites: ${passedCount} passed, ${failedCount} failed, ${files.length} total`);
console.log(`-----------------------------------------------------------`);

if (hasFailure) {
  console.error('\n[ZeroPack Test Runner] One or more test suites failed.');
  process.exit(1);
} else {
  console.log('\n[ZeroPack Test Runner] All test suites passed successfully!');
  process.exit(0);
}
