import { PrismaClient } from '@prisma/client';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

export const hasTestDatabase = Boolean(testDatabaseUrl);

export const createTestPrisma = () =>
  new PrismaClient({
    datasources: {
      db: {
        url:
          testDatabaseUrl ??
          'postgresql://playwright:playwright@127.0.0.1:5432/family_hub_test',
      },
    },
  });

export const TEST_DATABASE_REQUIRED =
  'Set TEST_DATABASE_URL to a dedicated non-production database to run this data-writing E2E suite.';
