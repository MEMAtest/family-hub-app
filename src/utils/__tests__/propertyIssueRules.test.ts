import {
  taskCategoryFor,
  classifyIssue,
  classifyIssues,
  normalizeIssueDraft,
  splitIssueText,
  suggestIssueDate,
} from '../propertyIssueRules';

// Friday 25 September 2026
const TODAY = new Date(2026, 8, 25);

describe('classifyIssue', () => {
  test('recognises gutters as a yearly gutter-cleaner job', () => {
    const draft = classifyIssue('gutters need looking at', TODAY);
    expect(draft.area).toBe('roof_gutters');
    expect(draft.trade).toBe('Gutter cleaner');
    expect(draft.recurrence).toEqual({ interval: 1, unit: 'year' });
    expect(draft.costRange).toEqual({ min: 60, max: 150, currency: 'GBP' });
  });

  test('recognises window cleaning in either word order', () => {
    expect(classifyIssue('clean windows', TODAY).trade).toBe('Window cleaner');
    expect(classifyIssue('windows need cleaning', TODAY).trade).toBe('Window cleaner');
    expect(classifyIssue('the windows need a wash', TODAY).area).toBe('cleaning');
  });

  test('treats a gas smell as urgent with a safety note', () => {
    const draft = classifyIssue('I can smell gas in the kitchen', TODAY);
    expect(draft.urgency).toBe('urgent');
    expect(draft.area).toBe('safety');
    expect(draft.safetyNote).toMatch(/0800 111 999/);
  });

  test('bumps leaks to at least "soon" and bursts to urgent', () => {
    expect(classifyIssue('toilet is leaking', TODAY).urgency).toBe('soon');
    expect(classifyIssue('burst pipe under the sink', TODAY).urgency).toBe('urgent');
  });

  test('respects low-priority wording', () => {
    expect(classifyIssue('repaint the hallway at some point', TODAY).urgency).toBe('someday');
  });

  test('does not confuse short words inside longer ones', () => {
    // "look" must not match the plumbing "loo" rule, "blocked" must not match "lock"
    expect(classifyIssue('someone to look at the fence', TODAY).trade).toBe('Handyman');
    expect(classifyIssue('blocked drain outside', TODAY).trade).toBe('Drainage specialist');
    expect(classifyIssue('strip the wallpaper in the bedroom', TODAY).area).toBe('interior');
    expect(classifyIssue('investigate noise in the loft', TODAY).area).not.toBe('exterior');
  });

  test('treats mouldy sealant as a DIY re-seal, not a damp survey', () => {
    const draft = classifyIssue('bathroom sealant going mouldy', TODAY);
    expect(draft.area).toBe('bathroom');
    expect(draft.diy).toBe(true);
    expect(draft.costRange?.max).toBeLessThan(100);
    expect(classifyIssue('black mould on the bedroom wall', TODAY).area).toBe('damp');
  });

  test('picks up the room and adds it to the title', () => {
    const draft = classifyIssue('mould on the kitchen ceiling', TODAY);
    expect(draft.room).toBe('Kitchen');
    expect(draft.title).toContain('kitchen');
  });

  test('falls back to a tidy title for unknown jobs', () => {
    const draft = classifyIssue('need to sort out the understairs cupboard door squeak', TODAY);
    expect(draft.title.length).toBeGreaterThan(0);
    expect(draft.trade).toBeTruthy();
  });
});

describe('splitIssueText', () => {
  test('splits a brain-dump into separate jobs', () => {
    expect(splitIssueText('gutters need looking at and clean windows')).toEqual([
      'gutters need looking at',
      'clean windows',
    ]);
    expect(splitIssueText('bleed radiators\nfix dripping tap; mow lawn')).toHaveLength(3);
  });

  test('keeps a single job together when "and" is part of it', () => {
    expect(splitIssueText('sand and paint the skirting')).toHaveLength(1);
  });
});

