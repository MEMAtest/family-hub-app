import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FAMILY_ID = 'cmg741w2h0000ljcb3f6fo19g';

// This replicates the filtering logic from SimpleBudgetDashboard
function filterByMonth(item: any, selectedMonth: number, selectedYear: number): boolean {
  // For recurring items, check if selected month falls within the recurring date range
  if (item.isRecurring) {
    const selectedDate = new Date(selectedYear, selectedMonth - 1, 1); // First day of selected month
    const selectedDateEnd = new Date(selectedYear, selectedMonth, 0); // Last day of selected month

    // Determine the start date for the recurring item
    let startDate: Date;
    if (item.recurringStartDate) {
      startDate = new Date(item.recurringStartDate);
    } else {
      // Fallback to createdAt if no recurringStartDate
      startDate = new Date(item.createdAt);
    }

    // Check if the selected month is before the start date
    if (selectedDateEnd < startDate) {
      return false; // Selected month is before the recurring period starts
    }

    // Determine the end date for the recurring item
    if (item.recurringEndDate) {
      const endDate = new Date(item.recurringEndDate);
      // Check if the selected month is after the end date
      if (selectedDate > endDate) {
        return false; // Selected month is after the recurring period ends
      }
    }

    // Apply frequency logic
    const frequency = item.recurringFrequency || 'monthly';

    if (frequency === 'weekly') {
      // For weekly, include if the selected month is within the range
      return true;
    } else if (frequency === 'monthly') {
      // For monthly, include if the selected month is within the range
      return true;
    } else if (frequency === 'yearly') {
      // For yearly, only include if the selected month matches the start month
      const startMonth = startDate.getMonth();
      return (selectedMonth - 1) === startMonth;
    }

    return true; // Default: include the item
  }

  // For one-time items, match the exact month/year using paymentDate
  if (!item.paymentDate && !item.createdAt) return false;
  const dateToCheck = new Date(item.paymentDate || item.createdAt);
  return (
    dateToCheck.getMonth() + 1 === selectedMonth &&
    dateToCheck.getFullYear() === selectedYear
  );
}

async function verifyFilteringForMonth(month: number, year: number, monthName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📅 VERIFYING FILTERING FOR: ${monthName} ${year}`);
  console.log('='.repeat(70));

  // Fetch all income and expenses
  const allIncome = await prisma.budgetIncome.findMany({
    where: { familyId: FAMILY_ID }
  });

  const allExpenses = await prisma.budgetExpense.findMany({
    where: { familyId: FAMILY_ID }
  });

  // Apply filtering
  const filteredIncome = allIncome.filter(item => filterByMonth(item, month, year));
  const filteredExpenses = allExpenses.filter(item => filterByMonth(item, month, year));

  // Calculate totals
  const totalIncome = filteredIncome.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netIncome = totalIncome - totalExpenses;

  console.log(`\n💰 INCOME (${filteredIncome.length} items, Total: £${totalIncome.toFixed(2)}):`);
  filteredIncome.forEach(item => {
    console.log(`   ✓ ${item.incomeName}: £${Number(item.amount).toFixed(2)}`);
    if (item.isRecurring) {
      console.log(`     → Recurring: ${item.recurringFrequency}, Start: ${item.recurringStartDate?.toLocaleDateString()}, End: ${item.recurringEndDate?.toLocaleDateString() || 'Indefinite'}`);
    } else {
      console.log(`     → One-time payment: ${item.paymentDate?.toLocaleDateString()}`);
    }
  });

  console.log(`\n💸 EXPENSES (${filteredExpenses.length} items, Total: £${totalExpenses.toFixed(2)}):`);
  filteredExpenses.forEach(item => {
    console.log(`   ✓ ${item.expenseName}: £${Number(item.amount).toFixed(2)}`);
    if (item.isRecurring) {
      console.log(`     → Recurring: ${item.recurringFrequency}, Start: ${item.recurringStartDate?.toLocaleDateString()}, End: ${item.recurringEndDate?.toLocaleDateString() || 'Indefinite'}`);
    } else {
      console.log(`     → One-time payment: ${item.paymentDate?.toLocaleDateString()}`);
    }
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Income:   £${totalIncome.toFixed(2)}`);
  console.log(`   Total Expenses: £${totalExpenses.toFixed(2)}`);
  console.log(`   Net Income:     £${netIncome.toFixed(2)}`);
  console.log(`   Savings Rate:   ${totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : 0}%`);

  return { filteredIncome, filteredExpenses, totalIncome, totalExpenses, netIncome };
}

