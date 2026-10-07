import { parseCalendarImportText } from '../calendarImport';
import { assignSchoolDrafts, initialSchoolRules, resolveSchoolSource, schoolSavedEventAttendance, schoolSourceLinks, validateSchoolRules, type SchoolDraft } from '../schoolSources';

const members = [
  { id: 'actual-askia-id', name: 'Askia', role: 'Child', ageGroup: 'Child' },
  { id: 'adult-id', name: 'Ademola', role: 'Parent' },
  { id: 'actual-amari-id', name: 'Amari', role: 'Child', ageGroup: 'Toddler' },
];
const rules = initialSchoolRules(members);
const draft = (source = 'All children - Individual and sibling photographs 7 October 2026'): SchoolDraft => ({
  importId: 'photo', sourceEventKey: 'photo-key', title: 'Individual and sibling photographs', person: 'actual-askia-id',
  date: '2026-10-07', time: '09:00', timeSpecified: false, duration: 60, recurring: 'none', cost: 0,
  type: 'education', isRecurring: false, priority: 'medium', status: 'confirmed', confidence: 0.9,
  source, sourceLine: 1, importStatus: 'ready', warnings: [],
});
const resolve = (text: string, sender?: string) => resolveSchoolSource({ text, sender }, rules);
const assign = (value: SchoolDraft, text = 'Stewart Fleming Primary School') => assignSchoolDrafts([value], resolve(text), rules, members)[0];

