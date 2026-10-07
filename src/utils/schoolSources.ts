import type { CalendarImportDraft } from './calendarImport';
import { isAdultSchoolEvent, isChildProfile } from './schoolEventPresentation';

export const SCHOOL_RULES_KEY = 'school.sources';
export const SCHOOL_RULES_VERSION = 1;
export type SchoolSourceKey = 'stewart-fleming' | 'grandir';
export type SchoolMember = { id: string; name: string; role?: string; ageGroup?: string };
export type SchoolSourceRule = { key: SchoolSourceKey; name: string; aliases: string[]; memberIds: string[] };
export type SchoolRules = { schemaVersion: 1; sources: SchoolSourceRule[] };
export type SchoolAssignment = {
  basis: 'institution' | 'named' | 'manual' | 'adult' | 'unresolved';
  originalPersonId: string;
  sourceKey: SchoolSourceKey | null;
  manualOverride?: { personId: string; actorId: string; at: string };
};
export type SchoolDraft = CalendarImportDraft & { sourceEventKey?: string; schoolAssignment?: SchoolAssignment };
export type SchoolSourceEvidence = {
  institution: SchoolSourceKey | null;
  institutionName: string | null;
  evidence: string[];
  transportSender: string;
  originalSenderClaim: string | null;
  links: string[];
  contentRequired: boolean;
  isSchool: boolean;
};

export const schoolMetadata = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

export const initialSchoolRules = (members: SchoolMember[]): SchoolRules => {
  const memberIds = (name: string) => {
    const matches = members.filter((member) => member.name.trim().split(/\s+/)[0].toLowerCase() === name &&
      isChildProfile({ role: member.role || '', ageGroup: member.ageGroup }));
    return matches.length === 1 ? [matches[0].id] : [];
  };
  return { schemaVersion: 1, sources: [
    { key: 'stewart-fleming', name: 'Stewart Fleming Primary School', aliases: ['Stewart Fleming'], memberIds: memberIds('amari') },
    { key: 'grandir', name: 'Grandir nursery', aliases: ['Grandir'], memberIds: memberIds('askia') },
  ] };
};

export const validateSchoolRules = (value: unknown, members: SchoolMember[]): SchoolRules => {
  const raw = schoolMetadata(value);
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.sources) || raw.sources.length !== 2) throw new Error('Invalid school source rules');
  const keys = new Set<string>();
  const sources = raw.sources.map((source: any): SchoolSourceRule => {
    if (!['stewart-fleming', 'grandir'].includes(source?.key) || keys.has(source.key) ||
        typeof source.name !== 'string' || !source.name.trim() || source.name.length > 140 ||
        !Array.isArray(source.aliases) || !source.aliases.length || source.aliases.length > 12 ||
        !source.aliases.every((alias: unknown) => typeof alias === 'string' && alias.trim().length >= 4 && alias.length <= 140) ||
        !Array.isArray(source.memberIds) || !source.memberIds.every((id: unknown) =>
          typeof id === 'string' && members.some((member) => member.id === id && isChildProfile({ role: member.role || '', ageGroup: member.ageGroup })))) {
      throw new Error('School enrollments must reference children in this family');
    }
    keys.add(source.key);
    return { key: source.key, name: source.name.trim(), aliases: Array.from(new Set(source.aliases.map((alias: string) => alias.trim()))), memberIds: Array.from(new Set(source.memberIds)) };
  });
  return { schemaVersion: 1, sources };
};

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsAlias = (text: string, alias: string) => new RegExp(`\\b${escape(alias)}\\b`, 'i').test(text);

