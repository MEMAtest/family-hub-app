import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FAMILY_ID = 'cmg741w2h0000ljcb3f6fo19g';

async function createRealisticOctoberData() {
  console.log('\n' + '='.repeat(70));
  console.log('💰 CREATING REALISTIC OCTOBER 2025 BUDGET DATA');
  console.log('='.repeat(70));

  // Clear existing data
  console.log('\n🧹 Clearing existing data...');
  await prisma.budgetExpense.deleteMany({ where: { familyId: FAMILY_ID } });
  await prisma.budgetIncome.deleteMany({ where: { familyId: FAMILY_ID } });
  console.log('✅ Data cleared\n');

  const currentYear = 2025;
  const currentMonth = 9; // October (0-indexed)

  console.log('📥 CREATING INCOME...\n');

  // Income: £8,000
  const income = await prisma.budgetIncome.create({
    data: {
      familyId: FAMILY_ID,
      incomeName: 'Monthly Salary',
      amount: 8000,
      category: 'Salary',
      isRecurring: true,
      recurringFrequency: 'monthly',
      recurringStartDate: new Date(currentYear, currentMonth - 3, 1), // Started 3 months ago
      recurringEndDate: null,
      paymentDate: null
    }
  });
  console.log(`✅ ${income.incomeName}: £${income.amount.toLocaleString()}`);

  console.log('\n📤 CREATING EXPENSES...\n');

  // Expenses with your real figures
  const expenses = [
    {
      name: 'Mortgage',
      amount: 3700,
      category: 'Housing',
      budgetLimit: 3700, // At exact budget
      recurring: true
    },
    {
      name: 'Food & Groceries',
      amount: 670,
      category: 'Food & Dining',
      budgetLimit: 800, // Well within budget (84%)
      recurring: true
    },
    {
      name: 'Gym Membership',
      amount: 428,
      category: 'Healthcare',
      budgetLimit: 500, // 86% - getting close
      recurring: true
    },
    {
      name: 'Council Tax',
      amount: 150,
      category: 'Utilities',
      budgetLimit: 150, // At exact budget
      recurring: true
    },
    {
      name: 'Broadband',
      amount: 50,
      category: 'Utilities',
      budgetLimit: 60, // 83% - comfortable
      recurring: true
    },
    {
      name: 'Mobile Phone',
      amount: 60,
      category: 'Utilities',
      budgetLimit: 60, // At exact budget
      recurring: true
    }
  ];

  let totalExpenses = 0;

  for (const exp of expenses) {
    const expense = await prisma.budgetExpense.create({
      data: {
        familyId: FAMILY_ID,
        expenseName: exp.name,
        amount: exp.amount,
        category: exp.category,
        budgetLimit: exp.budgetLimit,
        isRecurring: exp.recurring,
        recurringFrequency: exp.recurring ? 'monthly' : null,
        recurringStartDate: exp.recurring ? new Date(currentYear, currentMonth - 2, 1) : null,
        recurringEndDate: null,
        paymentDate: !exp.recurring ? new Date(currentYear, currentMonth, 15) : null
      }
    });

    totalExpenses += exp.amount;

    const percentUsed = (exp.amount / exp.budgetLimit) * 100;
    let indicator = '🟢';
    if (percentUsed >= 90) indicator = '🔴';
    else if (percentUsed >= 70) indicator = '🟡';

    console.log(`${indicator} ${expense.expenseName}: £${expense.amount.toLocaleString()} / £${expense.budgetLimit?.toLocaleString() || 'N/A'} (${percentUsed.toFixed(0)}%)`);
  }

  // Add some additional realistic expenses to round out the budget
  console.log('\n📝 Adding additional typical expenses...\n');

  const additionalExpenses = [
    {
      name: 'Petrol/Transport',
      amount: 180,
      category: 'Transportation',
      budgetLimit: 250,
      recurring: true
    },
    {
      name: 'Car Insurance',
      amount: 95,
      category: 'Insurance',
      budgetLimit: 100,
      recurring: true
    },
    {
      name: 'Electricity & Gas',
      amount: 220,
      category: 'Utilities',
      budgetLimit: 250,
      recurring: true
    },
    {
      name: 'Water Bill',
      amount: 45,
      category: 'Utilities',
      budgetLimit: 50,
      recurring: true
    },
    {
      name: 'TV License',
      amount: 13.25,
      category: 'Entertainment',
      budgetLimit: 15,
      recurring: true
    },
    {
      name: 'Netflix & Subscriptions',
      amount: 35,
      category: 'Entertainment',
      budgetLimit: 50,
      recurring: true
    },
    {
      name: 'School Supplies',
      amount: 85,
      category: 'Education',
      budgetLimit: 100,
      recurring: false
    },
    {
      name: 'Clothes & Shoes',
      amount: 120,
      category: 'Clothing',
      budgetLimit: 150,
      recurring: false
    },
    {
      name: 'Eating Out',
      amount: 95,
      category: 'Food & Dining',
      budgetLimit: 150,
      recurring: false
    },
    {
      name: 'Kids Activities',
      amount: 140,
      category: 'Childcare',
      budgetLimit: 200,
      recurring: true
    }
  ];

  for (const exp of additionalExpenses) {
    const expense = await prisma.budgetExpense.create({
      data: {
        familyId: FAMILY_ID,
        expenseName: exp.name,
        amount: exp.amount,
        category: exp.category,
        budgetLimit: exp.budgetLimit,
        isRecurring: exp.recurring,
        recurringFrequency: exp.recurring ? 'monthly' : null,
        recurringStartDate: exp.recurring ? new Date(currentYear, currentMonth - 1, 1) : null,
        recurringEndDate: null,
        paymentDate: !exp.recurring ? new Date(currentYear, currentMonth, Math.floor(Math.random() * 28) + 1) : null
      }
    });

    totalExpenses += exp.amount;

    const percentUsed = (exp.amount / exp.budgetLimit) * 100;
    let indicator = '🟢';
    if (percentUsed >= 90) indicator = '🔴';
    else if (percentUsed >= 70) indicator = '🟡';

    console.log(`${indicator} ${expense.expenseName}: £${expense.amount.toLocaleString()} / £${expense.budgetLimit?.toLocaleString() || 'N/A'} (${percentUsed.toFixed(0)}%)`);
  }

  // Calculate summary
  const netIncome = 8000 - totalExpenses;
  const savingsRate = ((netIncome / 8000) * 100);

  console.log('\n' + '='.repeat(70));
  console.log('📊 OCTOBER 2025 BUDGET SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n💰 Total Income:       £${(8000).toLocaleString()}`);
  console.log(`💸 Total Expenses:     £${totalExpenses.toLocaleString()}`);
  console.log(`💵 Net Income:         £${netIncome.toLocaleString()}`);
  console.log(`📈 Savings Rate:       ${savingsRate.toFixed(1)}%`);
  console.log(`\n🎯 Remaining Budget:   £${netIncome.toLocaleString()} available for savings/emergency fund`);

  console.log('\n' + '='.repeat(70));
  console.log('✅ REALISTIC OCTOBER DATA CREATED!');
  console.log('='.repeat(70));
  console.log('\n💡 This data represents a typical UK family budget for October 2025');
  console.log('📊 Open http://localhost:3001 to see the analytics dashboard');
  console.log('📈 The dashboard will show:');
  console.log('   - Category breakdown (Housing, Food, Utilities, etc.)');
  console.log('   - Budget vs. actual spending');
  console.log('   - Savings rate and trends');
  console.log('   - Visual indicators for all expenses\n');

  // Create data for previous months for trend analysis
  console.log('📅 Creating previous months data for trend analysis...\n');

  // September data (slightly different amounts)
  await createPreviousMonthData(currentYear, currentMonth - 1, 7850, 5932);
  console.log('✅ September 2025 data created');

  // August data
  await createPreviousMonthData(currentYear, currentMonth - 2, 8000, 5756);
  console.log('✅ August 2025 data created');

  // July data
  await createPreviousMonthData(currentYear, currentMonth - 3, 8000, 5891);
  console.log('✅ July 2025 data created\n');

  console.log('🎉 All test data created successfully!');
  console.log('📊 You now have 4 months of data for trend analysis\n');
}

async function createPreviousMonthData(year: number, month: number, income: number, totalExpense: number) {
  // Create income
  await prisma.budgetIncome.create({
    data: {
      familyId: FAMILY_ID,
      incomeName: 'Monthly Salary',
      amount: income,
      category: 'Salary',
      isRecurring: true,
      recurringFrequency: 'monthly',
      recurringStartDate: new Date(year, month, 1),
      recurringEndDate: new Date(year, month, 28),
      paymentDate: null
    }
  });

  // Create representative expenses (distributed across categories)
  const expenseDistribution = [
    { name: 'Mortgage', amount: Math.round(totalExpense * 0.62), category: 'Housing' },
    { name: 'Food & Groceries', amount: Math.round(totalExpense * 0.11), category: 'Food & Dining' },
    { name: 'Utilities', amount: Math.round(totalExpense * 0.08), category: 'Utilities' },
    { name: 'Transport', amount: Math.round(totalExpense * 0.07), category: 'Transportation' },
    { name: 'Insurance', amount: Math.round(totalExpense * 0.05), category: 'Insurance' },
    { name: 'Entertainment', amount: Math.round(totalExpense * 0.04), category: 'Entertainment' },
    { name: 'Other', amount: Math.round(totalExpense * 0.03), category: 'Other' }
  ];

  for (const exp of expenseDistribution) {
    await prisma.budgetExpense.create({
      data: {
        familyId: FAMILY_ID,
        expenseName: exp.name,
        amount: exp.amount,
        category: exp.category,
        budgetLimit: exp.amount * 1.1, // 10% buffer
        isRecurring: true,
        recurringFrequency: 'monthly',
        recurringStartDate: new Date(year, month, 1),
        recurringEndDate: new Date(year, month, 28),
        paymentDate: null
      }
    });
  }
}

async function main() {
  try {
    await createRealisticOctoberData();
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
