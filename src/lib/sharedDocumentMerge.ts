// Three-way merge for shared household documents.
//
// `base` is the last copy this device and the server agreed on. Comparing both
// sides against it tells us who changed what, so edits made on two phones at
// the same time are combined rather than one overwriting the other:
//   - changed on one side only        -> take that side (including deletions)
//   - deleted on one side, edited on the other -> keep the edit (never lose work)
//   - edited on both sides            -> the newer `updatedAt` wins, else this device
// Without a base (a device syncing for the first time) the server copy wins for
// records both sides have, and records only one side has are kept.

type Keyed = { id: string; updatedAt?: string };

// JSON with sorted keys: Postgres jsonb does not preserve key order, so plain
// JSON.stringify would report unchanged records as different.
export const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};

export const sameValue = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

const pickNewer = <T>(local: T, server: T): T => {
  const l = (local as Keyed | undefined)?.updatedAt;
  const s = (server as Keyed | undefined)?.updatedAt;
  if (l && s && s > l) return server;
  return local;
};

export const mergeCollection = <T extends Keyed>(base: T[] | null, local: T[], server: T[]): T[] => {
  const byId = (items: T[]) => new Map(items.map((item) => [item.id, item]));
  const baseMap = base ? byId(base) : null;
  const localMap = byId(local);
  const serverMap = byId(server);

  const order = [
    ...server.map((item) => item.id),
    ...local.map((item) => item.id).filter((id) => !serverMap.has(id)),
  ];

  const merged: T[] = [];
  for (const id of order) {
    const l = localMap.get(id);
    const s = serverMap.get(id);
    let result: T | undefined;

    if (!baseMap) {
      result = s ?? l;
    } else {
      const b = baseMap.get(id);
      const localChanged = !sameValue(l, b);
      const serverChanged = !sameValue(s, b);
      if (!localChanged) result = s;
      else if (!serverChanged) result = l;
      else if (!l) result = s;
      else if (!s) result = l;
      else result = pickNewer(l, s);
    }

    if (result) merged.push(result);
  }
  return merged;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const mergeObject = <T>(base: T | null, local: T, server: T): T => {
  if (base === null) return server;
  if (sameValue(local, base)) return server;
  if (sameValue(server, base)) return local;
  if (!isPlainObject(local) || !isPlainObject(server) || !isPlainObject(base)) return local;

  // Both changed: merge field by field, this device winning a clash on the same field.
  const result: Record<string, unknown> = { ...server };
  for (const field of new Set([...Object.keys(local), ...Object.keys(server), ...Object.keys(base)])) {
    const l = local[field];
    const s = server[field];
    const b = base[field];
    if (!sameValue(l, b)) result[field] = l;
    else result[field] = s;
    if (result[field] === undefined) delete result[field];
  }
  return result as T;
};
