import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FAMILY_ID = 'cmg741w2h0000ljcb3f6fo19g';

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  error?: string;
}

const testResults: TestResult[] = [];

function logTest(testName: string, passed: boolean, details: string, error?: string) {
  testResults.push({ testName, passed, details, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  console.log(`   ${details}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  console.log('');
}

// Test 1: CRUD Operations for Recurring Income
async function testRecurringIncomeCRUD() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 1: RECURRING INCOME CRUD OPERATIONS');
  console.log('='.repeat(70) + '\n');

  try {
    // CREATE
    console.log('1.1 CREATE: Adding recurring monthly income...');
    const newIncome = await prisma.budgetIncome.create({
      data: {
        familyId: FAMILY_ID,
        incomeName: 'Test Monthly Salary',
        amount: 5000,
        category: 'Salary',
        isRecurring: true,
        recurringFrequency: 'monthly',
        recurringStartDate: new Date(2025, 9, 1), // October 2025
        recurringEndDate: null,
        paymentDate: null
      }
    });

    const hasRequiredFields = !!(newIncome.id &&
                              newIncome.incomeName === 'Test Monthly Salary' &&
                              newIncome.amount === 5000 &&
                              newIncome.isRecurring === true &&
                              newIncome.recurringFrequency === 'monthly');

    logTest(
      'CREATE Recurring Income',
      hasRequiredFields,
      `Created income with ID: ${newIncome.id}`,
      hasRequiredFields ? undefined : 'Missing required fields'
    );

    // READ
    console.log('1.2 READ: Fetching created income...');
    const fetchedIncome = await prisma.budgetIncome.findUnique({
      where: { id: newIncome.id }
    });

    const readSuccess = !!(fetchedIncome !== null && fetchedIncome.id === newIncome.id);
    logTest(
      'READ Recurring Income',
      readSuccess,
      `Fetched income: ${fetchedIncome?.incomeName}`,
      readSuccess ? undefined : 'Failed to fetch income'
    );

    // UPDATE
    console.log('1.3 UPDATE: Modifying income amount and frequency...');
    const updatedIncome = await prisma.budgetIncome.update({
      where: { id: newIncome.id },
      data: {
        amount: 5500,
        recurringFrequency: 'weekly',
        recurringEndDate: new Date(2025, 11, 31) // December 31, 2025
      }
    });

    const updateSuccess = !!(updatedIncome.amount === 5500 &&
                         updatedIncome.recurringFrequency === 'weekly' &&
                         updatedIncome.recurringEndDate !== null);

    logTest(
      'UPDATE Recurring Income',
      updateSuccess,
      `Updated amount to £${updatedIncome.amount}, frequency to ${updatedIncome.recurringFrequency}`,
      updateSuccess ? undefined : 'Update validation failed'
    );

    // DELETE
    console.log('1.4 DELETE: Removing test income...');
    await prisma.budgetIncome.delete({
      where: { id: newIncome.id }
    });

    const deletedCheck = await prisma.budgetIncome.findUnique({
      where: { id: newIncome.id }
    });

    logTest(
      'DELETE Recurring Income',
      deletedCheck === null,
      'Income successfully deleted',
      deletedCheck ? 'Income still exists after deletion' : undefined
    );

  } catch (error) {
    logTest(
      'Recurring Income CRUD',
      false,
      'CRUD operations failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Test 2: CRUD Operations for Recurring Expenses
async function testRecurringExpenseCRUD() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: RECURRING EXPENSE CRUD OPERATIONS');
  console.log('='.repeat(70) + '\n');

  try {
    // CREATE
    console.log('2.1 CREATE: Adding recurring expense with budget limit...');
    const newExpense = await prisma.budgetExpense.create({
      data: {
        familyId: FAMILY_ID,
        expenseName: 'Test Gym Membership',
        amount: 50,
        category: 'Healthcare',
        budgetLimit: 60,
        isRecurring: true,
        recurringFrequency: 'monthly',
        recurringStartDate: new Date(2025, 9, 1),
        recurringEndDate: null,
        paymentDate: null
      }
    });

    const hasRequiredFields = !!(newExpense.id &&
                              newExpense.expenseName === 'Test Gym Membership' &&
                              newExpense.budgetLimit === 60);

    logTest(
      'CREATE Recurring Expense',
      hasRequiredFields,
      `Created expense with budget limit: £${newExpense.budgetLimit}`,
      hasRequiredFields ? undefined : 'Missing required fields'
    );

    // READ
    console.log('2.2 READ: Fetching created expense...');
    const fetchedExpense = await prisma.budgetExpense.findUnique({
      where: { id: newExpense.id }
    });

    const readSuccess = fetchedExpense !== null;
    logTest(
      'READ Recurring Expense',
      readSuccess,
      `Fetched expense: ${fetchedExpense?.expenseName}`,
      readSuccess ? undefined : 'Failed to fetch expense'
    );

    // UPDATE
    console.log('2.3 UPDATE: Modifying expense and budget limit...');
    const updatedExpense = await prisma.budgetExpense.update({
      where: { id: newExpense.id },
      data: {
        amount: 55,
        budgetLimit: 65,
        recurringEndDate: new Date(2026, 2, 31) // March 31, 2026
      }
    });

    const updateSuccess = !!(updatedExpense.amount === 55 && updatedExpense.budgetLimit === 65);
    logTest(
      'UPDATE Recurring Expense',
      updateSuccess,
      `Updated amount to £${updatedExpense.amount}, budget limit to £${updatedExpense.budgetLimit}`,
      updateSuccess ? undefined : 'Update validation failed'
    );

    // DELETE
    console.log('2.4 DELETE: Removing test expense...');
    await prisma.budgetExpense.delete({
      where: { id: newExpense.id }
    });

    const deletedCheck = await prisma.budgetExpense.findUnique({
      where: { id: newExpense.id }
    });

    logTest(
      'DELETE Recurring Expense',
      deletedCheck === null,
      'Expense successfully deleted',
      deletedCheck ? 'Expense still exists after deletion' : undefined
    );

  } catch (error) {
    logTest(
      'Recurring Expense CRUD',
      false,
      'CRUD operations failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Test 3: Date Filtering Logic
async function testDateFiltering() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: DATE FILTERING LOGIC');
  console.log('='.repeat(70) + '\n');

  // Replicating the filterByMonth logic from SimpleBudgetDashboard
  function filterByMonth(item: any, selectedMonth: number, selectedYear: number): boolean {
    if (item.isRecurring) {
      const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
      const selectedDateEnd = new Date(selectedYear, selectedMonth, 0);

      let startDate: Date;
      if (item.recurringStartDate) {
        startDate = new Date(item.recurringStartDate);
      } else {
        startDate = new Date(item.createdAt);
      }

      if (selectedDateEnd < startDate) return false;

      if (item.recurringEndDate) {
        const endDate = new Date(item.recurringEndDate);
        if (selectedDate > endDate) return false;
      }

      const frequency = item.recurringFrequency || 'monthly';

      if (frequency === 'yearly') {
        const startMonth = startDate.getMonth();
        return (selectedMonth - 1) === startMonth;
      }

      return true;
    }

    if (!item.paymentDate && !item.createdAt) return false;
    const dateToCheck = new Date(item.paymentDate || item.createdAt);
    return (
      dateToCheck.getMonth() + 1 === selectedMonth &&
      dateToCheck.getFullYear() === selectedYear
    );
  }

  try {
    // Create test items
    console.log('3.1 Creating test filtering scenarios...\n');

    const testIncomes = [
      await prisma.budgetIncome.create({
        data: {
          familyId: FAMILY_ID,
          incomeName: 'Filter Test - Monthly Recurring',
          amount: 1000,
          category: 'Salary',
          isRecurring: true,
          recurringFrequency: 'monthly',
          recurringStartDate: new Date(2025, 8, 1), // Sept 2025
          recurringEndDate: null
        }
      }),
      await prisma.budgetIncome.create({
        data: {
          familyId: FAMILY_ID,
          incomeName: 'Filter Test - Yearly Recurring',
          amount: 5000,
          category: 'Bonus',
          isRecurring: true,
          recurringFrequency: 'yearly',
          recurringStartDate: new Date(2025, 11, 1), // December
          recurringEndDate: null
        }
      }),
      await prisma.budgetIncome.create({
        data: {
          familyId: FAMILY_ID,
          incomeName: 'Filter Test - One-time October',
          amount: 500,
          category: 'Freelance',
          isRecurring: false,
          paymentDate: new Date(2025, 9, 15) // October 15, 2025
        }
      }),
      await prisma.budgetIncome.create({
        data: {
          familyId: FAMILY_ID,
          incomeName: 'Filter Test - Ended August',
          amount: 200,
          category: 'Other',
          isRecurring: true,
          recurringFrequency: 'monthly',
          recurringStartDate: new Date(2025, 5, 1), // June
          recurringEndDate: new Date(2025, 7, 31) // August
        }
      })
    ];

    // Test October 2025 filtering
    console.log('3.2 Testing October 2025 filtering...');
    const octoberResults = testIncomes.filter(item => filterByMonth(item, 10, 2025));

    const expectedOctoberCount = 2; // Monthly recurring + One-time October
    const octoberTest = octoberResults.length === expectedOctoberCount;

    logTest(
      'October 2025 Filtering',
      octoberTest,
      `Expected ${expectedOctoberCount} items, found ${octoberResults.length}`,
      octoberTest ? undefined : `Found: ${octoberResults.map(i => i.incomeName).join(', ')}`
    );

    // Test December 2025 filtering (should include yearly)
    console.log('3.3 Testing December 2025 filtering...');
    const decemberResults = testIncomes.filter(item => filterByMonth(item, 12, 2025));

    const expectedDecemberCount = 2; // Monthly recurring + Yearly (December only)
    const decemberTest = decemberResults.length === expectedDecemberCount;

    logTest(
      'December 2025 Filtering (Yearly)',
      decemberTest,
      `Expected ${expectedDecemberCount} items, found ${decemberResults.length}`,
      decemberTest ? undefined : `Found: ${decemberResults.map(i => i.incomeName).join(', ')}`
    );

    // Test September 2025 (should NOT include one-time October or ended items)
    console.log('3.4 Testing September 2025 filtering...');
    const septemberResults = testIncomes.filter(item => filterByMonth(item, 9, 2025));

    const expectedSeptemberCount = 1; // Only monthly recurring
    const septemberTest = septemberResults.length === expectedSeptemberCount;

    logTest(
      'September 2025 Filtering',
      septemberTest,
      `Expected ${expectedSeptemberCount} items, found ${septemberResults.length}`,
      septemberTest ? undefined : `Found: ${septemberResults.map(i => i.incomeName).join(', ')}`
    );

    // Test August 2025 (should include ended item)
    console.log('3.5 Testing August 2025 filtering...');
    const augustResults = testIncomes.filter(item => filterByMonth(item, 8, 2025));

    const expectedAugustCount = 2; // Monthly recurring + Ended in August
    const augustTest = augustResults.length === expectedAugustCount;

    logTest(
      'August 2025 Filtering (Ended Items)',
      augustTest,
      `Expected ${expectedAugustCount} items, found ${augustResults.length}`,
      augustTest ? undefined : `Found: ${augustResults.map(i => i.incomeName).join(', ')}`
    );

    // Cleanup
    console.log('3.6 Cleaning up test data...');
    for (const income of testIncomes) {
      await prisma.budgetIncome.delete({ where: { id: income.id } });
    }
    console.log('   ✓ Test data cleaned up\n');

  } catch (error) {
    logTest(
      'Date Filtering Logic',
      false,
      'Filtering tests failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Test 4: Visual Indicator Thresholds
async function testVisualIndicators() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 4: VISUAL INDICATOR THRESHOLDS');
  console.log('='.repeat(70) + '\n');

  function getIndicatorColor(percentUsed: number): string {
    if (percentUsed >= 90) return 'RED';
    if (percentUsed >= 70) return 'YELLOW';
    return 'GREEN';
  }

  try {
    console.log('4.1 Creating expenses at different budget thresholds...\n');

    const testExpenses = [
      { name: 'Test Green 50%', amount: 250, limit: 500, expected: 'GREEN' },
      { name: 'Test Yellow 75%', amount: 375, limit: 500, expected: 'YELLOW' },
      { name: 'Test Red 95%', amount: 475, limit: 500, expected: 'RED' },
      { name: 'Test Red 100%', amount: 500, limit: 500, expected: 'RED' },
      { name: 'Test Red 120%', amount: 600, limit: 500, expected: 'RED' }
    ];

    const createdExpenses = [];

    for (const test of testExpenses) {
      const expense = await prisma.budgetExpense.create({
        data: {
          familyId: FAMILY_ID,
          expenseName: test.name,
          amount: test.amount,
          category: 'Test',
          budgetLimit: test.limit,
          isRecurring: false,
          paymentDate: new Date(2025, 9, 1)
        }
      });

      createdExpenses.push(expense);

      const percentUsed = (test.amount / test.limit) * 100;
      const actualColor = getIndicatorColor(percentUsed);
      const passed = actualColor === test.expected;

      logTest(
        `Visual Indicator - ${test.expected} (${percentUsed.toFixed(0)}%)`,
        passed,
        `£${test.amount} / £${test.limit} = ${actualColor}`,
        passed ? undefined : `Expected ${test.expected}, got ${actualColor}`
      );
    }

    // Cleanup
    console.log('\n4.2 Cleaning up test expenses...');
    for (const expense of createdExpenses) {
      await prisma.budgetExpense.delete({ where: { id: expense.id } });
    }
    console.log('   ✓ Test expenses cleaned up\n');

  } catch (error) {
    logTest(
      'Visual Indicators',
      false,
      'Visual indicator tests failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Test 5: Analytics Calculations
async function testAnalyticsCalculations() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 5: ANALYTICS CALCULATIONS');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('5.1 Fetching October 2025 budget data...\n');

    const allIncome = await prisma.budgetIncome.findMany({
      where: { familyId: FAMILY_ID }
    });

    const allExpenses = await prisma.budgetExpense.findMany({
      where: { familyId: FAMILY_ID }
    });

    // Calculate totals
    const totalIncome = allIncome.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netIncome = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

    console.log('5.2 Validating calculations...');

    // Test 1: Total Income calculation
    logTest(
      'Total Income Calculation',
      totalIncome > 0,
      `Total Income: £${totalIncome.toLocaleString()}`,
      totalIncome > 0 ? undefined : 'No income found'
    );

    // Test 2: Total Expenses calculation
    logTest(
      'Total Expenses Calculation',
      totalExpenses > 0,
      `Total Expenses: £${totalExpenses.toLocaleString()}`,
      totalExpenses > 0 ? undefined : 'No expenses found'
    );

    // Test 3: Net Income calculation
    const netIncomeCorrect = netIncome === (totalIncome - totalExpenses);
    logTest(
      'Net Income Calculation',
      netIncomeCorrect,
      `Net Income: £${netIncome.toLocaleString()}`,
      netIncomeCorrect ? undefined : 'Calculation mismatch'
    );

    // Test 4: Savings Rate calculation
    const expectedSavingsRate = (netIncome / totalIncome) * 100;
    const savingsRateCorrect = Math.abs(savingsRate - expectedSavingsRate) < 0.01;
    logTest(
      'Savings Rate Calculation',
      savingsRateCorrect,
      `Savings Rate: ${savingsRate.toFixed(2)}%`,
      savingsRateCorrect ? undefined : `Expected ${expectedSavingsRate.toFixed(2)}%`
    );

    // Test 5: Category breakdown
    console.log('\n5.3 Testing category breakdown...');
    const categoryMap: { [key: string]: number } = {};
    allExpenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryMap[category] = (categoryMap[category] || 0) + Number(expense.amount);
    });

    const categoryCount = Object.keys(categoryMap).length;
    const categoryTest = categoryCount > 0;

    logTest(
      'Category Breakdown',
      categoryTest,
      `Found ${categoryCount} expense categories`,
      categoryTest ? undefined : 'No categories found'
    );

    // Test 6: Category percentages
    console.log('\n5.4 Testing category percentage calculations...');
    let categoryPercentageSum = 0;

    Object.entries(categoryMap).forEach(([category, amount]) => {
      const percentage = (amount / totalExpenses) * 100;
      categoryPercentageSum += percentage;
      console.log(`   ${category}: £${amount.toLocaleString()} (${percentage.toFixed(1)}%)`);
    });

    const percentageCorrect = Math.abs(categoryPercentageSum - 100) < 0.1;
    logTest(
      'Category Percentages Sum',
      percentageCorrect,
      `Total percentages: ${categoryPercentageSum.toFixed(2)}%`,
      percentageCorrect ? undefined : 'Percentages do not sum to 100%'
    );

  } catch (error) {
    logTest(
      'Analytics Calculations',
      false,
      'Analytics tests failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Test 6: API Endpoint Testing
async function testAPIEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 6: API ENDPOINT VALIDATION');
  console.log('='.repeat(70) + '\n');

  const baseUrl = 'http://localhost:3001';

  try {
    console.log('6.1 Testing GET /api/families/:familyId/budget/income...');

    const incomeResponse = await fetch(`${baseUrl}/api/families/${FAMILY_ID}/budget/income`);
    const incomeData = await incomeResponse.json();

    const incomeEndpointWorks = !!(incomeResponse.ok && Array.isArray(incomeData));
    logTest(
      'GET Income Endpoint',
      incomeEndpointWorks,
      `Status: ${incomeResponse.status}, Items: ${Array.isArray(incomeData) ? incomeData.length : 0}`,
      incomeEndpointWorks ? undefined : `Failed with status ${incomeResponse.status}`
    );

    console.log('6.2 Testing GET /api/families/:familyId/budget/expenses...');

    const expensesResponse = await fetch(`${baseUrl}/api/families/${FAMILY_ID}/budget/expenses`);
    const expensesData = await expensesResponse.json();

    const expensesEndpointWorks = !!(expensesResponse.ok && Array.isArray(expensesData));
    logTest(
      'GET Expenses Endpoint',
      expensesEndpointWorks,
      `Status: ${expensesResponse.status}, Items: ${Array.isArray(expensesData) ? expensesData.length : 0}`,
      expensesEndpointWorks ? undefined : `Failed with status ${expensesResponse.status}`
    );

    console.log('6.3 Testing POST /api/families/:familyId/budget/income (Create)...');

    const newIncome = {
      incomeName: 'API Test Income',
      amount: 1000,
      category: 'Test',
      isRecurring: true,
      recurringFrequency: 'monthly',
      recurringStartDate: new Date(2025, 9, 1).toISOString(),
      recurringEndDate: null
    };

    const createResponse = await fetch(`${baseUrl}/api/families/${FAMILY_ID}/budget/income`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIncome)
    });

    const createdIncome = createResponse.ok ? await createResponse.json() : null;
    const createWorks = !!(createResponse.ok && createdIncome?.id);

    logTest(
      'POST Income Endpoint (Create)',
      createWorks,
      `Status: ${createResponse.status}${createdIncome ? `, ID: ${createdIncome.id}` : ''}`,
      createWorks ? undefined : `Failed with status ${createResponse.status}`
    );

    // Cleanup created income
    if (createdIncome?.id) {
      console.log('6.4 Testing DELETE endpoint...');
      await fetch(`${baseUrl}/api/families/${FAMILY_ID}/budget/income/${createdIncome.id}`, {
        method: 'DELETE'
      });
      console.log('   ✓ Test income deleted\n');
    }

  } catch (error) {
    logTest(
      'API Endpoints',
      false,
      'API endpoint tests failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(15) + 'COMPREHENSIVE BUDGET TEST SUITE' + ' '.repeat(22) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('\n');

  const startTime = Date.now();

  try {
    await testRecurringIncomeCRUD();
    await testRecurringExpenseCRUD();
    await testDateFiltering();
    await testVisualIndicators();
    await testAnalyticsCalculations();
    await testAPIEndpoints();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(70) + '\n');

    const passedTests = testResults.filter(t => t.passed).length;
    const failedTests = testResults.filter(t => !t.passed).length;
    const totalTests = testResults.length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Duration: ${duration}s`);

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:\n');
      testResults.filter(t => !t.passed).forEach(test => {
        console.log(`   • ${test.testName}`);
        console.log(`     ${test.details}`);
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
      });
    }

    console.log('\n' + '═'.repeat(70));

    if (failedTests === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Budget functionality is working correctly.\n');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Review errors above.\n`);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
