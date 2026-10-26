#!/usr/bin/env node
// tests/test-runner.mjs
// Standalone, zero-dependency test runner for Milestone M5 E2E test suites (Tiers 1-4)
// Run with: node tests/test-runner.mjs [--tier=1|2|3|4|all]

import { createTier1Suite } from './e2e/tier1-feature-coverage.test.mjs';
import { createTier2Suite } from './e2e/tier2-boundary-corner.test.mjs';
import { createTier3Suite } from './e2e/tier3-cross-feature.test.mjs';
import { createTier4Suite } from './e2e/tier4-classroom-workload.test.mjs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
};

async function main() {
  const args = process.argv.slice(2);
  let tierFilter = 'all';

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      tierFilter = arg.replace('--tier=', '').trim();
    } else if (arg === '-t1' || arg === '1') {
      tierFilter = '1';
    } else if (arg === '-t2' || arg === '2') {
      tierFilter = '2';
    } else if (arg === '-t3' || arg === '3') {
      tierFilter = '3';
    } else if (arg === '-t4' || arg === '4') {
      tierFilter = '4';
    }
  }

  console.log(`\n${colors.bold}${colors.magenta}======================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  SCHOOL 1:1 COUNSELING & SECRET SUGGESTION BOX PLATFORM${colors.reset}`);
  console.log(`${colors.bold}  Milestone M5 Automated E2E Test Suite Runner${colors.reset}`);
  console.log(`  Target Tier: ${colors.yellow}${tierFilter.toUpperCase()}${colors.reset} | Mode: ${process.env.TEST_BASE_URL ? 'Live HTTP (' + process.env.TEST_BASE_URL + ')' : 'In-Process Contract Engine'}`);
  console.log(`${colors.bold}${colors.magenta}======================================================================${colors.reset}`);

  const suitesToRun = [];

  if (tierFilter === 'all' || tierFilter === '1') {
    suitesToRun.push(createTier1Suite());
  }
  if (tierFilter === 'all' || tierFilter === '2') {
    suitesToRun.push(createTier2Suite());
  }
  if (tierFilter === 'all' || tierFilter === '3') {
    suitesToRun.push(createTier3Suite());
  }
  if (tierFilter === 'all' || tierFilter === '4') {
    suitesToRun.push(createTier4Suite());
  }

  const overallStartTime = Date.now();
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const suiteResults = [];

  for (const suite of suitesToRun) {
    const res = await suite.run();
    totalTests += res.total;
    totalPassed += res.passed;
    totalFailed += res.failed;
    suiteResults.push({ name: suite.name, ...res });
  }

  const overallDuration = Date.now() - overallStartTime;

  console.log(`\n${colors.bold}${colors.magenta}----------------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bold}TEST EXECUTION SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}----------------------------------------------------------------------${colors.reset}`);

  for (const sr of suiteResults) {
    const statusColor = sr.failed === 0 ? colors.green : colors.red;
    const mark = sr.failed === 0 ? '✔' : '✖';
    console.log(`  ${statusColor}${mark} ${sr.name}${colors.reset}: ${sr.passed}/${sr.total} passed (${sr.failed} failed)`);
  }

  console.log(`${colors.bold}${colors.magenta}----------------------------------------------------------------------${colors.reset}`);
  console.log(`  ${colors.bold}Total Tests:${colors.reset}    ${totalTests}`);
  console.log(`  ${colors.green}${colors.bold}Passed Tests:${colors.reset}   ${totalPassed}`);
  console.log(`  ${totalFailed === 0 ? colors.green : colors.red}${colors.bold}Failed Tests:${colors.reset}   ${totalFailed}`);
  console.log(`  ${colors.bold}Total Duration:${colors.reset} ${overallDuration}ms`);
  console.log(`${colors.bold}${colors.magenta}======================================================================${colors.reset}`);

  if (totalFailed > 0) {
    console.log(`\n${colors.red}${colors.bold}💥 RESULT: TEST SUITE FAILED with ${totalFailed} failure(s).${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}🎉 RESULT: ALL ${totalPassed} TESTS PASSED CLEANLY! (100% SUCCESS)${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
