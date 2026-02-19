#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

import {
  GET as eventsGet,
  POST as eventsPost,
  PUT as eventsPut,
  DELETE as eventsDelete,
} from '../../src/app/api/families/[familyId]/events/route';
import {
  GET as expensesGet,
  POST as expensesPost,
  PUT as expensesPut,
  DELETE as expensesDelete,
} from '../../src/app/api/families/[familyId]/budget/expenses/route';
import {
  GET as incomeGet,
  POST as incomePost,
  PUT as incomePut,
  DELETE as incomeDelete,
} from '../../src/app/api/families/[familyId]/budget/income/route';
import {
  GET as categoriesGet,
  POST as categoriesPost,
} from '../../src/app/api/families/[familyId]/budget/categories/route';
import {
  PUT as categoryPut,
  DELETE as categoryDelete,
} from '../../src/app/api/families/[familyId]/budget/categories/[categoryId]/route';
import {
  GET as savingsGet,
  POST as savingsPost,
} from '../../src/app/api/families/[familyId]/budget/savings-goals/route';
import {
  PUT as savingsPut,
  DELETE as savingsDelete,
} from '../../src/app/api/families/[familyId]/budget/savings-goals/[goalId]/route';
import {
  GET as mealsGet,
  POST as mealsPost,
} from '../../src/app/api/families/[familyId]/meals/route';
import {
  PUT as mealPut,
  DELETE as mealDelete,
} from '../../src/app/api/families/[familyId]/meals/[mealId]/route';
import {
  GET as shoppingListsGet,
  POST as shoppingListsPost,
} from '../../src/app/api/families/[familyId]/shopping-lists/route';
import {
  PUT as shoppingListPut,
  DELETE as shoppingListDelete,
} from '../../src/app/api/families/[familyId]/shopping-lists/[listId]/route';
import {
  GET as shoppingItemsGet,
  POST as shoppingItemsPost,
} from '../../src/app/api/families/[familyId]/shopping-lists/[listId]/items/route';
import {
  PUT as shoppingItemPut,
  DELETE as shoppingItemDelete,
} from '../../src/app/api/shopping-items/[itemId]/route';
import {
  GET as goalsGet,
  POST as goalsPost,
} from '../../src/app/api/families/[familyId]/goals/route';
import {
  PUT as goalPut,
  DELETE as goalDelete,
} from '../../src/app/api/families/[familyId]/goals/[goalId]/route';
import {
  GET as achievementsGet,
  POST as achievementsPost,
} from '../../src/app/api/families/[familyId]/achievements/route';
import {
  DELETE as achievementDelete,
} from '../../src/app/api/families/[familyId]/achievements/[achievementId]/route';
import {
  GET as fitnessGet,
  POST as fitnessPost,
} from '../../src/app/api/families/[familyId]/fitness/route';
import {
  PUT as fitnessPut,
  DELETE as fitnessDelete,
} from '../../src/app/api/families/[familyId]/fitness/[activityId]/route';
import {
  GET as contractorsGet,
  POST as contractorsPost,
} from '../../src/app/api/families/[familyId]/contractors/route';
import {
  PUT as contractorPut,
  DELETE as contractorDelete,
} from '../../src/app/api/families/[familyId]/contractors/[contractorId]/route';
import {
  GET as appointmentsGet,
  POST as appointmentsPost,
} from '../../src/app/api/families/[familyId]/contractors/appointments/route';
import {
  PUT as appointmentPut,
  DELETE as appointmentDelete,
} from '../../src/app/api/families/[familyId]/contractors/appointments/[appointmentId]/route';
import {
  GET as notificationsGet,
  POST as notificationsPost,
} from '../../src/app/api/families/[familyId]/notifications/route';
import {
  PATCH as notificationPatch,
  DELETE as notificationDelete,
} from '../../src/app/api/families/[familyId]/notifications/[notificationId]/route';
import { POST as notificationsReadAllPost } from '../../src/app/api/families/[familyId]/notifications/read-all/route';
import {
  GET as membersGet,
  POST as membersPost,
} from '../../src/app/api/families/[familyId]/members/route';
import {
  PATCH as memberPatch,
  DELETE as memberDelete,
} from '../../src/app/api/families/[familyId]/members/[memberId]/route';
import {
  GET as milestonesGet,
  POST as milestonesPost,
} from '../../src/app/api/families/[familyId]/milestones/route';
import {
  PATCH as milestonePatch,
  DELETE as milestoneDelete,
} from '../../src/app/api/families/[familyId]/milestones/[milestoneId]/route';

