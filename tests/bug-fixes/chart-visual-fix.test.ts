/**
 * Bug Fix Test: Expense Breakdown Chart Visual Fix
 *
 * This test verifies that the CategorySpendingChart component was updated with:
 * 1. Height increased from 350px to 400px
 * 2. Margins added to the chart
 * 3. Title changed to "Expenses Category Summary"
 *
 * Fix: Updated CategorySpendingChart.tsx to fix label cutoff and improve layout
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function testChartHeight() {
  console.log('\n🧪 Test: Chart height increased to 400px\n');

  const projectRoot = path.resolve(__dirname, '../..');
  const chartFilePath = path.join(projectRoot, 'src/components/budget/charts/CategorySpendingChart.tsx');

  try {
    const content = fs.readFileSync(chartFilePath, 'utf-8');

    // Check for height={400} in ResponsiveContainer
    const hasCorrectHeight = content.includes('height={400}');

    if (!hasCorrectHeight) {
      // Check if it still has old height
      const hasOldHeight = content.includes('height={350}');

      results.push({
        testName: 'Chart Height - 400px',
        status: 'FAIL',
        message: hasOldHeight ? 'Chart still has old height of 350px' : 'Chart height of 400px not found',
        details: { file: chartFilePath, hasOldHeight }
      });
      console.log('❌ FAIL: Chart height not set to 400px');

      if (hasOldHeight) {
        console.log('   Old height (350px) still present');
      }

      return false;
    }

    results.push({
      testName: 'Chart Height - 400px',
      status: 'PASS',
      message: 'Chart height correctly set to 400px'
    });

    console.log('✅ PASS: Chart height is 400px');
    return true;
  } catch (error) {
    results.push({
      testName: 'Chart Height - 400px',
      status: 'FAIL',
      message: 'Could not read chart file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testChartMargins() {
  console.log('\n🧪 Test: Chart has margins to prevent label cutoff\n');

  const projectRoot = path.resolve(__dirname, '../..');
  const chartFilePath = path.join(projectRoot, 'src/components/budget/charts/CategorySpendingChart.tsx');

  try {
    const content = fs.readFileSync(chartFilePath, 'utf-8');

    // Check for margin prop in PieChart
    const hasMarginProp = content.includes('margin={{') || content.includes('margin={');

    if (!hasMarginProp) {
      results.push({
        testName: 'Chart Margins',
        status: 'FAIL',
        message: 'Chart does not have margin prop',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: Chart margins not found');
      return false;
    }

    // Check for specific margin values (top, right, bottom, left)
    const hasTopMargin = content.match(/margin={{[^}]*top:\s*\d+/);
    const hasRightMargin = content.match(/margin={{[^}]*right:\s*\d+/);
    const hasBottomMargin = content.match(/margin={{[^}]*bottom:\s*\d+/);
    const hasLeftMargin = content.match(/margin={{[^}]*left:\s*\d+/);

    if (!hasTopMargin || !hasRightMargin || !hasBottomMargin || !hasLeftMargin) {
      results.push({
        testName: 'Chart Margins',
        status: 'FAIL',
        message: 'Chart margins incomplete (missing one or more: top, right, bottom, left)',
        details: {
          file: chartFilePath,
          hasTop: !!hasTopMargin,
          hasRight: !!hasRightMargin,
          hasBottom: !!hasBottomMargin,
          hasLeft: !!hasLeftMargin
        }
      });
      console.log('❌ FAIL: Chart margins incomplete');
      return false;
    }

    results.push({
      testName: 'Chart Margins',
      status: 'PASS',
      message: 'Chart has complete margins (top, right, bottom, left)'
    });

    console.log('✅ PASS: Chart has complete margins');
    return true;
  } catch (error) {
    results.push({
      testName: 'Chart Margins',
      status: 'FAIL',
      message: 'Could not read chart file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testChartTitle() {
  console.log('\n🧪 Test: Chart title changed to "Expenses Category Summary"\n');

  const projectRoot = path.resolve(__dirname, '../..');
  const chartFilePath = path.join(projectRoot, 'src/components/budget/charts/CategorySpendingChart.tsx');

  try {
    const content = fs.readFileSync(chartFilePath, 'utf-8');

    // Check for the new title
    const hasNewTitle = content.includes('Expenses Category Summary');

    if (!hasNewTitle) {
      // Check for old titles
      const hasOldTitle1 = content.includes('Category Breakdown');
      const hasOldTitle2 = content.includes('Spending by Category');

      results.push({
        testName: 'Chart Title',
        status: 'FAIL',
        message: 'Chart title is not "Expenses Category Summary"',
        details: {
          file: chartFilePath,
          hasOldTitle1,
          hasOldTitle2
        }
      });
      console.log('❌ FAIL: Chart title not updated');

      if (hasOldTitle1) {
        console.log('   Old title "Category Breakdown" still present');
      }
      if (hasOldTitle2) {
        console.log('   Old title "Spending by Category" still present');
      }

      return false;
    }

    results.push({
      testName: 'Chart Title',
      status: 'PASS',
      message: 'Chart title correctly set to "Expenses Category Summary"'
    });

    console.log('✅ PASS: Chart title is "Expenses Category Summary"');
    return true;
  } catch (error) {
    results.push({
      testName: 'Chart Title',
      status: 'FAIL',
      message: 'Could not read chart file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testResponsiveContainer() {
  console.log('\n🧪 Test: Chart uses ResponsiveContainer\n');

  const projectRoot = path.resolve(__dirname, '../..');
  const chartFilePath = path.join(projectRoot, 'src/components/budget/charts/CategorySpendingChart.tsx');

  try {
    const content = fs.readFileSync(chartFilePath, 'utf-8');

    // Check for ResponsiveContainer import
    const hasImport = content.includes('ResponsiveContainer');

    if (!hasImport) {
      results.push({
        testName: 'ResponsiveContainer',
        status: 'FAIL',
        message: 'ResponsiveContainer not imported',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: ResponsiveContainer not imported');
      return false;
    }

    // Check for ResponsiveContainer usage
    const hasUsage = content.includes('<ResponsiveContainer');

    if (!hasUsage) {
      results.push({
        testName: 'ResponsiveContainer',
        status: 'FAIL',
        message: 'ResponsiveContainer imported but not used',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: ResponsiveContainer not used');
      return false;
    }

    results.push({
      testName: 'ResponsiveContainer',
      status: 'PASS',
      message: 'Chart correctly uses ResponsiveContainer'
    });

    console.log('✅ PASS: ResponsiveContainer used correctly');
    return true;
  } catch (error) {
    results.push({
      testName: 'ResponsiveContainer',
      status: 'FAIL',
      message: 'Could not read chart file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testPieChartStructure() {
  console.log('\n🧪 Test: PieChart has proper structure with Pie, Tooltip, and Legend\n');

  const projectRoot = path.resolve(__dirname, '../..');
  const chartFilePath = path.join(projectRoot, 'src/components/budget/charts/CategorySpendingChart.tsx');

  try {
    const content = fs.readFileSync(chartFilePath, 'utf-8');

    const hasPieChart = content.includes('<PieChart');
    const hasPie = content.includes('<Pie');
    const hasTooltip = content.includes('<Tooltip');
    const hasLegend = content.includes('<Legend') || content.includes('Legend');

    if (!hasPieChart) {
      results.push({
        testName: 'PieChart Structure',
        status: 'FAIL',
        message: 'PieChart component not found',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: PieChart component not found');
      return false;
    }

    if (!hasPie) {
      results.push({
        testName: 'PieChart Structure',
        status: 'FAIL',
        message: 'Pie component not found',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: Pie component not found');
      return false;
    }

    if (!hasTooltip) {
      results.push({
        testName: 'PieChart Structure',
        status: 'FAIL',
        message: 'Tooltip component not found',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: Tooltip component not found');
      return false;
    }

    if (!hasLegend) {
      results.push({
        testName: 'PieChart Structure',
        status: 'FAIL',
        message: 'Legend component not found',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: Legend component not found');
      return false;
    }

    results.push({
      testName: 'PieChart Structure',
      status: 'PASS',
      message: 'PieChart has all required components'
    });

    console.log('✅ PASS: PieChart structure complete');
    console.log('   ✓ PieChart component');
    console.log('   ✓ Pie component');
    console.log('   ✓ Tooltip component');
    console.log('   ✓ Legend component');
    return true;
  } catch (error) {
    results.push({
      testName: 'PieChart Structure',
      status: 'FAIL',
      message: 'Could not read chart file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testCustomLabel() {
  console.log('\n🧪 Test: Chart has custom label renderer for percentages\n');

  const projectRoot = path.resolve(__dirname, '../..');
  const chartFilePath = path.join(projectRoot, 'src/components/budget/charts/CategorySpendingChart.tsx');

  try {
    const content = fs.readFileSync(chartFilePath, 'utf-8');

    // Check for custom label function
    const hasCustomLabel = content.includes('renderCustomizedLabel') ||
                          content.includes('label={') && content.includes('percent');

    if (!hasCustomLabel) {
      results.push({
        testName: 'Custom Label Renderer',
        status: 'FAIL',
        message: 'Custom label renderer not found',
        details: { file: chartFilePath }
      });
      console.log('❌ FAIL: Custom label renderer not found');
      return false;
    }

    results.push({
      testName: 'Custom Label Renderer',
      status: 'PASS',
      message: 'Chart has custom label renderer'
    });

    console.log('✅ PASS: Custom label renderer present');
    return true;
  } catch (error) {
    results.push({
      testName: 'Custom Label Renderer',
      status: 'FAIL',
      message: 'Could not read chart file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function printTestSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY - Chart Visual Fix');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.testName}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.details && result.status === 'FAIL') {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });

  console.log('-'.repeat(80));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('-'.repeat(80) + '\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! The chart visual fix is working correctly.\n');
    console.log('Summary of verified fixes:');
    console.log('  ✓ Chart height increased to 400px');
    console.log('  ✓ Margins added to prevent label cutoff');
    console.log('  ✓ Title changed to "Expenses Category Summary"');
    console.log('  ✓ Responsive container properly configured');
    console.log('  ✓ All chart components present and structured correctly\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
  }
}

function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('CHART VISUAL FIX VERIFICATION');
  console.log('='.repeat(80));
  console.log('\nThis test suite verifies that:');
  console.log('1. Chart height increased from 350px to 400px');
  console.log('2. Margins added to PieChart to prevent label cutoff');
  console.log('3. Title changed to "Expenses Category Summary"');
  console.log('4. ResponsiveContainer properly configured');
  console.log('5. Chart structure is complete and correct');
  console.log('\n' + '='.repeat(80) + '\n');

  testChartHeight();
  testChartMargins();
  testChartTitle();
  testResponsiveContainer();
  testPieChartStructure();
  testCustomLabel();

  printTestSummary();

  // Exit with error code if tests failed
  const hasFailures = results.some(r => r.status === 'FAIL');
  process.exit(hasFailures ? 1 : 0);
}

// Run tests
runTests();
