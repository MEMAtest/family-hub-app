import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FAMILY_ID = 'cmg741w2h0000ljcb3f6fo19g';

async function debugBudgetData() {
  console.log('\n=== DEBUG: Budget Data Query ===\n');

  // Check what month/year we're querying
  const now = new Date();
  const targetMonth = 10; // October
  const targetYear = 2025;

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  console.log('Query Parameters:');
  console.log(`  Family ID: ${FAMILY_ID}`);
  console.log(`  Month: ${targetMonth} (October)`);
  console.log(`  Year: ${targetYear}`);
  console.log(`  Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

  // Fetch ALL income for this family
  const allIncome = await prisma.budgetIncome.findMany({
    where: { familyId: FAMILY_ID },
    select: {
      id: true,
      incomeName: true,
      amount: true,
      isRecurring: true,
      paymentDate: true,
      recurringStartDate: true,
    }
  });

  console.log(`Total Income Records in DB: ${allIncome.length}`);
  allIncome.forEach(inc => {
    console.log(`  - ${inc.incomeName}: £${inc.amount}, recurring: ${inc.isRecurring}, paymentDate: ${inc.paymentDate?.toISOString()}, recurringStart: ${inc.recurringStartDate?.toISOString()}`);
  });

  // Fetch income with the SAME query as the API
  const income = await prisma.budgetIncome.findMany({
    where: {
      familyId: FAMILY_ID,
      OR: [
        {
          isRecurring: true,
          recurringStartDate: { lte: endDate }
        },
        {
          isRecurring: false,
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      ]
    }
  });

  console.log(`\nIncome Matched by API Query: ${income.length}`);
  income.forEach(inc => {
    console.log(`  - ${inc.incomeName}: £${inc.amount}`);
  });

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  console.log(`\nTotal Income from API Query: £${totalIncome.toLocaleString()}`);

  // Same for expenses
  const allExpenses = await prisma.budgetExpense.findMany({
    where: { familyId: FAMILY_ID },
    select: {
      id: true,
      expenseName: true,
      amount: true,
      isRecurring: true,
      paymentDate: true,
      recurringStartDate: true,
    }
  });

  console.log(`\n\nTotal Expense Records in DB: ${allExpenses.length}`);
  allExpenses.forEach(exp => {
    console.log(`  - ${exp.expenseName}: £${exp.amount}, recurring: ${exp.isRecurring}, paymentDate: ${exp.paymentDate?.toISOString()}, recurringStart: ${exp.recurringStartDate?.toISOString()}`);
  });

  const expenses = await prisma.budgetExpense.findMany({
    where: {
      familyId: FAMILY_ID,
      OR: [
        {
          isRecurring: true,
          recurringStartDate: { lte: endDate }
        },
        {
          isRecurring: false,
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      ]
    }
  });

  console.log(`\nExpenses Matched by API Query: ${expenses.length}`);
  expenses.forEach(exp => {
    console.log(`  - ${exp.expenseName}: £${exp.amount}`);
  });

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  console.log(`\nTotal Expenses from API Query: £${totalExpenses.toLocaleString()}`);

  console.log('\n=== END DEBUG ===\n');

  await prisma.$disconnect();
}

debugBudgetData().catch(console.error);