describe('suggestIssueDate', () => {
  test('DIY jobs land on a Saturday, trade jobs on a weekday', () => {
    const diy = new Date(`${suggestIssueDate('routine', true, TODAY)}T12:00:00`);
    const trade = new Date(`${suggestIssueDate('routine', false, TODAY)}T12:00:00`);
    expect(diy.getDay()).toBe(6);
    expect([0, 6]).not.toContain(trade.getDay());
  });

  test('urgent jobs are tomorrow', () => {
    expect(suggestIssueDate('urgent', false, TODAY)).toBe('2026-09-26');
  });
});

describe('normalizeIssueDraft', () => {
  test('accepts well-formed AI output', () => {
    const draft = normalizeIssueDraft({
      title: 'Clear back gutters',
      area: 'roof_gutters',
      urgency: 'soon',
      trade: 'Gutter cleaner',
      diy: false,
      costRange: { min: 80, max: 120 },
      suggestedDate: '2026-10-02',
      recurrence: { interval: 1, unit: 'year' },
      steps: ['Book a clean'],
    }, 'gutters at the back overflowing', TODAY);
    expect(draft.title).toBe('Clear back gutters');
    expect(draft.suggestedDate).toBe('2026-10-02');
    expect(draft.costRange).toEqual({ min: 80, max: 120, currency: 'GBP' });
  });

  test('repairs malformed or unsafe AI output', () => {
    const draft = normalizeIssueDraft({
      title: '',
      area: 'spaceship',
      urgency: 'routine',
      costRange: { min: 'lots', max: 5 },
      suggestedDate: '2020-01-01',
      steps: 'call someone',
    }, 'smell of gas by the boiler', TODAY);
    expect(draft.area).toBe('safety');
    expect(draft.urgency).toBe('urgent'); // AI cannot downgrade a safety emergency
    expect((draft.suggestedDate ?? '') >= '2026-09-25').toBe(true);
    expect(draft.steps.length).toBeGreaterThan(0);
    expect(draft.safetyNote).toBeTruthy();
  });

  test('never lets the AI mark a safety job as DIY', () => {
    const draft = normalizeIssueDraft({ area: 'electrical', urgency: 'routine', diy: true }, 'socket has scorch marks', TODAY);
    expect(draft.diy).toBe(false);
    expect(draft.urgency).toBe('urgent');
  });
});

describe('taskCategoryFor', () => {
  const survey = ['Roof', 'Windows', 'Doors', 'Damp', 'Electrics', 'Drainage', 'Plumbing', 'Gas', 'Fire safety'];

  test('reuses existing survey categories', () => {
    expect(taskCategoryFor(classifyIssue('gutters need clearing', TODAY), survey)).toBe('Roof');
    expect(taskCategoryFor(classifyIssue('black mould on the bedroom wall', TODAY), survey)).toBe('Damp');
    expect(taskCategoryFor(classifyIssue('blocked drain outside', TODAY), survey)).toBe('Drainage');
    expect(taskCategoryFor(classifyIssue('back door lock is stiff', TODAY), survey)).toBe('Doors');
    expect(taskCategoryFor(classifyIssue('smell of gas in the kitchen', TODAY), survey)).toBe('Gas');
    expect(taskCategoryFor(classifyIssue('socket sparking', TODAY), survey)).toBe('Electrics');
  });

  test('falls back to the area label when there is no match', () => {
    expect(taskCategoryFor(classifyIssue('mow the lawn', TODAY), survey)).toBe('Garden');
    expect(taskCategoryFor(classifyIssue('gutters need clearing', TODAY), [])).toBe('Roof & gutters');
  });
});

describe('classifyIssues', () => {
  test('returns one draft per job', () => {
    const drafts = classifyIssues('gutters need clearing, clean windows', TODAY);
    expect(drafts.map((d) => d.trade)).toEqual(['Gutter cleaner', 'Window cleaner']);
  });
});
