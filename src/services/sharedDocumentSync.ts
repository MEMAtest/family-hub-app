import { useFamilyStore, type FamilyState, type SharedSyncStatus } from '@/store/familyStore';
import {
  SHARED_DOCUMENTS,
  type SharedDocumentKey,
  type SharedDocumentPayload,
} from '@/lib/sharedDocuments';
import { mergeCollection, mergeObject, sameValue } from '@/lib/sharedDocumentMerge';

// Keeps household data that used to live only in this browser (property
// records, issues, kids bookmarks, digest settings) in step with the server so
// every signed-in device sees the same thing.
//
// - On start and whenever the window regains focus (and every minute), pull
//   the server copies and three-way merge them with local changes.
// - When the store changes, push the changed document after a short pause.
//   Writes carry the version they were based on; if another device got there
//   first the server refuses (409), we merge with its copy and retry.
// - If shared storage is missing (table not created yet) or the network is
//   down, the app keeps working locally and syncs later.

const FIELD_FOR_KEY: Record<SharedDocumentKey, keyof FamilyState> = {
  'property.profile': 'propertyProfile',
  'property.tasks': 'propertyTasks',
  'property.values': 'propertyValues',
  'property.areaWatch': 'areaWatchItems',
  'property.components': 'propertyComponents',
  'property.projects': 'propertyProjects',
  'property.issues': 'propertyIssues',
  'kids.marks': 'kidsEventMarks',
  'digest.preferences': 'digestPreferences',
  'kitchen.staples': 'kitchenStaples',
  'kitchen.fridgeChecks': 'fridgeChecks',
};

const KEYS = Object.keys(FIELD_FOR_KEY) as SharedDocumentKey[];
const PUSH_DELAY_MS = 1000;
const PULL_INTERVAL_MS = 60_000;
const MAX_PUSH_ATTEMPTS = 3;

interface SyncMeta {
  version: number; // server version our base corresponds to (0 = not on server)
  base: unknown | null; // last copy both sides agreed on
}

type Store = typeof useFamilyStore;

const idsOf = (value: unknown) =>
  new Set(Array.isArray(value) ? value.map((item) => (item as { id?: unknown })?.id).filter((id) => typeof id === 'string') : []);

// True when the local list still contains at least half of the remembered base.
const looksLikeLocal = (base: unknown, local: unknown) => {
  const baseIds = idsOf(base);
  if (baseIds.size === 0) return true;
  const localIds = idsOf(local);
  let kept = 0;
  baseIds.forEach((id) => { if (localIds.has(id)) kept += 1; });
  return kept * 2 >= baseIds.size;
};

export class SharedDocumentSync {
  private meta: Partial<Record<SharedDocumentKey, SyncMeta>> = {};
  private applying = false;
  private stopped = false;
  private dirty = new Set<SharedDocumentKey>();
  private inflight = new Set<SharedDocumentKey>();
  private pushTimers = new Map<SharedDocumentKey, ReturnType<typeof setTimeout>>();
  private pulling: Promise<void> | null = null;
  private cleanups: Array<() => void> = [];
  private problem: 'offline' | 'unavailable' | null = null;
  private hasPulled = false;

  constructor(
    private readonly familyId: string,
    private readonly store: Store = useFamilyStore,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null =
      typeof window !== 'undefined' ? window.localStorage : null
  ) {}

  private get storageKey() {
    return `familyHub_sharedSync_${this.familyId}`;
  }

  // A remembered base is what lets a deletion made here reach the server. If the
  // local copy no longer resembles it (the cache was cleared or reset), trusting
  // it would look like "delete everything", so drop it and merge as a first sync,
  // which never deletes. Single-value documents never trust a remembered base.
  private loadMeta() {
    let saved: Partial<Record<SharedDocumentKey, SyncMeta>> = {};
    try {
      const raw = this.storage?.getItem(this.storageKey);
      saved = raw ? JSON.parse(raw) : {};
    } catch {
      saved = {};
    }
    this.meta = {};
    for (const key of KEYS) {
      const entry = saved[key];
      if (!entry) continue;
      const base = SHARED_DOCUMENTS[key] === 'collection' && looksLikeLocal(entry.base, this.read(key)) ? entry.base : null;
      this.meta[key] = { version: entry.version, base };
    }
  }