type AnyJson = Record<string, any> | any[] | null;
type HandlerContext = { params: Promise<Record<string, string>> };
type Handler = (request: NextRequest, context: HandlerContext) => Promise<Response>;

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const fallbackDatabaseUrl =
  'postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = fallbackDatabaseUrl;
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const results: CheckResult[] = [];

const createdIds = {
  calendarEvents: [] as string[],
  budgetExpenses: [] as string[],
  budgetIncome: [] as string[],
  budgetCategories: [] as string[],
  savingsGoals: [] as string[],
  mealPlans: [] as string[],
  shoppingLists: [] as string[],
  shoppingItems: [] as string[],
  familyGoals: [] as string[],
  achievements: [] as string[],
  fitnessTracking: [] as string[],
  contractors: [] as string[],
  contractorAppointments: [] as string[],
  notifications: [] as string[],
  familyMembers: [] as string[],
  familyMilestones: [] as string[],
};

let currentFamilyId = '';
let currentMemberId = '';
const runTag = `PERSIST-AUDIT-${Date.now()}`;

const familyContext = (params: Record<string, string> = {}): HandlerContext => ({
  params: Promise.resolve({ familyId: currentFamilyId, ...params }),
});

const authContext = (params: Record<string, string> = {}): HandlerContext => ({
  params: Promise.resolve(params),
});

const jsonRequest = (url: string, method: string, body?: Record<string, any>): NextRequest => {
  if (body === undefined) {
    return new NextRequest(url, { method });
  }

  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

const safeJson = async (response: Response): Promise<AnyJson> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const ensure = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const call = async (
  handler: Handler,
  request: NextRequest,
  context: HandlerContext,
  actionLabel: string
): Promise<AnyJson> => {
  const response = await handler(request, context);
  const payload = await safeJson(response);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${actionLabel} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
};

const runCheck = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    results.push({ name, status: 'PASS', details: 'CRUD persisted and reloaded correctly' });
    console.log(`✅ ${name} — PASS`);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', details });
    console.log(`❌ ${name} — FAIL: ${details}`);
  }
};

const uniq = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

const cleanupCreatedRows = async () => {
  await prisma.contractorAppointment.deleteMany({ where: { id: { in: uniq(createdIds.contractorAppointments) } } });
  await prisma.contractor.deleteMany({ where: { id: { in: uniq(createdIds.contractors) } } });
  await prisma.shoppingItem.deleteMany({ where: { id: { in: uniq(createdIds.shoppingItems) } } });
  await prisma.shoppingList.deleteMany({ where: { id: { in: uniq(createdIds.shoppingLists) } } });
  await prisma.notification.deleteMany({ where: { id: { in: uniq(createdIds.notifications) } } });
  await prisma.fitnessTracking.deleteMany({ where: { id: { in: uniq(createdIds.fitnessTracking) } } });
  await prisma.achievement.deleteMany({ where: { id: { in: uniq(createdIds.achievements) } } });
  await prisma.familyGoal.deleteMany({ where: { id: { in: uniq(createdIds.familyGoals) } } });
  await prisma.mealPlan.deleteMany({ where: { id: { in: uniq(createdIds.mealPlans) } } });
  await prisma.savingsGoal.deleteMany({ where: { id: { in: uniq(createdIds.savingsGoals) } } });
  await prisma.budgetCategory.deleteMany({ where: { id: { in: uniq(createdIds.budgetCategories) } } });
  await prisma.budgetExpense.deleteMany({ where: { id: { in: uniq(createdIds.budgetExpenses) } } });
  await prisma.budgetIncome.deleteMany({ where: { id: { in: uniq(createdIds.budgetIncome) } } });
  await prisma.calendarEvent.deleteMany({ where: { id: { in: uniq(createdIds.calendarEvents) } } });
  await prisma.familyMilestone.deleteMany({ where: { id: { in: uniq(createdIds.familyMilestones) } } });
  await prisma.familyMember.deleteMany({ where: { id: { in: uniq(createdIds.familyMembers) } } });
};

