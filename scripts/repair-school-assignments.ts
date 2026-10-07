import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.env.FAMILY_ENV_DIRECTORY || process.cwd());
import prisma from '../src/lib/prisma';
import { buildSchoolRepairPlan, applySchoolRepair } from '../src/lib/schoolIntakeRepair';

async function main() {
  const args = process.argv.slice(2);
  const familyId = args[args.indexOf('--family') + 1];
  if (!args.includes('--family') || !familyId) throw new Error('Use --family <id>');
  const plan = await buildSchoolRepairPlan(familyId);
  const changes = plan.plans.flatMap((item) => item.eventChanges);
  console.log({ planHash: plan.planHash, intakeCount: plan.plans.length,
    changedDrafts: plan.plans.reduce((total, item) => total + item.draftChanges.length, 0),
    events: changes.map(({ eventId, title, beforePersonId, afterPersonId }) => ({ eventId, title, beforePersonId, afterPersonId })),
    nextCursor: plan.nextCursor });
  if (!args.includes('--apply')) return;
  const planHash = args[args.indexOf('--plan-hash') + 1];
  if (!args.includes('--plan-hash') || !planHash) throw new Error('An explicit preview hash is required to apply');
  const approvedEventIds = args.flatMap((argument, index) => argument === '--approve-event' ? [args[index + 1]] : []).filter(Boolean);
  console.log(await applySchoolRepair(familyId, { planHash, approvedEventIds }, 'approved-family-planning-release'));
  const repeated = await buildSchoolRepairPlan(familyId);
  if (repeated.plans.some((item) => item.eventChanges.some((change) => approvedEventIds.includes(change.eventId)))) {
    throw new Error('A repaired assignment still appears in the repeat preview');
  }
  console.log('Approved event IDs retained; repeat repair does not change them again.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
