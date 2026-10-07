import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnvConfig(process.env.FAMILY_ENV_DIRECTORY || process.cwd());
const prisma = new PrismaClient();
async function main() {
  const sql = readFileSync(resolve('scripts/schema/family-planning.sql'), 'utf8');
  const identity = await prisma.$queryRaw<Array<{ database: string; schema: string }>>`
    SELECT current_database() AS database, current_schema() AS schema`;
  console.log({ identity, apply: process.argv.includes('--apply') });
  if (!process.argv.includes('--apply')) { console.log(sql); return; }
  await prisma.$transaction(async (tx) => {
    // This checked-in additive DDL is deliberately separate from schema push.
    for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(statement);
    }
  });
  console.log('Additive family planning schema applied. Existing records preserved.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
