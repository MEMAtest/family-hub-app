import type { ContractorSpecialty } from '@/types/contractor.types';
import type { PropertyTask, PropertyTaskPriority } from '@/types/property.types';

export type SurveyActionLane = 'act_now' | 'verify_work' | 'plan_next' | 'complete';

export interface SurveyWorkPackage {
  key: string;
  contractor: string;
  specialty: ContractorSpecialty;
  tasks: PropertyTask[];
  urgentCount: number;
  verifyCount: number;
}

const priorityRank: Record<PropertyTaskPriority, number> = {
  urgent: 0,
  short: 1,
  medium: 2,
  long: 3,
};
const statusRank: Record<PropertyTask['status'], number> = {
  blocked: 0,
  outstanding: 1,
  in_progress: 2,
  verify: 3,
  completed: 4,
};

export const contractorSpecialtyForTask = (task: PropertyTask): ContractorSpecialty => {
  const value = `${task.recommendedContractor ?? ''} ${task.category} ${task.title}`.toLowerCase();
  const rules: Array<[ContractorSpecialty, RegExp]> = [
    ['structural_engineer', /structural engineer/],
    ['damp_specialist', /\bpca\b|damp|timber specialist/],
    ['asbestos_surveyor', /asbestos/],
    ['drainage_specialist', /drainage|cctv drain/],
    ['glazier', /glazing|glazier|safety glass/],
    ['joiner', /joiner|fire door/],
    ['roofer', /roof|gutter|flashing|ridge|skylight|rooflight/],
    ['electrician', /electric|eicr|smoke alarm|extractor fan/],
    ['gas_engineer', /gas safe|gas safety|gas engineer/],
    ['plumber', /plumb|lead pipe|water supply/],
    ['locksmith', /locksmith|lock|keys?/],
    ['pest_control', /pest|rodent|vermin/],
    ['builder', /builder|air brick|external wall/],
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] ?? 'other';
};

export const surveyActionLane = (task: PropertyTask): SurveyActionLane => {
  if (task.status === 'completed') return 'complete';
  if (task.status === 'verify') return 'verify_work';
  if (task.priority === 'urgent' || task.status === 'blocked' || task.status === 'in_progress') return 'act_now';
  return 'plan_next';
};

export const canonicalSurveyTasks = (tasks: PropertyTask[]) => {
  const surveyTasks = tasks.filter((task) => task.source === 'survey');
  const curated = surveyTasks.filter((task) => !/^task-tremaine-pdf-/i.test(task.id));
  return curated.length > 0 ? curated : surveyTasks;
};

export const orderedSurveyTasks = (tasks: PropertyTask[]) => canonicalSurveyTasks(tasks)
  .slice()
  .sort((a, b) => {
    const laneOrder: Record<SurveyActionLane, number> = { act_now: 0, verify_work: 1, plan_next: 2, complete: 3 };
    return laneOrder[surveyActionLane(a)] - laneOrder[surveyActionLane(b)]
      || priorityRank[a.priority] - priorityRank[b.priority]
      || statusRank[a.status] - statusRank[b.status]
      || a.title.localeCompare(b.title);
  });

export const surveyPlanSummary = (tasks: PropertyTask[]) => {
  const surveyTasks = tasks.filter((task) => task.source === 'survey');
  const canonical = canonicalSurveyTasks(tasks);
  return {
    total: canonical.length,
    complete: canonical.filter((task) => surveyActionLane(task) === 'complete').length,
    actNow: canonical.filter((task) => surveyActionLane(task) === 'act_now').length,
    verifyWork: canonical.filter((task) => surveyActionLane(task) === 'verify_work').length,
    planNext: canonical.filter((task) => surveyActionLane(task) === 'plan_next').length,
    foldedExtracts: Math.max(0, surveyTasks.length - canonical.length),
  };
};

export const surveyWorkPackages = (tasks: PropertyTask[]): SurveyWorkPackage[] => {
  const groups = new Map<string, PropertyTask[]>();
  for (const task of canonicalSurveyTasks(tasks)) {
    if (task.status === 'completed') continue;
    const contractor = task.recommendedContractor?.trim() || 'Appropriate specialist';
    const key = contractor.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  return Array.from(groups.entries())
    .map(([key, packageTasks]) => ({
      key,
      contractor: packageTasks[0].recommendedContractor?.trim() || 'Appropriate specialist',
      specialty: contractorSpecialtyForTask(packageTasks[0]),
      tasks: packageTasks.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]),
      urgentCount: packageTasks.filter((task) => task.priority === 'urgent').length,
      verifyCount: packageTasks.filter((task) => task.status === 'verify').length,
    }))
    .sort((a, b) => b.urgentCount - a.urgentCount || b.tasks.length - a.tasks.length || a.contractor.localeCompare(b.contractor));
};
