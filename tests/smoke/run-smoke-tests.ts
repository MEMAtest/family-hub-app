#!/usr/bin/env npx tsx

/**
 * Smoke Test Suite
 * -----------------
 * Verifies critical AI-powered budget experiences without calling external AI services.
 *
 * Covered paths:
 *  1. POST /api/ai/budget/insights
 *  2. POST /api/ai/budget/benchmark
 *  3. POST /api/ai/budget/forecast
 *
 * Each handler is executed directly and the Anthropic-backed methods are stubbed to
 * deterministic strings so the suite can run in any environment (CI, local, sandbox).
 */

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { POST as insightsHandler } from '../../src/app/api/ai/budget/insights/route';
import { POST as benchmarkHandler } from '../../src/app/api/ai/budget/benchmark/route';
import { POST as forecastHandler } from '../../src/app/api/ai/budget/forecast/route';
import { aiService } from '../../src/services/aiService';

interface SmokeResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const results: SmokeResult[] = [];
const createdIncomeIds: string[] = [];
const createdExpenseIds: string[] = [];

const stubbedResponses = {
  insights: 'SMOKE: Budget insights summary.',
  recommendations:
    'SMOKE: Recommendation 1 - review subscriptions.\nSMOKE: Recommendation 2 - consider meal planning.',
  benchmark:
    'SMOKE: Household spending is broadly aligned with the UK average; groceries are 8% higher than peers.',
  forecast:
    'SMOKE: Expect next month spending to increase by 5% due to upcoming term fees and family events.',
};