describe('institution-scoped school assignment', () => {
  it('recognises the exact Grandir parent portal in notice emails without trusting lookalike hosts or generic Famly', () => {
    expect(resolve('View this update: https://www.app.grandiruk.com/#/account/post/notice')).toMatchObject({
      institution: 'grandir', contentRequired: true });
    expect(resolve('View this update: https://www.app.grandiruk.com.evil.example/notice').institution).toBeNull();
    expect(resolve('New Famly message. View this update: https://app.famly.co/notice').institution).toBeNull();
  });
  it('uses actual unique family IDs independently of member order and age labels', () => {
    expect(rules.sources[0].memberIds).toEqual(['actual-amari-id']);
    expect(rules.sources[1].memberIds).toEqual(['actual-askia-id']);
    expect(initialSchoolRules([...members, { id: 'duplicate', name: 'Amari', role: 'Child' }]).sources[0].memberIds).toEqual([]);
  });
  it('maps all children to the source enrollment, never all household children', () => {
    expect(assign(draft())).toMatchObject({ person: 'actual-amari-id', schoolAssignment: { basis: 'institution', originalPersonId: 'actual-askia-id' } });
    expect(assign(draft(), 'Grandir nursery')).toMatchObject({ person: 'actual-askia-id' });
  });
  it.each(['Reception', 'Year 1', 'Year 6', 'Key Stage 1', 'Key Stage 2', 'EYFS', 'KS1', 'KS2', 'KS 2'])('does not infer a narrow %s cohort from enrollment or age', (cohort) => {
    expect(assign(draft(`${cohort} assembly 7 October 2026`))).toMatchObject({ person: '', schoolAssignment: { basis: 'unresolved' } });
  });
  it('preserves saved choices including explicitly unassigned and cross-institution household choices', () => {
    for (const personId of ['', 'actual-askia-id']) {
      const chosen = assignSchoolDrafts([draft()], resolve('Stewart Fleming'), rules, members, {
        'photo-key': { personId, actorId: 'adult-id', at: '2026-10-07T08:00:00Z' },
      })[0];
      expect(chosen.person).toBe(personId);
      expect(chosen.schoolAssignment?.basis).toBe('manual');
    }
  });
  it('does not assign an adult school meeting to a child', () => {
    expect(assign({ ...draft(), title: 'Parents evening' }).person).toBe('');
    expect(assign({ ...draft('Ademola parents evening 7 October 2026'), title: 'Parents evening' }).person).toBe('adult-id');
  });
  it('separates source concerns from an unknown or explicitly chosen adult attendee', () => {
    const pta = assign({ ...draft(), title: 'PTA AGM', source: 'PTA AGM 7 October 2026' });
    expect(pta.schoolAssignment).toMatchObject({ concernedMemberIds: ['actual-amari-id'], attendeePersonId: null, attendeeStatus: 'needs_confirmation' });
    const chosen = assign({ ...pta, schoolAssignment: { ...pta.schoolAssignment!, manualOverride: {
      personId: 'adult-id', actorId: 'adult-id', at: '2026-10-07',
    } } });
    expect(chosen).toMatchObject({ person: 'adult-id', schoolAssignment: { basis: 'manual', concernedMemberIds: ['actual-amari-id'], attendeePersonId: 'adult-id', attendeeStatus: 'confirmed' } });
  });
  it('does not confirm the old child as a PTA attendee, even while source details are loading', () => {
    const event = { title: 'PTA AGM', sourceId: 'legacy-intake', person: 'actual-askia-id', metadata: null };
    expect(schoolSavedEventAttendance(event, members)).toEqual({ attendeePersonId: null, attendeeStatus: 'needs_confirmation' });
    expect(schoolSavedEventAttendance({ ...event, metadata: { assignmentOverride: { personId: 'actual-askia-id' } } }, members).attendeeStatus).toBe('needs_confirmation');
    expect(schoolSavedEventAttendance({ ...event, person: 'adult-id', metadata: { assignmentOverride: { personId: 'adult-id' } } }, members)).toEqual({ attendeePersonId: 'adult-id', attendeeStatus: 'confirmed' });
  });
  it('keeps child concern enrollment independent of a manual attendee choice at another institution', () => {
    const chosen = assignSchoolDrafts([draft()], resolve('Stewart Fleming'), rules, members, {
      'photo-key': { personId: 'actual-askia-id', actorId: 'adult-id', at: '2026-10-07' },
    })[0];
    expect(chosen.schoolAssignment).toMatchObject({ concernedMemberIds: ['actual-amari-id'], attendeePersonId: 'actual-askia-id', basis: 'manual' });
    expect(assign(draft('Key Stage 2 assembly 7 October 2026')).schoolAssignment?.concernedMemberIds).toEqual([]);
  });
  it('does not borrow a child name from a later line when resolving a parsed cohort', () => {
    const parsed = parseCalendarImportText({ text: 'Key Stage 2 reading morning 7 October 2026\nAmari should bring a reading record', people: members as any, defaultPersonId: '' });
    expect(parsed.length).toBeGreaterThan(0);
    expect(assignSchoolDrafts(parsed, resolve('Stewart Fleming'), rules, members)[0].person).toBe('');
  });
  it('requires actual nursery identity rather than treating every Famly notification as Grandir', () => {
    expect(resolve('New post. Sign in to view the message', 'Famly <notify@famly.example>')).toMatchObject({ institution: null, contentRequired: true });
    expect(resolve('Grandir nursery. Sign in to view the message', 'Famly <notify@famly.example>')).toMatchObject({ institution: 'grandir', contentRequired: true });
    expect(resolve('Grandir nursery\nChristmas party 7 December 2026. Bring a hat.', 'Famly')).toMatchObject({ institution: 'grandir', contentRequired: false });
  });
  it('keeps conflicting sources and lookalike sender domains unresolved', () => {
    expect(resolve('Stewart Fleming and Grandir nursery')).toMatchObject({ institution: null });
    expect(resolve('Weekly school update', 'office@stewartfleming.bromley.sch.uk.attacker.example')).toMatchObject({ institution: null });
  });
  it('retains the transport sender separately from the quoted original sender', () => {
    expect(resolve('From: office@stewartfleming.bromley.sch.uk\nStewart Fleming Primary School', 'parent@example.test')).toMatchObject({
      institution: 'stewart-fleming', transportSender: 'parent@example.test', originalSenderClaim: 'office@stewartfleming.bromley.sch.uk',
    });
  });
  it('displays only public source links, not credentials, query tokens or fragments', () => {
    expect(schoolSourceLinks('https://user:password@example.test/post https://app.famly.co/post?token=private#secret', '<a href="javascript:alert(1)">')).toEqual(['https://app.famly.co/post']);
  });
  it('rejects enrollment of a foreign member or household adult', () => {
    for (const id of ['foreign-id', 'adult-id']) expect(() => validateSchoolRules({ ...rules, sources: [
      { ...rules.sources[0], memberIds: [id] }, rules.sources[1],
    ] }, members)).toThrow(/children in this family/);
  });
});