  private saveMeta() {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(this.meta));
    } catch {
      // Storage full: bases only make merges smarter, so carry on without persisting them.
    }
  }

  private url(key?: SharedDocumentKey) {
    const base = `/api/families/${encodeURIComponent(this.familyId)}/documents`;
    return key ? `${base}/${encodeURIComponent(key)}` : `${base}?keys=${KEYS.join(',')}`;
  }

  private read(key: SharedDocumentKey) {
    return this.store.getState()[FIELD_FOR_KEY[key]] as unknown;
  }

  private apply(key: SharedDocumentKey, value: unknown) {
    this.applying = true;
    try {
      this.store.setState({ [FIELD_FOR_KEY[key]]: value } as Partial<FamilyState>);
    } finally {
      this.applying = false;
    }
  }

  private merge(key: SharedDocumentKey, base: unknown | null, local: unknown, server: unknown) {
    if (SHARED_DOCUMENTS[key] === 'collection') {
      const asList = (value: unknown) => (Array.isArray(value) ? value : []);
      return mergeCollection(base === null ? null : asList(base), asList(local), asList(server));
    }
    return mergeObject(base, local, server);
  }

  private setStatus() {
    let status: SharedSyncStatus = 'synced';
    if (this.problem) status = this.problem;
    else if (this.inflight.size > 0 || this.pulling || this.dirty.size > 0) status = 'syncing';
    if (this.store.getState().sharedSyncStatus !== status) {
      this.store.getState().setSharedSyncStatus(status);
    }
  }

  async start() {
    this.loadMeta();
    await this.pull();
    if (this.stopped) return;

    this.cleanups.push(
      this.store.subscribe((state, previous) => {
        if (this.applying || this.stopped) return;
        for (const key of KEYS) {
          const field = FIELD_FOR_KEY[key];
          if (state[field] !== previous[field]) this.markDirty(key);
        }
      })
    );

    if (typeof window !== 'undefined') {
      const onFocus = () => { void this.pull(); };
      const onVisible = () => { if (document.visibilityState === 'visible') void this.pull(); };
      const onOnline = () => { void this.pull(); };
      window.addEventListener('focus', onFocus);
      window.addEventListener('online', onOnline);
      document.addEventListener('visibilitychange', onVisible);
      const interval = setInterval(() => { void this.pull(); }, PULL_INTERVAL_MS);
      this.cleanups.push(() => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisible);
        clearInterval(interval);
      });
    }
  }

  stop() {
    this.stopped = true;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.pushTimers.forEach((timer) => clearTimeout(timer));
    this.pushTimers.clear();
  }

  // Push anything still waiting (e.g. before the page unloads or in tests).
  async flush() {
    this.pushTimers.forEach((timer) => clearTimeout(timer));
    this.pushTimers.clear();
    await Promise.all([...this.dirty].map((key) => this.push(key)));
  }

  pull(): Promise<void> {
    if (this.pulling) return this.pulling;
    this.pulling = this.doPull().finally(() => {
      this.pulling = null;
      this.setStatus();
    });
    this.setStatus();
    return this.pulling;
  }

  private async doPull() {
    let documents: Record<string, SharedDocumentPayload>;
    try {
      const response = await this.fetchImpl(this.url(), { cache: 'no-store' });
      if (response.status === 503) {
        this.problem = 'unavailable';
        return;
      }
      if (!response.ok) throw new Error(`Shared data load failed (${response.status})`);
      documents = (await response.json()).documents || {};
      this.problem = null;
    } catch (error) {
      console.warn('Shared data sync: working offline for now.', error);
      this.problem = 'offline';
      return;
    }
    if (this.stopped) return;

    for (const key of KEYS) {
      if (this.inflight.has(key)) continue; // its push will reconcile on reply
      const server = documents[key];
      const known = this.meta[key];

      if (!server) {
        // Not on the server yet: this device's copy becomes the first version.
        if (known?.version) this.meta[key] = { version: 0, base: null };
        this.markDirty(key);
        continue;
      }
      // After the first pull, an unchanged version with no local edits means nothing to do.
      // The first pull always compares, since the device may have changed while closed.
      if (this.hasPulled && known && known.version === server.version && !this.dirty.has(key)) continue;
      this.reconcile(key, server.data, server.version);
    }
    this.hasPulled = true;
    this.saveMeta();
  }

  // Merge the server copy into the store; returns true if the server still needs our changes.
  private reconcile(key: SharedDocumentKey, serverData: unknown, serverVersion: number) {
    const local = this.read(key);
    const merged = this.merge(key, this.meta[key]?.base ?? null, local, serverData);
    if (!sameValue(merged, local)) this.apply(key, merged);
    this.meta[key] = { version: serverVersion, base: serverData };
    if (sameValue(merged, serverData)) {
      this.dirty.delete(key);
      return false;
    }
    this.markDirty(key);
    return true;
  }

  private markDirty(key: SharedDocumentKey) {
    this.dirty.add(key);
    const existing = this.pushTimers.get(key);
    if (existing) clearTimeout(existing);
    this.pushTimers.set(key, setTimeout(() => {
      this.pushTimers.delete(key);
      void this.push(key);
    }, PUSH_DELAY_MS));
    this.setStatus();
  }

  private async push(key: SharedDocumentKey) {
    if (this.stopped || this.problem === 'unavailable') return;
    if (this.inflight.has(key)) return; // the running push re-checks dirty when it finishes
    this.inflight.add(key);
    this.dirty.delete(key);
    this.setStatus();

    try {
      for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt += 1) {
        const data = this.read(key);
        const baseVersion = this.meta[key]?.version ?? 0;
        let response: Response;
        try {
          response = await this.fetchImpl(this.url(key), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, baseVersion }),
          });
        } catch {
          this.problem = 'offline';
          this.dirty.add(key);
          return;
        }

        if (response.ok) {
          const saved = await response.json();
          this.meta[key] = { version: saved.version, base: data };
          this.saveMeta();
          this.problem = null;
          return;
        }
        if (response.status === 409) {
          const current = (await response.json()).current as { data: unknown; version: number } | null;
          if (!current) {
            this.meta[key] = { version: 0, base: null };
            continue;
          }
          if (!this.reconcile(key, current.data, current.version)) {
            this.saveMeta();
            return;
          }
          this.dirty.delete(key);
          continue;
        }
        if (response.status === 503) {
          this.problem = 'unavailable';
          this.dirty.add(key);
          return;
        }
        console.warn(`Shared data sync: could not save ${key} (${response.status}).`);
        this.dirty.add(key);
        return;
      }
      this.dirty.add(key);
    } finally {
      this.inflight.delete(key);
      const timer = this.pushTimers.get(key);
      if (timer) clearTimeout(timer);
      this.pushTimers.delete(key);
      // Changes made while this push was in flight go out next.
      if (this.dirty.has(key) && !this.stopped && !this.problem) this.markDirty(key);
      this.setStatus();
    }
  }
}
