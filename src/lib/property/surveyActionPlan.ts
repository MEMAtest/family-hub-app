import type { ContractorSpecialty } from '@/types/contractor.types';
import type { PropertyTask, PropertyTaskPriority } from '@/types/property.types';

export type SurveyActionLane = 'act_now' | 'verify_work' | 'plan_next' | 'complete';
export type SurveyRiskClass = 'critical' | 'prevent_damage' | 'maintenance' | 'cosmetic';

export interface SurveyExplanation {
  risk: SurveyRiskClass;
  riskLabel: string;
  meaning: string;
  resolution: string;
}

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

const categoryGuidance: Array<{
  pattern: RegExp;
  meaning: string;
  resolution: string;
}> = [
  {
    pattern: /roof|gutter|chimney/i,
    meaning: 'Water can enter the building and damage plaster, timber and finishes if this is left unresolved.',
    resolution: 'Ask a roofer to inspect the named area, photograph the defect, quote the repair and provide completion photos or an invoice.',
  },
  {
    pattern: /structure|cellar/i,
    meaning: 'The surveyor could not confirm that this part of the building is adequately supported.',
    resolution: 'Obtain a written inspection from a structural engineer before commissioning repair work.',
  },
  {
    pattern: /damp|timber/i,
    meaning: 'Moisture may be entering from more than one source and could conceal timber decay.',
    resolution: 'Use an independent damp and timber specialist to diagnose the source before accepting a treatment quote.',
  },
  {
    pattern: /asbestos/i,
    meaning: 'The material may be safe while undisturbed, but it must be identified before drilling, sanding or removal.',
    resolution: 'Arrange sampling by a qualified asbestos surveyor and follow the written management or removal advice.',
  },
  {
    pattern: /electric/i,
    meaning: 'The electrical installation was not proven safe by the building survey.',
    resolution: 'Book an EICR with a qualified electrician and keep the certificate and remedial schedule.',
  },
  {
    pattern: /gas|heating/i,
    meaning: 'There is no current evidence here that the gas appliances and pipework have passed a safety check.',
    resolution: 'Ask a Gas Safe engineer to inspect the system and upload the certificate.',
  },
  {
    pattern: /drain/i,
    meaning: 'Hidden drainage defects can contribute to damp or ground movement and cannot be ruled out visually.',
    resolution: 'Commission a CCTV drain survey covering rainwater and waste gullies, with video and a written report.',
  },
  {
    pattern: /fire|smoke/i,
    meaning: 'The current escape route or warning system may not provide enough protection in a fire.',
    resolution: 'Ask a competent fire-door installer or electrician to confirm the required work and certify completion.',
  },
  {
    pattern: /window|glaz|door/i,
    meaning: 'Defective glass, locks or seals can create an immediate safety, security or weatherproofing problem.',
    resolution: 'Ask a glazier, joiner or locksmith to inspect the specific item and record the repair.',
  },
  {
    pattern: /ventilat|extract|condensation/i,
    meaning: 'Insufficient ventilation can allow condensation and mould to return.',
    resolution: 'Confirm the required extraction rate and install or upgrade mechanical ventilation with suitable controls.',
  },
  {
    pattern: /decorat|finish|paint/i,
    meaning: 'This mainly affects appearance once the underlying cause has been resolved.',
    resolution: 'Schedule finishing work after related leak, damp or repair work has been signed off.',
  },
];

export const surveyRiskClass = (task: PropertyTask): SurveyRiskClass => {
  const text = `${task.category} ${task.title} ${task.impact}`;
  if (/asbestos|fire|gas|electric|structur|safety glass|lead pipe|rodent/i.test(text)) return 'critical';
  if (/roof|gutter|damp|drain|leak|rot|timber|chimney|ventilat/i.test(text)) return 'prevent_damage';
  if (task.priority === 'long' || /decorat|finish|paint|cosmetic/i.test(text)) return 'cosmetic';
  return 'maintenance';
};

const riskLabels: Record<SurveyRiskClass, string> = {
  critical: 'Safety / structural',
  prevent_damage: 'Prevent further damage',
  maintenance: 'Planned repair',
  cosmetic: 'Cosmetic',
};

export const surveyExplanation = (task: PropertyTask): SurveyExplanation => {
  const text = `${task.category} ${task.title} ${task.surveyEvidence ?? ''}`;
  const guidance = categoryGuidance.find((item) => item.pattern.test(text));
  const risk = surveyRiskClass(task);
  return {
    risk,
    riskLabel: riskLabels[risk],
    meaning: guidance?.meaning ?? task.impact,
    resolution: guidance?.resolution ?? `Ask ${task.recommendedContractor || 'an appropriate specialist'} to inspect, quote and provide evidence when complete.`,
  };
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
  const remaining = canonical.filter((task) => task.status !== 'completed');
  const knownCosts = remaining.flatMap((task) => task.defaultCostRange ? [task.defaultCostRange] : []);
  return {
    total: canonical.length,
    complete: canonical.filter((task) => surveyActionLane(task) === 'complete').length,
    actNow: canonical.filter((task) => surveyActionLane(task) === 'act_now').length,
    verifyWork: canonical.filter((task) => surveyActionLane(task) === 'verify_work').length,
    planNext: canonical.filter((task) => surveyActionLane(task) === 'plan_next').length,
    foldedExtracts: Math.max(0, surveyTasks.length - canonical.length),
    remainingCostMin: knownCosts.reduce((sum, cost) => sum + cost.min, 0),
    remainingCostMax: knownCosts.reduce((sum, cost) => sum + cost.max, 0),
    unpriced: remaining.filter((task) => !task.defaultCostRange).length,
  };
};

export const linkedSurveyTasks = (task: PropertyTask, tasks: PropertyTask[]) => {
  const components = new Set(task.components ?? []);
  return canonicalSurveyTasks(tasks)
    .filter((candidate) => candidate.id !== task.id)
    .filter((candidate) =>
      candidate.category === task.category ||
      (candidate.components ?? []).some((component) => components.has(component))
    )
    .slice(0, 3);
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
