import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  const [
    calendarEvents,
    shoppingLists,
    shoppingItems,
    contractors,
    contractorAppointments,
    meals,
    goals,
    milestones,
  ] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { title: { startsWith: 'E2E-' } },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.shoppingList.findMany({
      where: { listName: { startsWith: 'E2E-' } },
      select: { id: true, listName: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.shoppingItem.findMany({
      where: { itemName: { startsWith: 'E2E-' } },
      select: { id: true, itemName: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.contractor.findMany({
      where: { name: { startsWith: 'E2E-' } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.contractorAppointment.findMany({
      where: { purpose: { startsWith: 'E2E-' } },
      select: { id: true, purpose: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.mealPlan.findMany({
      where: { mealName: { startsWith: 'E2E-' } },
      select: { id: true, mealName: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.familyGoal.findMany({
      where: { goalTitle: { startsWith: 'E2E-' } },
      select: { id: true, goalTitle: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.familyMilestone.findMany({
      where: { title: { startsWith: 'E2E-' } },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const groups = {
    calendarEvents,
    shoppingLists,
    shoppingItems,
    contractors,
    contractorAppointments,
    meals,
    goals,
    milestones,
  };
  const total = Object.values(groups).reduce((sum, records) => sum + records.length, 0);

  console.log(JSON.stringify({ mode: 'dry-run', total, groups }, null, 2));
};

main()
  .catch((error) => {
    console.error('E2E residue audit failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
