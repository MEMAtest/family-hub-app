import { mergeCollection, mergeObject, sameValue, stableStringify } from '../sharedDocumentMerge';

type Item = { id: string; title: string; updatedAt?: string };
const item = (id: string, title = id, updatedAt?: string): Item => ({ id, title, ...(updatedAt ? { updatedAt } : {}) });

describe('stableStringify', () => {
  test('ignores key order, as Postgres jsonb reorders keys', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(sameValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});

describe('mergeCollection with a shared base', () => {
  const base = [item('a'), item('b'), item('c')];

  test('keeps additions from both devices', () => {
    const local = [...base, item('mine')];
    const server = [...base, item('theirs')];
    expect(mergeCollection(base, local, server).map((i) => i.id)).toEqual(['a', 'b', 'c', 'theirs', 'mine']);
  });

  test('applies a deletion made on either side', () => {
    expect(mergeCollection(base, [item('a'), item('c')], base).map((i) => i.id)).toEqual(['a', 'c']);
    expect(mergeCollection(base, base, [item('b'), item('c')]).map((i) => i.id)).toEqual(['b', 'c']);
  });

  test('takes an edit from whichever side made it', () => {
    const local = [item('a', 'local edit'), item('b'), item('c')];
    const server = [item('a'), item('b', 'server edit'), item('c')];
    const merged = mergeCollection(base, local, server);
    expect(merged.find((i) => i.id === 'a')!.title).toBe('local edit');
    expect(merged.find((i) => i.id === 'b')!.title).toBe('server edit');
  });

  test('never loses an edit to a deletion on the other device', () => {
    const local = [item('a', 'edited'), item('b'), item('c')];
    const server = [item('b'), item('c')];
    expect(mergeCollection(base, local, server).find((i) => i.id === 'a')!.title).toBe('edited');
    expect(mergeCollection(base, server, local).find((i) => i.id === 'a')!.title).toBe('edited');
  });

  test('edited on both sides: newer updatedAt wins, otherwise this device', () => {
    const b = [item('a', 'orig', '2026-01-01T00:00:00Z')];
    const local = [item('a', 'local', '2026-02-01T00:00:00Z')];
    const serverNewer = [item('a', 'server', '2026-03-01T00:00:00Z')];
    const serverOlder = [item('a', 'server', '2026-01-15T00:00:00Z')];
    expect(mergeCollection(b, local, serverNewer)[0].title).toBe('server');
    expect(mergeCollection(b, local, serverOlder)[0].title).toBe('local');
    expect(mergeCollection([item('x')], [item('x', 'L')], [item('x', 'S')])[0].title).toBe('L');
  });

  test('treats jsonb key reordering as no change', () => {
    const b = [{ id: 'a', title: 't', extra: { x: 1, y: 2 } }];
    const server = [{ extra: { y: 2, x: 1 }, title: 't', id: 'a' }];
    const local = [{ id: 'a', title: 'changed', extra: { x: 1, y: 2 } }];
    expect(mergeCollection(b, local, server)[0].title).toBe('changed');
  });
});

describe('mergeCollection without a base (first sync on a device)', () => {
  test('server wins for shared records, unique records from both sides are kept', () => {
    const local = [item('seed', 'untouched seed'), item('only-here')];
    const server = [item('seed', 'edited elsewhere'), item('only-there')];
    const merged = mergeCollection(null, local, server);
    expect(merged.map((i) => i.id)).toEqual(['seed', 'only-there', 'only-here']);
    expect(merged[0].title).toBe('edited elsewhere');
  });
});

describe('mergeObject', () => {
  const base = { name: 'Home', address: '1 Road', notes: '' };

  test('one-sided changes win', () => {
    expect(mergeObject(base, { ...base, name: 'New' }, base).name).toBe('New');
    expect(mergeObject(base, base, { ...base, name: 'Theirs' }).name).toBe('Theirs');
  });

  test('both changed: merges field by field', () => {
    const merged = mergeObject(base, { ...base, name: 'Mine' }, { ...base, notes: 'Theirs' });
    expect(merged).toEqual({ name: 'Mine', address: '1 Road', notes: 'Theirs' });
  });

  test('no base: server wins', () => {
    expect(mergeObject(null, { ...base, name: 'Mine' }, base)).toEqual(base);
  });
});
