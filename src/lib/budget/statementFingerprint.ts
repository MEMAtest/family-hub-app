import { createHash } from 'crypto';

type Row = { date: string; description: string; amount: number; direction: string; balance?: number | null };
export function legacyStatementFingerprint(row: Row) {
  return createHash('sha256').update(`${row.date}|${row.description.trim().toLowerCase().replace(/\s+/g, ' ')}|${Number(row.amount).toFixed(2)}|${row.direction}`).digest('hex');
}

// Preserve existing keys while distinguishing genuine same-day equal payments.
export function statementFingerprints(rows: Row[], existing: Array<{ fingerprint: string; balance: number | null }> = []) {
  const canonical = new Map(existing.map(row => [row.fingerprint, row.balance]));
  return rows.map(row => {
    const legacy = legacyStatementFingerprint(row);
    const balance = typeof row.balance === 'number' && Number.isFinite(row.balance) ? row.balance : null;
    if (!canonical.has(legacy)) canonical.set(legacy, balance);
    const previous = canonical.get(legacy);
    if (previous === null || balance === null || Number(previous).toFixed(2) === balance.toFixed(2)) return legacy;
    return createHash('sha256').update(`${legacy}|balance:${balance.toFixed(2)}`).digest('hex');
  });
}

export function statementBoundaryBalances(rows: Row[]) {
  if (!rows.length) return { openingBalance: null, closingBalance: null };
  const descending = rows[0].date > rows[rows.length - 1].date;
  const ordered = descending ? [...rows].reverse() : rows;
  const ambiguous = rows.length > 1 && rows.every(row => row.date === rows[0].date);
  if (ambiguous || ordered.some((row, index) => index > 0 && row.date < ordered[index - 1].date)) return { openingBalance: null, closingBalance: null };
  const first = ordered[0]; const last = ordered[ordered.length - 1];
  return {
    openingBalance: first.balance == null ? null : Number((first.balance + (first.direction === 'debit' ? first.amount : -first.amount)).toFixed(2)),
    closingBalance: last.balance ?? null,
  };
}
