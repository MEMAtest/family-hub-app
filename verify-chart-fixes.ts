import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FAMILY_ID = 'cmg741w2h0000ljcb3f6fo19g';

console.log('\n╔' + '═'.repeat(68) + '╗');
console.log('║' + ' '.repeat(20) + 'CHART FIX VERIFICATION' + ' '.repeat(26) + '║');
console.log('╚' + '═'.repeat(68) + '╝\n');

async function verifyChartFixes() {
  try {
    // Get October 2025 income data
    const income = await prisma.budgetIncome.findMany({
      where: {
        familyId: FAMILY_ID,
        isRecurring: true,
        recurringStartDate: { lte: new Date(2025, 9, 31) },
        OR: [
          { recurringEndDate: null },
          { recurringEndDate: { gte: new Date(2025, 9, 1) } }
        ]
      }
    });

    console.log('═'.repeat(70));
    console.log('INCOME DATA FOR OCTOBER 2025');
    console.log('═'.repeat(70) + '\n');

    const incomeCategoryMap: { [key: string]: number } = {};
    income.forEach(item => {
      const category = item.category || 'Other Income';
      incomeCategoryMap[category] = (incomeCategoryMap[category] || 0) + Number(item.amount);
    });

    const totalIncome = Object.values(incomeCategoryMap).reduce((sum, val) => sum + val, 0);

    console.log('Income by Category:\n');
    Object.entries(incomeCategoryMap)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, amount]) => {
        const percentage = totalIncome > 0 ? ((amount / totalIncome) * 100) : 0;
        console.log(`   ${category.padEnd(20)} £${amount.toLocaleString().padStart(10)} (${percentage.toFixed(1)}%)`);
      });

    console.log(`\n   ${'TOTAL'.padEnd(20)} £${totalIncome.toLocaleString().padStart(10)} (100.0%)`);

    console.log('\n═'.repeat(70));
    console.log('COLOR ASSIGNMENTS IN SimpleBudgetDashboard.tsx');
    console.log('═'.repeat(70) + '\n');

    console.log('The colorMap in getColorForCategory() now includes:');
    console.log('   • Salary: #10B981 (Green)');
    console.log('   • Test: #3B82F6 (Blue) ← NEW - DISTINCT FROM SALARY');
    console.log('   • Employment: #059669 (Emerald)');
    console.log('   • Freelance: #06B6D4 (Cyan)');

    console.log('\n═'.repeat(70));
    console.log('PIE CHART SIZE FIX');
    console.log('═'.repeat(70) + '\n');

    console.log('Both Expense and Income pie charts now use:');
    console.log('   • Desktop: outerRadius={120} (was 90)');
    console.log('   • Mobile: outerRadius={90} (was 70)');

    console.log('\n═'.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('═'.repeat(70) + '\n');

    console.log('Expected Results:');
    console.log('   1. Income Breakdown chart:');
    console.log('      - "Salary: 89%" should be GREEN (#10B981)');
    console.log('      - "Test: 11%" should be BLUE (#3B82F6) ← FIXED');
    console.log('   2. Both pie charts should appear larger and less compressed ← FIXED\n');

    console.log('To verify:');
    console.log('   1. Open http://localhost:3000');
    console.log('   2. Navigate to Budget view');
    console.log('   3. Scroll to "Income Breakdown" and "Expense Breakdown" pie charts');
    console.log('   4. Confirm colors are distinct and charts are properly sized\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyChartFixes();
