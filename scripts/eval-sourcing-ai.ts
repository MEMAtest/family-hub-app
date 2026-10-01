/**
 * Scores the sourcing AI against hand-labelled Stonewater search results.
 *   npx tsx scripts/eval-sourcing-ai.ts [--model qwen/qwen3.7-flash] [--runs 3]
 * Pass bar: 0 critical false matches, >= 90% agreement, every verdict has a reason.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { reviewCandidates, sourcingAiModel, type AiVerdict, type ReviewRequirement } from '../src/lib/sourcing/aiReview';

for (const file of ['.env.local', '.env']) {
  try {
    readFileSync(join(process.cwd(), file), 'utf8').split('\n').forEach((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, '');
    });
  } catch { /* optional */ }
}

type Golden = { cases: Array<{ requirement: ReviewRequirement & { id: string }; candidates: Array<{ id: string; name: string; description: string; allowed: AiVerdict[] }> }> };
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const model = arg('model') ?? sourcingAiModel();
const runs = Number(arg('runs') ?? 1);
const golden = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/sourcing-ai-golden.json'), 'utf8')) as Golden;

(async () => {
  let total = 0, correct = 0, critical = 0, missing = 0, noReason = 0, hiddenGood = 0, cost = 0, calls = 0, failures = 0;
  const times: number[] = [];
  const wrong: string[] = [];
  for (let run = 1; run <= runs; run += 1) {
    for (const testCase of golden.cases) {
      const started = Date.now();
      let reviews;
      try {
        reviews = await reviewCandidates(testCase.requirement, testCase.candidates, { model, onUsage: (usage) => { cost += usage.cost ?? 0; } });
      } catch (error) {
        failures += 1;
        console.log(`  run ${run} ${testCase.requirement.id}: CALL FAILED ${(error as Error).message}`);
        continue;
      }
      calls += 1;
      times.push(Date.now() - started);
      for (const candidate of testCase.candidates) {
        total += 1;
        const review = reviews.get(candidate.id);
        if (!review) { missing += 1; wrong.push(`run ${run} ${testCase.requirement.id} | ${candidate.name} | (no verdict)`); continue; }
        if (!review.reason) noReason += 1;
        const isCritical = candidate.allowed.length === 1 && candidate.allowed[0] === 'not_suitable';
        if (candidate.allowed.includes(review.verdict)) { correct += 1; continue; }
        if (isCritical && (review.verdict === 'match' || review.verdict === 'needs_parts')) critical += 1;
        if (review.verdict === 'not_suitable') hiddenGood += 1;
        wrong.push(`run ${run} ${testCase.requirement.id} | ${candidate.name} | got ${review.verdict}, want ${candidate.allowed.join('/')}${isCritical ? ' [CRITICAL]' : ''} | ${review.reason}`);
      }
    }
  }
  const sorted = [...times].sort((a, b) => a - b);
  const agreement = total ? correct / total : 0;
  console.log(`\nModel ${model}, ${runs} run(s), ${calls} calls, ${failures} failed calls`);
  console.log(`Agreement        ${(agreement * 100).toFixed(1)}%  (${correct}/${total})`);
  console.log(`Critical misses  ${critical}   (wrong product shown as usable)`);
  console.log(`Good ones hidden ${hiddenGood}`);
  console.log(`No verdict       ${missing}`);
  console.log(`No reason        ${noReason}`);
  console.log(`Latency          median ${(sorted[Math.floor(sorted.length / 2)] / 1000).toFixed(1)}s, max ${(sorted[sorted.length - 1] / 1000).toFixed(1)}s per quote item`);
  console.log(`Cost             $${cost.toFixed(5)} total, $${(cost / Math.max(calls, 1)).toFixed(6)} per quote item`);
  if (wrong.length) console.log(`\nDisagreements:\n  ${wrong.join('\n  ')}`);
  const pass = critical === 0 && agreement >= 0.9 && missing === 0 && noReason === 0 && failures === 0;
  console.log(`\n${pass ? 'PASS' : 'FAIL'}`);
  process.exitCode = pass ? 0 : 1;
})();
