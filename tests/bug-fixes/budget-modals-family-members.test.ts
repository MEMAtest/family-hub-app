/**
 * Bug Fix Test: Budget Entry Forms - Family Members Dropdown
 *
 * This test verifies that the budget modals (AddExpenseModal and AddIncomeModal)
 * now use the family store to get real family members instead of hardcoded data.
 *
 * Fix: Changed from hardcoded family members to using `useFamilyStore` to get
 * real family members from the database.
 *
 * What to verify:
 * 1. Both modals import useFamilyStore
 * 2. Family members dropdown shows actual family members
 * 3. "Family (All Members)" option is present
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
});

const FAMILY_ID = 'cmg741w2h0000ljcb3f6fo19g';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function testImportStatement(filePath: string, fileName: string) {
  console.log(`\n🧪 Test: ${fileName} imports useFamilyStore\n`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for import statement
    const hasImport = content.includes("import { useFamilyStore } from '@/store/familyStore'") ||
                      content.includes('import { useFamilyStore }') ||
                      content.includes('useFamilyStore');

    if (!hasImport) {
      results.push({
        testName: `${fileName} - Import useFamilyStore`,
        status: 'FAIL',
        message: 'File does not import useFamilyStore',
        details: { file: filePath }
      });
      console.log('❌ FAIL: useFamilyStore import not found');
      return false;
    }

    results.push({
      testName: `${fileName} - Import useFamilyStore`,
      status: 'PASS',
      message: 'File correctly imports useFamilyStore'
    });

    console.log('✅ PASS: useFamilyStore import found');
    return true;
  } catch (error) {
    results.push({
      testName: `${fileName} - Import useFamilyStore`,
      status: 'FAIL',
      message: 'Could not read file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testStoreUsage(filePath: string, fileName: string) {
  console.log(`\n🧪 Test: ${fileName} uses familyMembers from store\n`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for store usage
    const usesStore = content.includes('useFamilyStore((state) => state.familyMembers)') ||
                      content.includes('useFamilyStore(state => state.familyMembers)');

    if (!usesStore) {
      results.push({
        testName: `${fileName} - Use familyMembers from store`,
        status: 'FAIL',
        message: 'File does not get familyMembers from store',
        details: { file: filePath }
      });
      console.log('❌ FAIL: familyMembers not retrieved from store');
      return false;
    }

    results.push({
      testName: `${fileName} - Use familyMembers from store`,
      status: 'PASS',
      message: 'File correctly retrieves familyMembers from store'
    });

    console.log('✅ PASS: familyMembers retrieved from store');
    return true;
  } catch (error) {
    results.push({
      testName: `${fileName} - Use familyMembers from store`,
      status: 'FAIL',
      message: 'Could not read file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testFamilyAllOption(filePath: string, fileName: string) {
  console.log(`\n🧪 Test: ${fileName} has "Family (All Members)" option\n`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for "Family (All Members)" option
    const hasAllOption = content.includes('Family (All Members)');

    if (!hasAllOption) {
      results.push({
        testName: `${fileName} - Family (All Members) option`,
        status: 'FAIL',
        message: 'File does not have "Family (All Members)" option',
        details: { file: filePath }
      });
      console.log('❌ FAIL: "Family (All Members)" option not found');
      return false;
    }

    // Check that it has the correct value
    const hasCorrectValue = content.includes('<option value="all">Family (All Members)</option>');

    if (!hasCorrectValue) {
      results.push({
        testName: `${fileName} - Family (All Members) option`,
        status: 'FAIL',
        message: '"Family (All Members)" option exists but may have incorrect value attribute',
        details: { file: filePath }
      });
      console.log('❌ FAIL: "Family (All Members)" option found but value attribute may be incorrect');
      return false;
    }

    results.push({
      testName: `${fileName} - Family (All Members) option`,
      status: 'PASS',
      message: '"Family (All Members)" option correctly implemented'
    });

    console.log('✅ PASS: "Family (All Members)" option found with correct value');
    return true;
  } catch (error) {
    results.push({
      testName: `${fileName} - Family (All Members) option`,
      status: 'FAIL',
      message: 'Could not read file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testFamilyMembersMapping(filePath: string, fileName: string) {
  console.log(`\n🧪 Test: ${fileName} correctly maps familyMembers in dropdown\n`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for familyMembers.map pattern
    const hasMappingPattern = content.includes('familyMembers.map(member =>') ||
                              content.includes('familyMembers.map((member) =>');

    if (!hasMappingPattern) {
      results.push({
        testName: `${fileName} - Map familyMembers to options`,
        status: 'FAIL',
        message: 'File does not map familyMembers array to options',
        details: { file: filePath }
      });
      console.log('❌ FAIL: familyMembers mapping not found');
      return false;
    }

    // Check for proper option structure
    const hasOptionStructure = content.includes('<option key={member.id} value={member.id}>{member.name}</option>');

    if (!hasOptionStructure) {
      results.push({
        testName: `${fileName} - Map familyMembers to options`,
        status: 'FAIL',
        message: 'familyMembers mapping exists but option structure may be incorrect',
        details: { file: filePath }
      });
      console.log('❌ FAIL: Option structure may be incorrect');
      return false;
    }

    results.push({
      testName: `${fileName} - Map familyMembers to options`,
      status: 'PASS',
      message: 'familyMembers correctly mapped to dropdown options'
    });

    console.log('✅ PASS: familyMembers correctly mapped to options');
    return true;
  } catch (error) {
    results.push({
      testName: `${fileName} - Map familyMembers to options`,
      status: 'FAIL',
      message: 'Could not read file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

function testNoHardcodedMembers(filePath: string, fileName: string) {
  console.log(`\n🧪 Test: ${fileName} does not have hardcoded family members\n`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for common patterns of hardcoded members
    const hasHardcodedArray = content.match(/familyMembers\s*=\s*\[[\s\S]*?\]/);
    const hasHardcodedNames = content.includes("name: 'Dad'") ||
                              content.includes("name: 'Mum'") ||
                              content.includes('{ id:') && content.includes(', name:');

    if (hasHardcodedArray || hasHardcodedNames) {
      results.push({
        testName: `${fileName} - No hardcoded members`,
        status: 'FAIL',
        message: 'File appears to have hardcoded family members',
        details: { file: filePath }
      });
      console.log('❌ FAIL: Hardcoded family members found');
      return false;
    }

    results.push({
      testName: `${fileName} - No hardcoded members`,
      status: 'PASS',
      message: 'No hardcoded family members found'
    });

    console.log('✅ PASS: No hardcoded family members');
    return true;
  } catch (error) {
    results.push({
      testName: `${fileName} - No hardcoded members`,
      status: 'FAIL',
      message: 'Could not read file',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Could not read file');
    return false;
  }
}

async function testActualFamilyMembers() {
  console.log('\n🧪 Test: Verify actual family members exist in database\n');

  try {
    const familyMembers = await prisma.familyMember.findMany({
      where: { familyId: FAMILY_ID },
      select: {
        id: true,
        name: true,
        role: true
      }
    });

    if (familyMembers.length === 0) {
      results.push({
        testName: 'Database - Family members exist',
        status: 'FAIL',
        message: 'No family members found in database for the test family',
        details: { familyId: FAMILY_ID }
      });
      console.log('❌ FAIL: No family members in database');
      return false;
    }

    results.push({
      testName: 'Database - Family members exist',
      status: 'PASS',
      message: `Found ${familyMembers.length} family members in database`,
      details: { count: familyMembers.length, members: familyMembers }
    });

    console.log(`✅ PASS: Found ${familyMembers.length} family members`);
    familyMembers.forEach(member => {
      console.log(`   - ${member.name} (${member.role})`);
    });

    return true;
  } catch (error) {
    results.push({
      testName: 'Database - Family members exist',
      status: 'FAIL',
      message: 'Could not query database',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Database query failed');
    return false;
  }
}

function printTestSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY - Budget Modals Family Members Fix');
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
    console.log('🎉 All tests passed! The budget modal family members fix is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('BUDGET MODALS FAMILY MEMBERS BUG FIX VERIFICATION');
  console.log('='.repeat(80));
  console.log('\nThis test suite verifies that:');
  console.log('1. AddExpenseModal imports and uses useFamilyStore');
  console.log('2. AddIncomeModal imports and uses useFamilyStore');
  console.log('3. Both modals have "Family (All Members)" option');
  console.log('4. Both modals map actual family members from store');
  console.log('5. No hardcoded family members remain');
  console.log('\n' + '='.repeat(80) + '\n');

  const projectRoot = path.resolve(__dirname, '../..');
  const addExpenseModalPath = path.join(projectRoot, 'src/components/budget/modals/AddExpenseModal.tsx');
  const addIncomeModalPath = path.join(projectRoot, 'src/components/budget/modals/AddIncomeModal.tsx');

  console.log('Testing AddExpenseModal...');
  console.log('='.repeat(80));

  testImportStatement(addExpenseModalPath, 'AddExpenseModal');
  testStoreUsage(addExpenseModalPath, 'AddExpenseModal');
  testFamilyAllOption(addExpenseModalPath, 'AddExpenseModal');
  testFamilyMembersMapping(addExpenseModalPath, 'AddExpenseModal');
  testNoHardcodedMembers(addExpenseModalPath, 'AddExpenseModal');

  console.log('\n' + '='.repeat(80));
  console.log('Testing AddIncomeModal...');
  console.log('='.repeat(80));

  testImportStatement(addIncomeModalPath, 'AddIncomeModal');
  testStoreUsage(addIncomeModalPath, 'AddIncomeModal');
  testFamilyAllOption(addIncomeModalPath, 'AddIncomeModal');
  testFamilyMembersMapping(addIncomeModalPath, 'AddIncomeModal');
  testNoHardcodedMembers(addIncomeModalPath, 'AddIncomeModal');

  console.log('\n' + '='.repeat(80));
  console.log('Testing Database...');
  console.log('='.repeat(80));

  await testActualFamilyMembers();

  printTestSummary();

  await prisma.$disconnect();

  // Exit with error code if tests failed
  const hasFailures = results.some(r => r.status === 'FAIL');
  process.exit(hasFailures ? 1 : 0);
}

// Run tests
runTests();