function recordResult(result: SmokeResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${result.name} — ${result.status}${result.details ? `: ${result.details}` : ''}`);
}

function createRequest(url: string, payload: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function ensureSmokeTestData(familyId: string) {
  const now = new Date();

  // Create three months of income and expense records so forecasting has signal
  for (let offset = 2; offset >= 0; offset -= 1) {
    const income = await prisma.budgetIncome.create({
      data: {
        familyId,
        incomeName: `Smoke Test Income M-${offset}`,
        amount: 5200 + offset * 150,
        category: 'Salary',
        isRecurring: false,
        paymentDate: new Date(now.getFullYear(), now.getMonth() - offset, 1),
      },
    });
    createdIncomeIds.push(income.id);

    const expense = await prisma.budgetExpense.create({
      data: {
        familyId,
        expenseName: `Smoke Test Expense M-${offset}`,
        amount: 3100 + offset * 200,
        category: offset % 2 === 0 ? 'Groceries' : 'Utilities',
        budgetLimit: 3500,
        isRecurring: false,
        paymentDate: new Date(now.getFullYear(), now.getMonth() - offset, 15),
        isReceiptScan: false,
      },
    });
    createdExpenseIds.push(expense.id);
  }
}

async function cleanupSmokeTestData() {
  if (createdExpenseIds.length) {
    await prisma.budgetExpense.deleteMany({
      where: { id: { in: createdExpenseIds } },
    });
  }

  if (createdIncomeIds.length) {
    await prisma.budgetIncome.deleteMany({
      where: { id: { in: createdIncomeIds } },
    });
  }
}

async function runSmokeTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║             AI Budget Smoke Test Suite               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const family = await prisma.family.findFirst({
    include: { members: true },
  });

  if (!family) {
    throw new Error('No family records present in the database.');
  }

  const familyId = family.id;
  const familySize = family.members.length || 2;
  console.log(`ℹ️  Running smoke tests using family ${family.familyName} (${familyId})\n`);

  await ensureSmokeTestData(familyId);

  // Stub AI service methods to deterministic values
  const originalAnalyze = aiService.analyzeBudgetSpending;
  const originalRecommend = aiService.getBudgetRecommendations;
  const originalCompare = aiService.compareToAverages;
  const originalForecast = aiService.predictSpendingTrend;

  try {
    (aiService.analyzeBudgetSpending as unknown as (typeof aiService.analyzeBudgetSpending)) = async () =>
      stubbedResponses.insights;
    (aiService.getBudgetRecommendations as unknown as (typeof aiService.getBudgetRecommendations)) = async () =>
      stubbedResponses.recommendations;
    (aiService.compareToAverages as unknown as (typeof aiService.compareToAverages)) = async () =>
      stubbedResponses.benchmark;
    (aiService.predictSpendingTrend as unknown as (typeof aiService.predictSpendingTrend)) = async () =>
      stubbedResponses.forecast;

    await testBudgetInsights(familyId);
    await testBudgetBenchmark(familyId, familySize);
    await testBudgetForecast(familyId);
  } finally {
    // restore originals
    (aiService.analyzeBudgetSpending as unknown as (typeof aiService.analyzeBudgetSpending)) = originalAnalyze;
    (aiService.getBudgetRecommendations as unknown as (typeof aiService.getBudgetRecommendations)) =
      originalRecommend;
    (aiService.compareToAverages as unknown as (typeof aiService.compareToAverages)) = originalCompare;
    (aiService.predictSpendingTrend as unknown as (typeof aiService.predictSpendingTrend)) = originalForecast;

    await cleanupSmokeTestData();
    await prisma.$disconnect();
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    SMOKE SUMMARY                      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  results.forEach((result) => {
    const status = result.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`- ${result.name}: ${status}${result.details ? ` — ${result.details}` : ''}`);
  });

  const failures = results.filter((result) => result.status === 'FAIL');
  process.exit(failures.length ? 1 : 0);
}

async function testBudgetInsights(familyId: string) {
  const request = createRequest('http://localhost/api/ai/budget/insights', {
    familyId,
  });

  const response = await insightsHandler(request);
  const payload = await response.json();

  const hasRecommendations =
    payload.recommendations === null || payload.recommendations === stubbedResponses.recommendations;

  if (
    response.status === 200 &&
    payload.insights === stubbedResponses.insights &&
    hasRecommendations &&
    payload.data?.totalIncome >= 1 &&
    payload.data?.expensesByCategory?.length
  ) {
    recordResult({
      name: 'Budget Insights endpoint',
      status: 'PASS',
      details: `Returned ${payload.data.expensesByCategory.length} categories.`,
    });
  } else {
    recordResult({
      name: 'Budget Insights endpoint',
      status: 'FAIL',
      details: `Unexpected response: ${JSON.stringify(payload, null, 2)}`,
    });
  }
}

async function testBudgetBenchmark(familyId: string, familySize: number) {
  const request = createRequest('http://localhost/api/ai/budget/benchmark', {
    familyId,
    months: 3,
  });

  const response = await benchmarkHandler(request);
  const payload = await response.json();

  if (
    response.status === 200 &&
    payload.analysis === stubbedResponses.benchmark &&
    Array.isArray(payload.comparisons) &&
    payload.comparisons.length > 0 &&
    payload.metadata?.familySize === familySize
  ) {
    recordResult({
      name: 'Budget Benchmark endpoint',
      status: 'PASS',
      details: `Compared ${payload.comparisons.length} categories.`,
    });
  } else {
    recordResult({
      name: 'Budget Benchmark endpoint',
      status: 'FAIL',
      details: `Unexpected response: ${JSON.stringify(payload, null, 2)}`,
    });
  }
}

async function testBudgetForecast(familyId: string) {
  const request = createRequest('http://localhost/api/ai/budget/forecast', {
    familyId,
    months: 6,
  });

  const response = await forecastHandler(request);
  const payload = await response.json();

  if (
    response.status === 200 &&
    payload.summary === stubbedResponses.forecast &&
    Array.isArray(payload.historicalExpenses) &&
    payload.historicalExpenses.length >= 3 &&
    Array.isArray(payload.projection) &&
    payload.projection.length > 0 &&
    payload.stats?.latestMonthTotal >= 0
  ) {
    recordResult({
      name: 'Budget Forecast endpoint',
      status: 'PASS',
      details: `Produced ${payload.projection.length} forecast points.`,
    });
  } else {
    recordResult({
      name: 'Budget Forecast endpoint',
      status: 'FAIL',
      details: `Unexpected response: ${JSON.stringify(payload, null, 2)}`,
    });
  }
}

runSmokeTests().catch((error) => {
  console.error('\n❌ Smoke suite crashed:', error);
  process.exit(1);
});
