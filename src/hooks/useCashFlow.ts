'use client';

import { useCallback, useEffect, useState } from 'react';
import { isCashFlow, type CashFlow } from '@/lib/budget/cashFlow';

export function useCashFlow(familyId: string | null, month: string, refreshKey = 0) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ scope: string; data: CashFlow | null; error: string; loading: boolean } | null>(null);
  const scope = `${familyId ?? ''}:${month}`;
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!familyId) return;
    const controller = new AbortController();
    setResult({ scope, data: null, error: '', loading: true });
    fetch(`/api/families/${encodeURIComponent(familyId)}/budget/cash-flow?month=${month}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load imported cash flow.');
        if (!isCashFlow(body) || body.month !== month) throw new Error('The bank summary was incomplete. Please refresh.');
        if (!controller.signal.aborted) setResult({ scope, data: body, error: '', loading: false });
      })
      .catch(reason => {
        if (!controller.signal.aborted) setResult({ scope, data: null, error: reason instanceof Error ? reason.message : 'Could not load imported cash flow.', loading: false });
      });
    return () => controller.abort();
  }, [familyId, month, scope, refreshKey, revision]);
  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
  const current = result?.scope === scope ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? '', loading: Boolean(familyId && (!current || current.loading)), refresh };
}
