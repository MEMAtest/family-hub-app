import { tremaineRoadTasks } from '@/data/property/tremaineRoad';
import {
  canonicalSurveyTasks,
  contractorSpecialtyForTask,
  orderedSurveyTasks,
  linkedSurveyTasks,
  surveyExplanation,
  surveyPlanSummary,
  surveyWorkPackages,
} from './surveyActionPlan';

describe('survey action plan', () => {
  test('folds noisy PDF extracts into the curated Tremaine Road task register', () => {
    const summary = surveyPlanSummary(tremaineRoadTasks);

    expect(summary).toMatchObject({
      total: 20,
      complete: 4,
      actNow: 6,
      verifyWork: 3,
      planNext: 7,
      foldedExtracts: 21,
    });
    expect(summary.remainingCostMin).toBeGreaterThan(0);
    expect(summary.remainingCostMax).toBeGreaterThan(summary.remainingCostMin);
    expect(canonicalSurveyTasks(tremaineRoadTasks)).toHaveLength(20);
  });

  test('puts unresolved urgent work before verification and later work', () => {
    const ordered = orderedSurveyTasks(tremaineRoadTasks);

    expect(ordered[0]).toMatchObject({ priority: 'urgent', status: 'outstanding' });
    expect(ordered.findIndex((task) => task.status === 'verify')).toBeGreaterThan(
      ordered.findIndex((task) => task.priority === 'urgent' && task.status === 'outstanding'),
    );
    expect(ordered[ordered.length - 1]?.status).toBe('completed');
  });

  test('groups open work into contractor outreach packages', () => {
    const packages = surveyWorkPackages(tremaineRoadTasks);
    const roofing = packages.find((item) => item.contractor === 'Roofing contractor');

    expect(roofing?.specialty).toBe('roofer');
    expect(roofing?.tasks.map((task) => task.id)).toEqual([
      'task-tremaine-03',
      'task-tremaine-04',
    ]);
    expect(packages.some((item) => item.contractor === 'Structural engineer')).toBe(true);
  });

  test('maps specialist survey actions to searchable contractor trades', () => {
    expect(contractorSpecialtyForTask(tremaineRoadTasks.find((task) => task.id === 'task-tremaine-05')!)).toBe('structural_engineer');
    expect(contractorSpecialtyForTask(tremaineRoadTasks.find((task) => task.id === 'task-tremaine-06')!)).toBe('damp_specialist');
    expect(contractorSpecialtyForTask(tremaineRoadTasks.find((task) => task.id === 'task-tremaine-10')!)).toBe('drainage_specialist');
  });

  test('turns technical findings into plain-English decisions and links related work', () => {
    const roof = tremaineRoadTasks.find((task) => task.id === 'task-tremaine-03')!;
    const explanation = surveyExplanation(roof);

    expect(explanation.risk).toBe('prevent_damage');
    expect(explanation.meaning).toMatch(/water/i);
    expect(explanation.resolution).toMatch(/roofer/i);
    expect(linkedSurveyTasks(roof, tremaineRoadTasks).some((task) => task.id === 'task-tremaine-04')).toBe(true);
  });
});