// Only safe public URLs are displayed. Original HTML retains any signed portal link privately.
export const schoolSourceLinks = (text: string, html = '') => {
  const links = [...Array.from(html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi), (match) => match[1]),
    ...Array.from(text.matchAll(/https?:\/\/[^\s<>"']+/gi), (match) => match[0])];
  return Array.from(new Set(links.flatMap((link) => {
    try {
      const url = new URL(link.replace(/&amp;/g, '&').replace(/[).,]+$/, ''));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return [];
      return [`${url.origin}${url.pathname}`];
    } catch { return []; }
  }))).slice(0, 20);
};

export const resolveSchoolSource = (input: {
  sender?: string | null; subject?: string | null; text?: string | null; html?: string | null;
}, rules: SchoolRules): SchoolSourceEvidence => {
  const sender = input.sender || '';
  const body = [input.text, input.html?.replace(/<[^>]*>/g, ' ')].filter(Boolean).join('\n');
  const text = [input.subject, body].filter(Boolean).join('\n');
  const candidates = rules.sources.filter((rule) => rule.aliases.some((alias) => containsAlias(text, alias)) ||
    (rule.key === 'stewart-fleming' && /@stewartfleming\.bromley\.sch\.uk(?:[>\s]|$)/i.test(sender)));
  const source = candidates.length === 1 ? candidates[0] : null;
  const links = schoolSourceLinks(input.text || '', input.html || '');
  const famly = /\bfamly\b/i.test([sender, input.subject, body, ...links].join(' '));
  const gated = /log\s?in|sign\s?in|view (?:the |this |your )?(?:post|update|message)|read (?:the |this |full )?(?:post|update|message)|new (?:post|message|update)|open (?:the |your )?app/i.test(text);
  const hasEventDetails = /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|20\d{2}-\d{2}-\d{2})\b/i.test(body) &&
    /photograph|photo day|assembly|christmas|trip|sports day|party|parents.{0,12}(?:meeting|evening)|term|inset|reading morning|book fair|vaccination/i.test(body);
  const contentRequired = (famly || source?.key === 'grandir') && (!source || (gated && !hasEventDetails));
  return {
    institution: source?.key || null, institutionName: source?.name || null,
    evidence: candidates.map((rule) => rule.name), transportSender: sender,
    originalSenderClaim: body.match(/^\s*From:\s*(.+)$/im)?.[1]?.trim() || null,
    links, contentRequired, isSchool: Boolean(candidates.length || famly || /\bschool|nursery|pupils?\b/i.test(text)),
  };
};

export const assignSchoolDrafts = (drafts: SchoolDraft[], source: SchoolSourceEvidence, rules: SchoolRules,
  members: SchoolMember[], overrides: Record<string, any> = {}): SchoolDraft[] => drafts.map((draft) => {
  const originalPersonId = draft.schoolAssignment?.originalPersonId ?? draft.person;
  const override = overrides[draft.sourceEventKey || draft.importId] || draft.schoolAssignment?.manualOverride;
  if (override && (override.personId === '' || members.some((member) => member.id === override.personId))) {
    return { ...draft, person: override.personId, schoolAssignment: {
      basis: 'manual', originalPersonId, sourceKey: source.institution, manualOverride: override,
    } };
  }
  if (!source.isSchool) return draft;
  const eligible = rules.sources.find((rule) => rule.key === source.institution)?.memberIds || [];
  const adult = isAdultSchoolEvent(draft.title);
  const named = members.filter((member) => new RegExp(`\\b${escape(member.name)}\\b`, 'i').test(draft.personEvidence ?? draft.source));
  const namedAdult = named.length === 1 && !isChildProfile({ role: named[0].role || '', ageGroup: named[0].ageGroup });
  const cohort = /\b(?:Reception|Year\s+[1-6]|Key\s+Stage\s+[12])\b/i.test(draft.source);
  const person = adult ? (namedAdult ? named[0].id : '') :
    named.length === 1 ? (eligible.includes(named[0].id) ? named[0].id : '') :
      named.length === 0 && !cohort && eligible.length === 1 ? eligible[0] : '';
  const basis = adult ? 'adult' : person ? named.length === 1 ? 'named' : 'institution' : 'unresolved';
  const warning = adult ? 'Choose the adult attending.' : source.institution
    ? 'Confirm the child or cohort at this institution.' : 'Confirm the source institution before assigning a child.';
  return { ...draft, person, schoolAssignment: { basis, originalPersonId, sourceKey: source.institution },
    importStatus: !person && draft.importStatus !== 'duplicate' ? 'needs_review' : draft.importStatus,
    warnings: [...(draft.warnings || []).filter((value) => value !== warning), ...(!person ? [warning] : [])] };
});
