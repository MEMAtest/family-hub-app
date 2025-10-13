/**
 * Master Test Runner for Bug Fix Verification
 *
 * Runs all bug fix verification tests and provides a comprehensive report.
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface TestSuiteResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  exitCode: number;
  output: string;
  duration: number;
}

const results: TestSuiteResult[] = [];

function runTestSuite(name: string, scriptPath: string): TestSuiteResult {
  console.log('\n' + '='.repeat(80));
  console.log(`Running: ${name}`);
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    const output = execSync(`tsx ${scriptPath}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    const duration = Date.now() - startTime;

    console.log(output);

    return {
      name,
      status: 'PASS',
      exitCode: 0,
      output,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const output = error.stdout || error.stderr || error.message;

    console.log(output);

    return {
      name,
      status: error.status === 1 ? 'FAIL' : 'ERROR',
      exitCode: error.status || -1,
      output,
      duration
    };
  }
}

function printOverallSummary() {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'OVERALL TEST SUMMARY' + ' '.repeat(38) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const total = results.length;

  results.forEach((result, index) => {
    let icon = '✅';
    let statusColor = '\x1b[32m'; // Green

    if (result.status === 'FAIL') {
      icon = '❌';
      statusColor = '\x1b[31m'; // Red
    } else if (result.status === 'ERROR') {
      icon = '⚠️';
      statusColor = '\x1b[33m'; // Yellow
    }

    console.log(`${icon} ${index + 1}. ${result.name}`);
    console.log(`   ${statusColor}Status: ${result.status}\x1b[0m`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Exit Code: ${result.exitCode}`);
    console.log('');
  });

  console.log('-'.repeat(80));
  console.log(`Total Test Suites: ${total} | Passed: ${passed} | Failed: ${failed} | Errors: ${errors}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`Total Duration: ${(results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(2)}s`);
  console.log('-'.repeat(80));
  console.log('');

  if (failed === 0 && errors === 0) {
    console.log('🎉 🎉 🎉  ALL BUG FIX TESTS PASSED!  🎉 🎉 🎉');
    console.log('');
    console.log('All bug fixes have been verified:');
    console.log('  ✓ Calendar Event Update (no more 500 errors)');
    console.log('  ✓ Budget Modals using real family members');
    console.log('  ✓ Chart visual improvements (height, margins, title)');
    console.log('');
  } else {
    console.log('⚠️  SOME TESTS FAILED OR ENCOUNTERED ERRORS');
    console.log('');
    console.log('Please review the test output above for details.');
    console.log('');

    if (failed > 0) {
      console.log(`Failed Test Suites (${failed}):`);
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.name}`);
      });
      console.log('');
    }

    if (errors > 0) {
      console.log(`Test Suites with Errors (${errors}):`);
      results.filter(r => r.status === 'ERROR').forEach(r => {
        console.log(`  - ${r.name}`);
      });
      console.log('');
    }
  }
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + 'BUG FIX VERIFICATION TEST SUITE' + ' '.repeat(32) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('');
  console.log('Running comprehensive tests to verify all bug fixes are working correctly.');
  console.log('');
  console.log('Test Suites:');
  console.log('  1. Calendar Event Update API Fix');
  console.log('  2. Budget Modals Family Members Fix');
  console.log('  3. Chart Visual Improvements Fix');
  console.log('');

  const testsDir = path.join(__dirname);

  // Run each test suite
  results.push(runTestSuite(
    'Calendar Event Update Fix',
    path.join(testsDir, 'calendar-event-update.test.ts')
  ));

  results.push(runTestSuite(
    'Budget Modals Family Members Fix',
    path.join(testsDir, 'budget-modals-family-members.test.ts')
  ));

  results.push(runTestSuite(
    'Chart Visual Fix',
    path.join(testsDir, 'chart-visual-fix.test.ts')
  ));

  // Print overall summary
  printOverallSummary();

  // Exit with appropriate code
  const hasFailures = results.some(r => r.status !== 'PASS');
  process.exit(hasFailures ? 1 : 0);
}

main();
