import { summarizeNurseryNotice } from '../nurseryNoticeSummary';

test('summarizes the Book of the Week invitation as preparation with source timing and action', () => {
  const summary = summarizeNurseryNotice(
    'Good afternoon parents. Next week, our Book of the Week is children are invited to bring in their favourite books.',
  );

  expect(summary).toEqual({
    kind: 'preparation',
    title: 'Book of the Week',
    purpose: expect.stringContaining('Next week'),
    actions: [expect.stringMatching(/bring in their favourite books/i)],
    timing: 'Next week',
    hasAttachments: false,
  });
});

test('recognizes only explicitly stated weekly routines', () => {
  const routine = summarizeNurseryNotice('Here is what to expect. Every Monday, children have forest school.');
  expect(routine.kind).toBe('routine');
  expect(routine.purpose).toBe('Every Monday, children have forest school.');
  expect(summarizeNurseryNotice('Today we had PE and enjoyed playing outside.').kind).toBe('reference');
});

test.each([
  'Today we had a visit from the firefighter.',
  'Today we had a party and PE lesson.',
  'Today we had a PE lesson.',
])('does not turn a retrospective activity into a dated event: %s', (body) => {
  expect(summarizeNurseryNotice(body).kind).toBe('reference');
});

test('keeps retrospective care and learning updates as reference, not a schedule', () => {
  const summary = summarizeNurseryNotice('<p>Today we had PE, made playdough and read a story.</p>');
  expect(summary.kind).toBe('reference');
  expect(summary.timing).toBe('Today');
  expect(summary.title).not.toMatch(/PE every/i);
});

test('classifies an explicitly dated trip as an event', () => {
  const summary = summarizeNurseryNotice('The nursery trip will take place on 12 October 2026.');
  expect(summary.kind).toBe('event');
  expect(summary.timing).toBe('12 October');
});

test('recognizes a titled date without requiring the word on', () => {
  const summary = summarizeNurseryNotice('Photo day: 12 October');
  expect(summary.kind).toBe('event');
  expect(summary.timing).toBe('12 October');
});

test.each([
  'Yesterday, photo day: 12 October.',
  'We had a party on 12 October.',
])('keeps a past activity with an explicit date as reference: %s', (body) => {
  expect(summarizeNurseryNotice(body).kind).toBe('reference');
});

test('marks attachment-only notices pending without inventing their contents', () => {
  expect(summarizeNurseryNotice('<p> &nbsp; </p>', true)).toEqual({
    kind: 'content_pending',
    title: 'Nursery attachment to review',
    purpose: 'The notice has an attachment but no readable text.',
    actions: ['Open the original notice and review its attachment.'],
    timing: null,
    hasAttachments: true,
  });
});

test('ignores out-of-range and surrogate numeric entities without throwing', () => {
  const body = 'Visit update &#1114112; &#x110000; &#55296;';
  expect(() => summarizeNurseryNotice(body)).not.toThrow();
  expect(summarizeNurseryNotice(body).purpose).toContain('Visit update');
});

test('does not turn past-tense actions or historical completion into preparation', () => {
  const summary = summarizeNurseryNotice('Yesterday we brought books and completed our activity.');
  expect(summary.kind).toBe('reference');
  expect(summary.actions).toEqual([]);
});

test('preserves a negated instruction without turning it into a positive action', () => {
  const summary = summarizeNurseryNotice('Please do not bring spare clothes tomorrow.');
  expect(summary.kind).toBe('preparation');
  expect(summary.actions).toEqual(['Please do not bring spare clothes tomorrow.']);
});

test('recognizes an explicit request to label nursery belongings as preparation', () => {
  const summary = summarizeNurseryNotice('Please label spare clothes with your child name.');
  expect(summary.kind).toBe('preparation');
  expect(summary.title).toMatch(/label spare clothes/i);
  expect(summary.actions).toEqual(['Please label spare clothes with your child name.']);
});

test('captures no more than four explicit preparation sentences', () => {
  const summary = summarizeNurseryNotice(
    'Please label spare clothes. Bring a water bottle. Wear wellies. Pack a hat. Return the form.',
  );
  expect(summary.kind).toBe('preparation');
  expect(summary.actions).toHaveLength(4);
  expect(summary.actions[0]).toContain('Please label spare clothes');
  expect(summary.actions[3]).toContain('Pack a hat');
});

test('preserves dotted dates and URLs while cleaning the notice', () => {
  const summary = summarizeNurseryNotice('Photo day: 12.10.2026. Details: https://nursery.example.org/notice');
  expect(summary.kind).toBe('event');
  expect(summary.timing).toBe('12.10.2026');
  expect(summary.purpose).toContain('12.10.2026');
  expect(summary.purpose).toContain('https://nursery.example.org/notice');
});

test('strips markup and decodes entities before extracting a preparation action', () => {
  const summary = summarizeNurseryNotice(
    '<p>Next week &amp;ndash; children are invited to bring their favourite books.</p><script>ignore this</script>',
  );
  expect(summary.kind).toBe('preparation');
  expect(summary.actions.join(' ')).toContain('bring their favourite books');
  expect(summary.purpose).not.toContain('<p>');
  expect(summary.purpose).not.toContain('ignore this');
});