const cleanupByTag = async () => {
  if (!currentFamilyId) return;

  await prisma.contractorAppointment.deleteMany({
    where: { familyId: currentFamilyId, purpose: { startsWith: runTag } },
  });
  await prisma.contractor.deleteMany({
    where: { familyId: currentFamilyId, name: { startsWith: runTag } },
  });
  await prisma.shoppingItem.deleteMany({
    where: {
      list: { familyId: currentFamilyId },
      itemName: { startsWith: runTag },
    },
  });
  await prisma.shoppingList.deleteMany({
    where: { familyId: currentFamilyId, listName: { startsWith: runTag } },
  });
  await prisma.notification.deleteMany({
    where: { familyId: currentFamilyId, title: { startsWith: runTag } },
  });
  await prisma.fitnessTracking.deleteMany({
    where: {
      person: { familyId: currentFamilyId },
      workoutName: { startsWith: runTag },
    },
  });
  await prisma.achievement.deleteMany({
    where: { familyId: currentFamilyId, achievementTitle: { startsWith: runTag } },
  });
  await prisma.familyGoal.deleteMany({
    where: { familyId: currentFamilyId, goalTitle: { startsWith: runTag } },
  });
  await prisma.mealPlan.deleteMany({
    where: { familyId: currentFamilyId, mealName: { startsWith: runTag } },
  });
  await prisma.savingsGoal.deleteMany({
    where: { familyId: currentFamilyId, goalName: { startsWith: runTag } },
  });
  await prisma.budgetCategory.deleteMany({
    where: { familyId: currentFamilyId, categoryName: { startsWith: runTag } },
  });
  await prisma.budgetExpense.deleteMany({
    where: { familyId: currentFamilyId, expenseName: { startsWith: runTag } },
  });
  await prisma.budgetIncome.deleteMany({
    where: { familyId: currentFamilyId, incomeName: { startsWith: runTag } },
  });
  await prisma.calendarEvent.deleteMany({
    where: { familyId: currentFamilyId, title: { startsWith: runTag } },
  });
  await prisma.familyMilestone.deleteMany({
    where: { familyId: currentFamilyId, title: { startsWith: runTag } },
  });
  await prisma.familyMember.deleteMany({
    where: { familyId: currentFamilyId, name: { startsWith: runTag } },
  });
};

const setupFamilyContext = async () => {
  const family = await prisma.family.findFirst({
    include: { members: true },
  });

  if (!family) {
    throw new Error('No family found in database. Cannot run persistence audit.');
  }

  currentFamilyId = family.id;

  if (family.members.length > 0) {
    currentMemberId = family.members[0].id;
    return;
  }

  const seededMember = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      name: `${runTag} Seed Member`,
      role: 'Parent',
      ageGroup: 'Adult',
      color: '#2563eb',
      icon: '👤',
    },
  });

  currentMemberId = seededMember.id;
  createdIds.familyMembers.push(seededMember.id);
};

