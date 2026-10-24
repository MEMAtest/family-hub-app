import { create } from 'zustand';
import { SharedDocumentSync } from '../sharedDocumentSync';
import { SHARED_DOCUMENTS } from '@/lib/sharedDocuments';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';
import { saveTilePlan } from '@/lib/sourcing/tilePlanner';

type Row = { data: unknown; version: number };

// In-memory stand-in for /api/families/:id/documents with the same version rules.
const createServer = () => {
  const rows = new Map<string, Row>();
  let mode: 'ok' | 'unavailable' | 'offline' = 'ok';
  const json = (status: number, body: unknown) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(JSON.stringify(body)) }) as Response;

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (mode === 'offline') throw new TypeError('Failed to fetch');
    if (mode === 'unavailable') return json(503, { unavailable: true });
    const url = String(input);
    if (!init?.method || init.method === 'GET') {
      const documents: Record<string, unknown> = {};
      const versions = JSON.parse(new URL(url, 'http://localhost').searchParams.get('versions') || '{}');
      const unchangedVersions: Record<string, number> = {};
      rows.forEach((row, key) => {
        if (versions[key] === row.version) unchangedVersions[key] = row.version;
        else documents[key] = { key, ...row, updatedAt: '' };
      });
      return json(200, { documents, unchangedVersions });
    }
    const key = decodeURIComponent(url.split('/documents/')[1]);
    const { data, baseVersion } = JSON.parse(String(init.body));
    const current = rows.get(key);
    if ((current?.version ?? 0) !== baseVersion) {
      return json(409, { current: current ? { ...current, updatedAt: '' } : null });
    }
    const version = baseVersion + 1;
    rows.set(key, { data: JSON.parse(JSON.stringify(data)), version });
    return json(baseVersion === 0 ? 201 : 200, { version, updatedAt: '' });
  }) as typeof fetch;

  return { rows, fetchImpl, setMode: (next: typeof mode) => { mode = next; } };
};

// Minimal store with just the fields the sync touches.
const createDeviceStore = (overrides: Record<string, unknown> = {}) =>
  create<any>((set) => ({
    propertyProfile: { propertyName: 'Home', address: '1 Road' },
    propertyTasks: [{ id: 'seed-1', title: 'Seed task' }],
    propertyValues: [],
    areaWatchItems: [],
    propertyComponents: [],
    propertyProjects: [],
    propertyIssues: [],
    kidsEventMarks: [],
    digestPreferences: { kidsIdeas: true },
    kitchenStaples: [],
    fridgeChecks: [],
    sharedSyncStatus: 'local',
    setSharedSyncStatus: (status: string) => set({ sharedSyncStatus: status }),
    ...overrides,
  }));

const issue = (id: string, title = id) => ({ id, title, updatedAt: '2026-09-26T10:00:00Z' });