async function validateScenarios(month: number, year: number, monthName: string, expectedResults: any) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 VALIDATION FOR: ${monthName} ${year}`);
  console.log('='.repeat(70));

  const allIncome = await prisma.budgetIncome.findMany({
    where: { familyId: FAMILY_ID }
  });

  const allExpenses = await prisma.budgetExpense.findMany({
    where: { familyId: FAMILY_ID }
  });

  const filteredIncome = allIncome.filter(item => filterByMonth(item, month, year));
  const filteredExpenses = allExpenses.filter(item => filterByMonth(item, month, year));

  let passedTests = 0;
  let failedTests = 0;

  console.log('\n📋 TEST RESULTS:\n');

  // Test each expected result
  for (const [itemName, shouldAppear] of Object.entries(expectedResults)) {
    const foundInIncome = filteredIncome.some(i => i.incomeName.includes(itemName));
    const foundInExpense = filteredExpenses.some(e => e.expenseName.includes(itemName));
    const actuallyAppears = foundInIncome || foundInExpense;

    const passed = actuallyAppears === shouldAppear;

    if (passed) {
      console.log(`   ✅ ${itemName}: ${shouldAppear ? 'Appears' : 'Does not appear'} (as expected)`);
      passedTests++;
    } else {
      console.log(`   ❌ ${itemName}: Expected ${shouldAppear ? 'to appear' : 'not to appear'}, but ${actuallyAppears ? 'appears' : 'does not appear'}`);
      failedTests++;
    }
  }

  console.log(`\n📊 Test Summary: ${passedTests} passed, ${failedTests} failed`);

  return { passedTests, failedTests };
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 FILTERING LOGIC VERIFICATION TEST');
    console.log('='.repeat(70));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based for our function

    // Test 1: Current Month (October 2025)
    await verifyFilteringForMonth(10, 2025, 'October');

    const octoberExpected = {
      'Monthly Salary': true,
      'Gym Membership': true,
      'Annual Bonus': false, // Not December
      'Weekly Groceries': true,
      'Future Income': false,
      'Old Subscription': false,
      'Car Repair': true,
      'Freelance': false
    };
    const oct = await validateScenarios(10, 2025, 'October', octoberExpected);

    // Test 2: Last Month (September 2025)
    await verifyFilteringForMonth(9, 2025, 'September');

    const septemberExpected = {
      'Monthly Salary': true,
      'Gym Membership': false, // Starts in October
      'Annual Bonus': false,
      'Weekly Groceries': true,
      'Future Income': false,
      'Old Subscription': false, // Ended in August
      'Car Repair': false, // One-time in October
      'Freelance': true
    };
    const sept = await validateScenarios(9, 2025, 'September', septemberExpected);

    // Test 3: Future Month (January 2026)
    await verifyFilteringForMonth(1, 2026, 'January');

    const januaryExpected = {
      'Monthly Salary': true,
      'Gym Membership': false, // Ends in December 2025
      'Annual Bonus': false, // Only December
      'Weekly Groceries': true,
      'Future Income': true, // Starts January 2026
      'Old Subscription': false,
      'Car Repair': false,
      'Freelance': false
    };
    const jan = await validateScenarios(1, 2026, 'January', januaryExpected);

    // Test 4: December (for yearly recurring)
    await verifyFilteringForMonth(12, 2025, 'December');

    const decemberExpected = {
      'Monthly Salary': true,
      'Gym Membership': true,
      'Annual Bonus': true, // YES! December
      'Weekly Groceries': true,
      'Future Income': false,
      'Old Subscription': false,
      'Car Repair': false,
      'Freelance': false
    };
    const dec = await validateScenarios(12, 2025, 'December', decemberExpected);

    // Test 5: August 2025 (when Old Subscription ended)
    await verifyFilteringForMonth(8, 2025, 'August');

    const augustExpected = {
      'Monthly Salary': true,
      'Gym Membership': false,
      'Annual Bonus': false,
      'Weekly Groceries': false, // Started September
      'Future Income': false,
      'Old Subscription': true, // Last month it was active
      'Car Repair': false,
      'Freelance': false
    };
    const aug = await validateScenarios(8, 2025, 'August', augustExpected);

    // Final Summary
    console.log('\n\n' + '='.repeat(70));
    console.log('🎯 FINAL TEST SUMMARY');
    console.log('='.repeat(70));

    const totalPassed = oct.passedTests + sept.passedTests + jan.passedTests + dec.passedTests + aug.passedTests;
    const totalFailed = oct.failedTests + sept.failedTests + jan.failedTests + dec.failedTests + aug.failedTests;
    const totalTests = totalPassed + totalFailed;

    console.log(`\n   Total Tests Run: ${totalTests}`);
    console.log(`   ✅ Passed: ${totalPassed}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

    if (totalFailed === 0) {
      console.log('\n   🎉 ALL TESTS PASSED! Filtering logic is working correctly!');
    } else {
      console.log('\n   ⚠️  Some tests failed. Review the output above for details.');
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