const runPersistenceChecks = async () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nextDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  await runCheck('Calendar events', async () => {
    const created = await call(
      eventsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/events`, 'POST', {
        personId: currentMemberId,
        title: `${runTag} Event`,
        eventDateTime: now.toISOString(),
        durationMinutes: 30,
        eventType: 'family',
      }),
      familyContext(),
      'Create event'
    );

    const eventId = created?.id as string;
    ensure(eventId, 'Event creation returned no id');
    createdIds.calendarEvents.push(eventId);

    const list = await call(
      eventsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/events`, 'GET'),
      familyContext(),
      'List events'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === eventId), 'Created event missing from GET list');

    const updated = await call(
      eventsPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/events`, 'PUT', {
        id: eventId,
        title: `${runTag} Event Updated`,
        date: today,
        time: '10:15',
        type: 'family',
        duration: 45,
      }),
      familyContext(),
      'Update event'
    );
    ensure(updated?.title === `${runTag} Event Updated`, 'Event update did not persist');

    await call(
      eventsDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/events?id=${eventId}`, 'DELETE'),
      familyContext(),
      'Delete event'
    );
    const deleted = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    ensure(!deleted, 'Event still exists after delete');
  });

  await runCheck('Budget expenses', async () => {
    const created = await call(
      expensesPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/expenses`, 'POST', {
        personId: currentMemberId,
        expenseName: `${runTag} Expense`,
        amount: 42.5,
        category: 'Groceries',
      }),
      familyContext(),
      'Create expense'
    );
    const expenseId = created?.id as string;
    ensure(expenseId, 'Expense creation returned no id');
    createdIds.budgetExpenses.push(expenseId);

    const list = await call(
      expensesGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/expenses`, 'GET'),
      familyContext(),
      'List expenses'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === expenseId), 'Created expense missing from GET list');

    const updated = await call(
      expensesPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/expenses`, 'PUT', {
        id: expenseId,
        expenseName: `${runTag} Expense Updated`,
        amount: 55.25,
      }),
      familyContext(),
      'Update expense'
    );
    ensure(updated?.expenseName === `${runTag} Expense Updated`, 'Expense update did not persist');

    await call(
      expensesDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/expenses?id=${expenseId}`, 'DELETE'),
      familyContext(),
      'Delete expense'
    );
    const deleted = await prisma.budgetExpense.findUnique({ where: { id: expenseId } });
    ensure(!deleted, 'Expense still exists after delete');
  });

  await runCheck('Budget income', async () => {
    const created = await call(
      incomePost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/income`, 'POST', {
        personId: currentMemberId,
        incomeName: `${runTag} Income`,
        amount: 3500,
        category: 'Salary',
      }),
      familyContext(),
      'Create income'
    );
    const incomeId = created?.id as string;
    ensure(incomeId, 'Income creation returned no id');
    createdIds.budgetIncome.push(incomeId);

    const list = await call(
      incomeGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/income`, 'GET'),
      familyContext(),
      'List income'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === incomeId), 'Created income missing from GET list');

    const updated = await call(
      incomePut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/income`, 'PUT', {
        id: incomeId,
        incomeName: `${runTag} Income Updated`,
        amount: 3600,
      }),
      familyContext(),
      'Update income'
    );
    ensure(updated?.incomeName === `${runTag} Income Updated`, 'Income update did not persist');

    await call(
      incomeDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/income?id=${incomeId}`, 'DELETE'),
      familyContext(),
      'Delete income'
    );
    const deleted = await prisma.budgetIncome.findUnique({ where: { id: incomeId } });
    ensure(!deleted, 'Income still exists after delete');
  });

  await runCheck('Budget categories', async () => {
    const created = await call(
      categoriesPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/categories`, 'POST', {
        categoryName: `${runTag} Category`,
        categoryType: 'expense',
        budgetLimit: 500,
      }),
      familyContext(),
      'Create category'
    );
    const categoryId = created?.id as string;
    ensure(categoryId, 'Category creation returned no id');
    createdIds.budgetCategories.push(categoryId);

    const list = await call(
      categoriesGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/categories?type=expense&includeInactive=true`, 'GET'),
      familyContext(),
      'List categories'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === categoryId), 'Created category missing from GET list');

    const updated = await call(
      categoryPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/categories/${categoryId}`, 'PUT', {
        budgetLimit: 650,
        colorCode: '#123456',
      }),
      familyContext({ categoryId }),
      'Update category'
    );
    ensure(Number(updated?.budgetLimit) === 650, 'Category update did not persist');

    await call(
      categoryDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/categories/${categoryId}`, 'DELETE'),
      familyContext({ categoryId }),
      'Delete category'
    );
    const deleted = await prisma.budgetCategory.findUnique({ where: { id: categoryId } });
    ensure(!deleted, 'Category still exists after delete');
  });

  await runCheck('Savings goals', async () => {
    const created = await call(
      savingsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/savings-goals`, 'POST', {
        goalName: `${runTag} Savings Goal`,
        targetAmount: 2000,
      }),
      familyContext(),
      'Create savings goal'
    );
    const goalId = created?.id as string;
    ensure(goalId, 'Savings goal creation returned no id');
    createdIds.savingsGoals.push(goalId);

    const list = await call(
      savingsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/savings-goals?includeInactive=true`, 'GET'),
      familyContext(),
      'List savings goals'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === goalId), 'Created savings goal missing from GET list');

    const updated = await call(
      savingsPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/savings-goals/${goalId}`, 'PUT', {
        currentAmount: 150,
      }),
      familyContext({ goalId }),
      'Update savings goal'
    );
    ensure(Number(updated?.currentAmount) === 150, 'Savings goal update did not persist');

    await call(
      savingsDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/budget/savings-goals/${goalId}`, 'DELETE'),
      familyContext({ goalId }),
      'Delete savings goal'
    );
    const deleted = await prisma.savingsGoal.findUnique({ where: { id: goalId } });
    ensure(!deleted, 'Savings goal still exists after delete');
  });

  await runCheck('Meals', async () => {
    const created = await call(
      mealsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/meals`, 'POST', {
        mealDate: now.toISOString(),
        mealName: `${runTag} Meal`,
      }),
      familyContext(),
      'Create meal'
    );
    const mealId = created?.id as string;
    ensure(mealId, 'Meal creation returned no id');
    createdIds.mealPlans.push(mealId);

    const list = await call(
      mealsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/meals?startDate=${today}&endDate=${nextDate}`, 'GET'),
      familyContext(),
      'List meals'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === mealId), 'Created meal missing from GET list');

    const updated = await call(
      mealPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/meals/${mealId}`, 'PUT', {
        mealName: `${runTag} Meal Updated`,
      }),
      familyContext({ mealId }),
      'Update meal'
    );
    ensure(updated?.mealName === `${runTag} Meal Updated`, 'Meal update did not persist');

    await call(
      mealDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/meals/${mealId}`, 'DELETE'),
      familyContext({ mealId }),
      'Delete meal'
    );
    const deleted = await prisma.mealPlan.findUnique({ where: { id: mealId } });
    ensure(!deleted, 'Meal still exists after delete');
  });

  await runCheck('Shopping lists and items', async () => {
    const createdList = await call(
      shoppingListsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/shopping-lists`, 'POST', {
        listName: `${runTag} Shopping List`,
      }),
      familyContext(),
      'Create shopping list'
    );
    const listId = createdList?.id as string;
    ensure(listId, 'Shopping list creation returned no id');
    createdIds.shoppingLists.push(listId);

    const listCollection = await call(
      shoppingListsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/shopping-lists`, 'GET'),
      familyContext(),
      'List shopping lists'
    );
    ensure(Array.isArray(listCollection) && listCollection.some((item: any) => item.id === listId), 'Created shopping list missing from GET list');

    const updatedList = await call(
      shoppingListPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/shopping-lists/${listId}`, 'PUT', {
        category: 'Groceries',
      }),
      familyContext({ listId }),
      'Update shopping list'
    );
    ensure(updatedList?.category === 'Groceries', 'Shopping list update did not persist');

    const createdItem = await call(
      shoppingItemsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/shopping-lists/${listId}/items`, 'POST', {
        itemName: `${runTag} Shopping Item`,
        estimatedPrice: 12.5,
      }),
      familyContext({ listId }),
      'Create shopping item'
    );
    const itemId = createdItem?.id as string;
    ensure(itemId, 'Shopping item creation returned no id');
    createdIds.shoppingItems.push(itemId);

    const itemCollection = await call(
      shoppingItemsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/shopping-lists/${listId}/items`, 'GET'),
      familyContext({ listId }),
      'List shopping items'
    );
    ensure(Array.isArray(itemCollection) && itemCollection.some((item: any) => item.id === itemId), 'Created shopping item missing from GET list');

    const updatedItem = await call(
      shoppingItemPut as Handler,
      jsonRequest(`http://localhost/api/shopping-items/${itemId}`, 'PUT', {
        itemName: `${runTag} Shopping Item Updated`,
        isCompleted: true,
      }),
      authContext({ itemId }),
      'Update shopping item'
    );
    ensure(updatedItem?.itemName === `${runTag} Shopping Item Updated`, 'Shopping item update did not persist');

    await call(
      shoppingItemDelete as Handler,
      jsonRequest(`http://localhost/api/shopping-items/${itemId}`, 'DELETE'),
      authContext({ itemId }),
      'Delete shopping item'
    );
    const deletedItem = await prisma.shoppingItem.findUnique({ where: { id: itemId } });
    ensure(!deletedItem, 'Shopping item still exists after delete');

    await call(
      shoppingListDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/shopping-lists/${listId}`, 'DELETE'),
      familyContext({ listId }),
      'Delete shopping list'
    );
    const deletedList = await prisma.shoppingList.findUnique({ where: { id: listId } });
    ensure(!deletedList, 'Shopping list still exists after delete');
  });

  await runCheck('Goals', async () => {
    const created = await call(
      goalsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/goals`, 'POST', {
        title: `${runTag} Goal`,
        type: 'family',
        targetValue: '100',
      }),
      familyContext(),
      'Create goal'
    );
    const goalId = created?.id as string;
    ensure(goalId, 'Goal creation returned no id');
    createdIds.familyGoals.push(goalId);

    const list = await call(
      goalsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/goals`, 'GET'),
      familyContext(),
      'List goals'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === goalId), 'Created goal missing from GET list');

    const updated = await call(
      goalPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/goals/${goalId}`, 'PUT', {
        title: `${runTag} Goal Updated`,
        currentProgress: 25,
      }),
      familyContext({ goalId }),
      'Update goal'
    );
    ensure(updated?.goalTitle === `${runTag} Goal Updated`, 'Goal update did not persist');

    await call(
      goalDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/goals/${goalId}`, 'DELETE'),
      familyContext({ goalId }),
      'Delete goal'
    );
    const deleted = await prisma.familyGoal.findUnique({ where: { id: goalId } });
    ensure(!deleted, 'Goal still exists after delete');
  });

  await runCheck('Achievements', async () => {
    const created = await call(
      achievementsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/achievements`, 'POST', {
        personId: currentMemberId,
        title: `${runTag} Achievement`,
        category: 'fitness',
      }),
      familyContext(),
      'Create achievement'
    );
    const achievementId = created?.id as string;
    ensure(achievementId, 'Achievement creation returned no id');
    createdIds.achievements.push(achievementId);

    const list = await call(
      achievementsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/achievements?personId=${currentMemberId}`, 'GET'),
      familyContext(),
      'List achievements'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === achievementId), 'Created achievement missing from GET list');

    await call(
      achievementDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/achievements/${achievementId}`, 'DELETE'),
      familyContext({ achievementId }),
      'Delete achievement'
    );
    const deleted = await prisma.achievement.findUnique({ where: { id: achievementId } });
    ensure(!deleted, 'Achievement still exists after delete');
  });

  await runCheck('Fitness activities', async () => {
    const created = await call(
      fitnessPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/fitness`, 'POST', {
        personId: currentMemberId,
        activityType: 'gym',
        durationMinutes: 30,
        intensityLevel: 'moderate',
        activityDate: now.toISOString(),
        workoutName: `${runTag} Workout`,
      }),
      familyContext(),
      'Create fitness activity'
    );
    const activityId = created?.id as string;
    ensure(activityId, 'Fitness creation returned no id');
    createdIds.fitnessTracking.push(activityId);

    const listPayload = await call(
      fitnessGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/fitness?personId=${currentMemberId}&limit=25`, 'GET'),
      familyContext(),
      'List fitness activities'
    );
    const list = (listPayload as any)?.activities;
    ensure(Array.isArray(list) && list.some((item: any) => item.id === activityId), 'Created fitness activity missing from GET list');

    const updated = await call(
      fitnessPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/fitness/${activityId}`, 'PUT', {
        workoutName: `${runTag} Workout Updated`,
        durationMinutes: 36,
      }),
      familyContext({ activityId }),
      'Update fitness activity'
    );
    ensure(updated?.workoutName === `${runTag} Workout Updated`, 'Fitness update did not persist');

    await call(
      fitnessDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/fitness/${activityId}`, 'DELETE'),
      familyContext({ activityId }),
      'Delete fitness activity'
    );
    const deleted = await prisma.fitnessTracking.findUnique({ where: { id: activityId } });
    ensure(!deleted, 'Fitness activity still exists after delete');
  });

  await runCheck('Contractors and appointments', async () => {
    const createdContractor = await call(
      contractorsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors`, 'POST', {
        name: `${runTag} Contractor`,
        specialty: 'Electrical',
      }),
      familyContext(),
      'Create contractor'
    );
    const contractorId = createdContractor?.id as string;
    ensure(contractorId, 'Contractor creation returned no id');
    createdIds.contractors.push(contractorId);

    const contractorList = await call(
      contractorsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors?q=${encodeURIComponent(runTag)}`, 'GET'),
      familyContext(),
      'List contractors'
    );
    ensure(Array.isArray(contractorList) && contractorList.some((item: any) => item.id === contractorId), 'Created contractor missing from GET list');

    const updatedContractor = await call(
      contractorPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors/${contractorId}`, 'PUT', {
        phone: '08001234567',
      }),
      familyContext({ contractorId }),
      'Update contractor'
    );
    ensure(updatedContractor?.phone === '08001234567', 'Contractor update did not persist');

    const createdAppointment = await call(
      appointmentsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors/appointments`, 'POST', {
        contractorId,
        date: today,
        time: '10:00',
        durationMinutes: 60,
        purpose: `${runTag} Appointment`,
      }),
      familyContext(),
      'Create appointment'
    );
    const appointmentId = createdAppointment?.id as string;
    ensure(appointmentId, 'Appointment creation returned no id');
    createdIds.contractorAppointments.push(appointmentId);

    const appointmentsList = await call(
      appointmentsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors/appointments?contractorId=${contractorId}`, 'GET'),
      familyContext(),
      'List appointments'
    );
    ensure(Array.isArray(appointmentsList) && appointmentsList.some((item: any) => item.id === appointmentId), 'Created appointment missing from GET list');

    const updatedAppointment = await call(
      appointmentPut as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors/appointments/${appointmentId}`, 'PUT', {
        status: 'completed',
        cost: 99,
      }),
      familyContext({ appointmentId }),
      'Update appointment'
    );
    ensure(updatedAppointment?.status === 'completed', 'Appointment update did not persist');

    await call(
      appointmentDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors/appointments/${appointmentId}`, 'DELETE'),
      familyContext({ appointmentId }),
      'Delete appointment'
    );
    const deletedAppointment = await prisma.contractorAppointment.findUnique({ where: { id: appointmentId } });
    ensure(!deletedAppointment, 'Appointment still exists after delete');

    await call(
      contractorDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/contractors/${contractorId}`, 'DELETE'),
      familyContext({ contractorId }),
      'Delete contractor'
    );
    const deletedContractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
    ensure(!deletedContractor, 'Contractor still exists after delete');
  });

  await runCheck('Notifications', async () => {
    const created = await call(
      notificationsPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/notifications`, 'POST', {
        type: 'info',
        title: `${runTag} Notification`,
        message: 'Persistence audit notification',
        priority: 'medium',
        category: 'general',
      }),
      familyContext(),
      'Create notification'
    );
    const notificationId = created?.id as string;
    ensure(notificationId, 'Notification creation returned no id');
    createdIds.notifications.push(notificationId);

    const list = await call(
      notificationsGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/notifications?limit=100`, 'GET'),
      familyContext(),
      'List notifications'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === notificationId), 'Created notification missing from GET list');

    const updated = await call(
      notificationPatch as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/notifications/${notificationId}`, 'PATCH', {
        read: true,
      }),
      familyContext({ notificationId }),
      'Patch notification'
    );
    ensure(updated?.read === true, 'Notification read state did not persist');

    await call(
      notificationsReadAllPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/notifications/read-all`, 'POST', {}),
      familyContext(),
      'Mark all notifications read'
    );

    await call(
      notificationDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/notifications/${notificationId}`, 'DELETE'),
      familyContext({ notificationId }),
      'Delete notification'
    );
    const deleted = await prisma.notification.findUnique({ where: { id: notificationId } });
    ensure(!deleted, 'Notification still exists after delete');
  });

  await runCheck('Family members', async () => {
    const created = await call(
      membersPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/members`, 'POST', {
        name: `${runTag} Member`,
        role: 'Child',
        ageGroup: 'Child',
        color: '#22c55e',
        icon: '🧒',
      }),
      familyContext(),
      'Create family member'
    );
    const memberId = created?.id as string;
    ensure(memberId, 'Family member creation returned no id');
    createdIds.familyMembers.push(memberId);

    const list = await call(
      membersGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/members`, 'GET'),
      familyContext(),
      'List family members'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === memberId), 'Created family member missing from GET list');

    const updated = await call(
      memberPatch as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/members/${memberId}`, 'PATCH', {
        role: 'Teen',
      }),
      familyContext({ memberId }),
      'Patch family member'
    );
    ensure(updated?.role === 'Teen', 'Family member update did not persist');

    await call(
      memberDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/members/${memberId}`, 'DELETE'),
      familyContext({ memberId }),
      'Delete family member'
    );
    const deleted = await prisma.familyMember.findUnique({ where: { id: memberId } });
    ensure(!deleted, 'Family member still exists after delete');
  });

  await runCheck('Family milestones', async () => {
    const created = await call(
      milestonesPost as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/milestones`, 'POST', {
        title: `${runTag} Milestone`,
        date: now.toISOString(),
        type: 'family_event',
      }),
      familyContext(),
      'Create milestone'
    );
    const milestoneId = created?.id as string;
    ensure(milestoneId, 'Milestone creation returned no id');
    createdIds.familyMilestones.push(milestoneId);

    const list = await call(
      milestonesGet as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/milestones`, 'GET'),
      familyContext(),
      'List milestones'
    );
    ensure(Array.isArray(list) && list.some((item: any) => item.id === milestoneId), 'Created milestone missing from GET list');

    const updated = await call(
      milestonePatch as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/milestones/${milestoneId}`, 'PATCH', {
        title: `${runTag} Milestone Updated`,
      }),
      familyContext({ milestoneId }),
      'Patch milestone'
    );
    ensure(updated?.title === `${runTag} Milestone Updated`, 'Milestone update did not persist');

    await call(
      milestoneDelete as Handler,
      jsonRequest(`http://localhost/api/families/${currentFamilyId}/milestones/${milestoneId}`, 'DELETE'),
      familyContext({ milestoneId }),
      'Delete milestone'
    );
    const deleted = await prisma.familyMilestone.findUnique({ where: { id: milestoneId } });
    ensure(!deleted, 'Milestone still exists after delete');
  });
};

const printSummary = () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         Site-Wide Persistence Audit Summary          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  results.forEach((result) => {
    console.log(`- ${result.name}: ${result.status} — ${result.details}`);
  });
};

const main = async () => {
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = 'test';
  env.BYPASS_AUTH_FOR_TESTS = 'true';

  console.log('\n🔎 Running site-wide persistence checks...\n');

  try {
    await setupFamilyContext();
    env.TEST_AUTH_FAMILY_ID = currentFamilyId;
    env.TEST_AUTH_FAMILY_MEMBER_ID = currentMemberId;

    console.log(`Using family ${currentFamilyId} and member ${currentMemberId}`);
    console.log(`Run tag: ${runTag}\n`);

    await runPersistenceChecks();
  } finally {
    try {
      await cleanupCreatedRows();
      await cleanupByTag();
    } catch (cleanupError) {
      console.error('Cleanup warning:', cleanupError);
    }
    await prisma.$disconnect();
  }

  printSummary();

  const failures = results.filter((r) => r.status === 'FAIL');
  process.exit(failures.length ? 1 : 0);
};

main().catch((error) => {
  console.error('\n❌ Persistence audit crashed:', error);
  process.exit(1);
});