describe('SharedDocumentSync between two devices', () => {
  let syncs: SharedDocumentSync[] = [];
  const device = (server: ReturnType<typeof createServer>, overrides?: Record<string, unknown>) => {
    const store = createDeviceStore(overrides);
    // Each device has its own browser storage
    const memory = new Map<string, string>();
    const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); } };
    const sync = new SharedDocumentSync('family-1', store as any, server.fetchImpl, storage);
    syncs.push(sync);
    return { store, sync };
  };

  beforeEach(() => {
    window.localStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    syncs.forEach((sync) => sync.stop());
    syncs = [];
  });

  test('the first device uploads its local data', async () => {
    const server = createServer();
    const a = device(server, { propertyIssues: [issue('gutters')] });
    await a.sync.start();
    await a.sync.flush();

    expect(server.rows.size).toBe(Object.keys(SHARED_DOCUMENTS).length);
    expect(server.rows.get('property.issues')!.data).toEqual([issue('gutters')]);
    expect(a.store.getState().sharedSyncStatus).toBe('synced');
  });

  test('unchanged pulls request versions and do not re-upload omitted documents; newer versions still merge', async () => {
    const server = createServer();
    const fetch = jest.spyOn(server, 'fetchImpl');
    const a = device(server);
    await a.sync.start();
    await a.sync.flush();
    fetch.mockClear();
    await a.sync.pull();
    await a.sync.flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain('&versions=');
    const payload = await (await fetch.mock.results[0].value).json();
    expect(payload.documents).toEqual({});
    expect(Object.keys(payload.unchangedVersions)).toHaveLength(Object.keys(SHARED_DOCUMENTS).length);
    server.rows.set('property.issues', { data: [issue('new-roof')], version: 2 });
    await a.sync.pull();
    expect(a.store.getState().propertyIssues).toEqual([issue('new-roof')]);
  });

  test('periodic pulls pause in hidden or offline tabs and resume on visibility or connectivity', async () => {
    const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const online = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const server = createServer();
    const fetch = jest.spyOn(server, 'fetchImpl');
    const a = device(server);
    await a.sync.start();
    await a.sync.flush();
    jest.useFakeTimers();
    try {
      fetch.mockClear();
      visibility.mockReturnValue('hidden');
      jest.advanceTimersByTime(120_000);
      window.dispatchEvent(new Event('focus'));
      expect(fetch).not.toHaveBeenCalled();
      visibility.mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fetch).toHaveBeenCalledTimes(1);
      await a.sync.pull();
      fetch.mockClear();
      online.mockReturnValue(false);
      jest.advanceTimersByTime(120_000);
      expect(fetch).not.toHaveBeenCalled();
      online.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
      expect(fetch).toHaveBeenCalledTimes(1);
      await a.sync.pull();
      a.sync.stop();
      fetch.mockClear();
      window.dispatchEvent(new Event('focus'));
      expect(fetch).not.toHaveBeenCalled();
    } finally { a.sync.stop(); jest.useRealTimers(); visibility.mockRestore(); online.mockRestore(); }
  });

  test('an invalid unchanged-version response cannot turn omitted data into uploads', async () => {
    const server = createServer();
    const fetch = jest.spyOn(server, 'fetchImpl');
    const a = device(server);
    await a.sync.start();
    await a.sync.flush();
    fetch.mockClear();
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ documents: {}, unchangedVersions: { 'property.profile': 999 } }) } as Response);
    await a.sync.pull();
    await a.sync.flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a.store.getState().sharedSyncStatus).toBe('offline');
    expect(server.rows.get('property.profile')?.version).toBe(1);
  });

  test('a second device picks up the household data', async () => {
    const server = createServer();
    const a = device(server, { propertyIssues: [issue('gutters')], propertyTasks: [{ id: 'seed-1', title: 'Edited on phone A' }] });
    await a.sync.start();
    await a.sync.flush();

    // Device B has never synced and still holds the default seed data.
    const b = device(server);
    await b.sync.start();
    await b.sync.flush();

    expect(b.store.getState().propertyIssues).toEqual([issue('gutters')]);
    expect(b.store.getState().propertyTasks).toEqual([{ id: 'seed-1', title: 'Edited on phone A' }]);
  });

  test('keeps an edit made while the first server pull is still pending', async () => {
    const server = createServer();
    const first = device(server, { digestPreferences: { kidsIdeas: true, extraRecipients: [] } });
    await first.sync.start();
    await first.sync.flush();

    let releasePull!: () => void;
    let reportPullStarted!: () => void;
    const pullStarted = new Promise<void>((resolve) => { reportPullStarted = resolve; });
    const holdPull = new Promise<void>((resolve) => { releasePull = resolve; });
    let held = false;
    const delayedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((!init?.method || init.method === 'GET') && !held) {
        held = true;
        reportPullStarted();
        await holdPull;
      }
      return server.fetchImpl(input, init);
    }) as typeof fetch;
    const store = createDeviceStore({ digestPreferences: { kidsIdeas: true, extraRecipients: [] } });
    const memory = new Map<string, string>();
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    const sync = new SharedDocumentSync('family-1', store as any, delayedFetch, storage);
    syncs.push(sync);

    const starting = sync.start();
    await pullStarted;
    store.setState({ digestPreferences: { kidsIdeas: true, extraRecipients: ['grandma@example.com'] } });
    releasePull();
    await starting;
    await sync.flush();

    expect(server.rows.get('digest.preferences')!.data).toEqual({ kidsIdeas: true, extraRecipients: ['grandma@example.com'] });
  });

  test('a saved bathroom tile plan and its source photo reach a second device unchanged', async () => {
    const server = createServer();
    const source = 'data:image/jpeg;base64,/9j/2Q==';
    const sourcing = saveTilePlan(createBathroomSourcingSeed(), 'main-floor-tiles', {
      method: 'area', unit: 'm', areaM2: 5, sections: [], deductionsM2: 0, wasteIncluded: 'excluded', wastePercent: 10,
      source: { kind: 'photo', label: 'QA drawing', imageDataUrl: source },
    }, { name: 'QA tile', supplier: '', url: '', widthMm: 600, lengthMm: 600, coveragePerBoxM2: 1.44, price: 42, priceBasis: 'box' });
    const project = { id: 'qa-bathroom', updatedAt: new Date().toISOString(), sourcing };
    const a = device(server, { propertyProjects: [project] });
    await a.sync.start(); await a.sync.flush();
    const b = device(server);
    await b.sync.start(); await b.sync.flush();
    expect(b.store.getState().propertyProjects).toEqual([project]);
    expect(b.store.getState().propertyProjects[0].sourcing.tileDocuments[0].imageDataUrl).toBe(source);
  });

  test('edits made on both devices at the same time are combined', async () => {
    const server = createServer();
    const a = device(server);
    await a.sync.start();
    await a.sync.flush();
    const b = device(server);
    await b.sync.start();
    await b.sync.flush();

    a.store.setState({ propertyIssues: [issue('from-a')] });
    b.store.setState({ propertyIssues: [issue('from-b')] });
    await a.sync.flush();
    await b.sync.flush(); // B hits a 409, merges A's issue in and retries
    await a.sync.pull();

    const ids = (items: Array<{ id: string }>) => items.map((i) => i.id).sort();
    expect(ids(server.rows.get('property.issues')!.data as any)).toEqual(['from-a', 'from-b']);
    expect(ids(a.store.getState().propertyIssues)).toEqual(['from-a', 'from-b']);
    expect(ids(b.store.getState().propertyIssues)).toEqual(['from-a', 'from-b']);
  });

  test('a deletion on one device reaches the other', async () => {
    const server = createServer();
    const a = device(server, { propertyIssues: [issue('keep'), issue('remove')] });
    await a.sync.start();
    await a.sync.flush();
    const b = device(server);
    await b.sync.start();
    await b.sync.flush();

    a.store.setState({ propertyIssues: [issue('keep')] });
    await a.sync.flush();
    await b.sync.pull();

    expect(b.store.getState().propertyIssues.map((i: any) => i.id)).toEqual(['keep']);
  });

  test('a wiped local cache never deletes the household data', async () => {
    const server = createServer();
    const memory = new Map<string, string>();
    const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); } };
    const store = createDeviceStore({ propertyIssues: [issue('a'), issue('b'), issue('c')] });
    const first = new SharedDocumentSync('family-1', store as any, server.fetchImpl, storage);
    syncs.push(first);
    await first.start();
    await first.flush();
    first.stop();

    // Same device later: the app cache was reset but the sync notes survived.
    const resetStore = createDeviceStore({ propertyIssues: [] });
    const again = new SharedDocumentSync('family-1', resetStore as any, server.fetchImpl, storage);
    syncs.push(again);
    await again.start();
    await again.flush();

    expect((server.rows.get('property.issues')!.data as any[]).map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(resetStore.getState().propertyIssues.map((i: any) => i.id)).toEqual(['a', 'b', 'c']);
  });

  test('a deletion made offline before a restart still reaches the server', async () => {
    const server = createServer();
    const memory = new Map<string, string>();
    const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); } };
    const store = createDeviceStore({ propertyIssues: [issue('a'), issue('b'), issue('c')] });
    const first = new SharedDocumentSync('family-1', store as any, server.fetchImpl, storage);
    syncs.push(first);
    await first.start();
    await first.flush();
    first.stop();

    store.setState({ propertyIssues: [issue('a'), issue('b')] }); // deleted while the app was closed/offline
    const again = new SharedDocumentSync('family-1', store as any, server.fetchImpl, storage);
    syncs.push(again);
    await again.start();
    await again.flush();

    expect((server.rows.get('property.issues')!.data as any[]).map((i) => i.id)).toEqual(['a', 'b']);
  });

  test('keeps working locally when shared storage is not set up', async () => {
    const server = createServer();
    server.setMode('unavailable');
    const a = device(server, { propertyIssues: [issue('local')] });
    await a.sync.start();
    a.store.setState({ propertyIssues: [issue('local'), issue('another')] });
    await a.sync.flush();

    expect(a.store.getState().sharedSyncStatus).toBe('unavailable');
    expect(a.store.getState().propertyIssues).toHaveLength(2);
    expect(server.rows.size).toBe(0);
  });

  test('catches up after being offline', async () => {
    const server = createServer();
    const a = device(server);
    await a.sync.start();
    await a.sync.flush();

    server.setMode('offline');
    a.store.setState({ propertyIssues: [issue('while-offline')] });
    await a.sync.flush();
    expect(a.store.getState().sharedSyncStatus).toBe('offline');

    server.setMode('ok');
    await a.sync.pull();
    await a.sync.flush();
    expect(server.rows.get('property.issues')!.data).toEqual([issue('while-offline')]);
    expect(a.store.getState().sharedSyncStatus).toBe('synced');
  });
});
