import { coveredByImports } from './historyForecast';

export type MoneyKind = 'spend' | 'income' | 'refund' | 'transfer' | 'review';
export type MoneyAssignment = { category: string; kind: MoneyKind };
export type MoneyTarget = { amount: number; baselineMonth: string; baselineAmount: number; createdAt: string };
export type MoneyPreferences = {
  overrides: Record<string, MoneyAssignment>;
  rules: Record<string, MoneyAssignment>;
  targets: Record<string, MoneyTarget>;
  dismissed: string[];
};

export const MONEY_CATEGORIES = [
  'Groceries', 'Dining', 'Household bills', 'Housing', 'Childcare', 'Transport', 'Shopping',
  'Subscriptions', 'Insurance', 'Health', 'Home improvements', 'Holidays', 'Education',
  'Entertainment', 'Income', 'Refunds', 'Transfers', 'Needs review',
];

export type MoneyRow = {
  id: string; accountId: string; transactionDate: string; description: string; amount: number;
  direction: string; transactionType: string; category?: string | null;
};
export type MoneyImport = { accountId: string; statementStart: string | null; statementEnd: string | null };
type ReportMonth = {
  month: string; coverage: 'complete' | 'partial' | 'none'; incoming: number | null; outgoing: number | null;
  spending: number | null; reviewAmount: number | null; transferAmount: number | null; count: number;
  categories: Array<{ category: string; amount: number; count: number }>;
};
export type MoneyReport = {
  month: string;
  months: ReportMonth[];
  categories: Array<{ category: string; amounts: Array<number | null>; counts: number[]; change: number | null; changePercent: number | null }>;
  transactions: Array<MoneyRow & { category: string; kind: MoneyKind; assignmentSource: 'suggested' | 'confirmed' | 'recorded'; reason: string; merchantKey: string }>;
  daily: Array<{ date: string; outgoing: number; spending: number; review: number; cumulative: number }>;
  pressure: { start: string; end: string; amount: number; share: number } | null;
  insights: Array<{ id: string; type: 'shopping' | 'category-rise' | 'recurring'; title: string; detail: string; category: string | null; amount: number | null; savingsStatus: 'potential' | null }>;
  reviewGroups: Array<{ key: string; description: string; ids: string[]; amount: number; count: number }>;
  targets: Array<{ category: string; amount: number; baselineAmount: number; baselineMonth: string; potentialSaving: number; observedReduction: number | null; status: 'potential' | 'observed' }>;
  sourceThrough: string | null;
};

export const emptyMoneyPreferences = (): MoneyPreferences => ({ overrides: {}, rules: {}, targets: {}, dismissed: [] });

const dayMs = 86_400_000;
const strictDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
};
const importDate = (value: string | Date | null): string | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  return strictDate(value);
};
const cents = (value: number) => Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) : 0;
const money = (value: number) => Math.round(value) / 100;
const currency = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
const monthValid = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
  && new Date(`${value}-01T00:00:00.000Z`).toISOString().slice(0, 7) === value;
const monthAt = (month: string, offset: number) => {
  const [year, index] = month.split('-').map(Number);
  return new Date(Date.UTC(year, index - 1 + offset, 1)).toISOString().slice(0, 7);
};
const monthBounds = (month: string) => ({ start: `${month}-01`, end: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10) });
const dateOffset = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00.000Z`) + days * dayMs).toISOString().slice(0, 10);
const weekday = (date: string) => new Date(`${date}T00:00:00.000Z`).getUTCDay();

// Keep account scope and narrative identity; only discard a clearly trailing card-payment marker.
export const moneyMerchantKey = (accountId: string, description: string) => {
  const normalized = description.trim().toLowerCase().replace(/\s+/g, ' ')
    .replace(/\s+(?:card payment|contactless payment|visa purchase|debit card purchase)$/i, '').trim();
  return `${accountId}:${normalized}`;
};

const RESERVED_CATEGORIES: Record<string, MoneyKind> = {
  Income: 'income', Refunds: 'refund', Transfers: 'transfer', 'Needs review': 'review',
};
const validAssignment = (value: MoneyAssignment | undefined): value is MoneyAssignment => Boolean(value
  && typeof value.category === 'string' && value.category.trim()
  && ['spend', 'income', 'refund', 'transfer', 'review'].includes(value.kind)
  && (!RESERVED_CATEGORIES[value.category] || RESERVED_CATEGORIES[value.category] === value.kind));
const assignment = (category: string, kind: MoneyKind): MoneyAssignment => ({ category, kind });
const merchantSuggestion = (description: string): MoneyAssignment | null => {
  const text = description.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(text);
  if (has(/\b(uber\s*eats|ubereats|deliveroo|just eat)\b/)) return assignment('Dining', 'spend');
  if (has(/\b(refund|reversal)\b/)) return assignment('Refunds', 'refund');
  if (has(/\b(tesco|sainsbury'?s|asda|aldi|lidl|waitrose|morrisons|co-?op|ocado)\b/)) return assignment('Groceries', 'spend');
  if (has(/\b(grandir)\b/)) return assignment('Childcare', 'spend');
  if (has(/\b(interest|credit interest)\b/)) return assignment('Income', 'income');
  if (has(/\b(netflix|spotify|disney\+|amazon prime|youtube premium)\b/)) return assignment('Subscriptions', 'spend');
  if (has(/\b(octopus(?: energy)?|british gas|edf|council tax|water bill|electricity|gas bill|broadband|virgin media|bt group)\b/)) return assignment('Household bills', 'spend');
  if (has(/\b(argos|dunelm)\b/)) return assignment('Shopping', 'spend');
  if (has(/\b(b\s*&\s*q|screwfix)\b/)) return assignment('Home improvements', 'spend');
  if (has(/\b(pharmacy|boots|superdrug|dentist|optician)\b/)) return assignment('Health', 'spend');
  if (has(/\b(uber|trainline|national rail|tfl|transport for london)\b/)) return assignment('Transport', 'spend');
  return null;
};
const compatible = (kind: MoneyKind, direction: string) => kind === 'review' || kind === 'transfer'
  || (direction === 'debit' && kind === 'spend') || (direction === 'credit' && (kind === 'income' || kind === 'refund'));
const classify = (row: MoneyRow, preferences: MoneyPreferences, key: string) => {
  let selected: MoneyAssignment | undefined;
  let source: 'suggested' | 'confirmed' | 'recorded' = 'suggested';
  let reason = 'No confident category match; review this transaction.';
  const override = preferences.overrides[row.id];
  if (row.transactionType.trim().toLowerCase() === 'transfer') {
    selected = assignment('Transfers', 'transfer'); source = 'recorded'; reason = 'Recorded as a transfer.';
  } else if (validAssignment(override)) {
    selected = override; source = 'confirmed'; reason = 'Your transaction-specific choice.';
  } else {
    const rule = preferences.rules[key];
    if (validAssignment(rule)) {
      selected = rule; source = 'confirmed'; reason = 'Your saved merchant rule.';
    } else {
      const type = row.transactionType.trim().toLowerCase();
      if (type === 'refund') { selected = assignment('Refunds', 'refund'); source = 'recorded'; reason = 'Recorded as a refund.'; }
      else if (type === 'income' || type === 'payroll') { selected = assignment('Income', 'income'); source = 'recorded'; reason = 'Recorded as income.'; }
      else selected = merchantSuggestion(row.description) ?? undefined;
      if (selected && source === 'suggested') reason = 'Suggested from the merchant description; confirm if needed.';
      if (!selected) selected = assignment('Needs review', 'review');
    }
  }
  if (!['debit', 'credit'].includes(row.direction) || !compatible(selected.kind, row.direction)) {
    return { ...assignment('Needs review', 'review'), source: 'suggested' as const, reason: 'Direction and category do not agree; review this transaction.' };
  }
  return { ...selected, source, reason };
};

const accountCoverage = (month: string, accountIds: string[], imports: MoneyImport[], rows: Array<{ accountId: string; transactionDate: string }> = []) => {
  const { start, end } = monthBounds(month);
  if (!accountIds.length) return 'none' as const;
  const complete = accountIds.map(accountId => coveredByImports(month, imports.filter(item => item.accountId === accountId)));
  if (complete.every(Boolean)) return 'complete' as const;
  const any = imports.some(item => {
    if (!accountIds.includes(item.accountId)) return false;
    const a = importDate(item.statementStart); const b = importDate(item.statementEnd);
    return Boolean(a && b && a <= b && a <= end && b >= start);
  });
  const hasRows = rows.some(row => accountIds.includes(row.accountId) && row.transactionDate.startsWith(month));
  return any || hasRows ? 'partial' as const : 'none' as const;
};
const importCoversDay = (day: string, accountId: string, imports: MoneyImport[]) => imports.some(item => {
  if (item.accountId !== accountId) return false;
  const start = importDate(item.statementStart); const end = importDate(item.statementEnd);
  return Boolean(start && end && start <= end && start <= day && end >= day);
});
const coversRange = (start: string, end: string, accountIds: string[], imports: MoneyImport[]) => accountIds.length > 0 && accountIds.every(accountId => {
  const ranges = imports.filter(item => item.accountId === accountId).flatMap(item => {
    const a = importDate(item.statementStart); const b = importDate(item.statementEnd);
    return a && b && a <= b ? [{ start: a, end: b }] : [];
  }).sort((a, b) => a.start.localeCompare(b.start));
  let next = start;
  for (const range of ranges) {
    if (range.end < next) continue;
    if (range.start > next) return false;
    if (range.end >= end) return true;
    next = dateOffset(range.end, 1);
  }
  return false;
});

const compactHash = (value: string) => {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
};

export function buildMoneyReport(input: { month: string; now?: string; accountIds: string[]; transactions: MoneyRow[]; imports: MoneyImport[]; preferences: MoneyPreferences }): MoneyReport {
  if (!monthValid(input.month)) throw new Error('month must be YYYY-MM');
  const months = [monthAt(input.month, -2), monthAt(input.month, -1), input.month];
  const nowDate = strictDate(input.now) ?? new Date().toISOString().slice(0, 10);
  const currentMonth = nowDate.slice(0, 7);
  const historyStart = monthAt(input.month, -5);
  const rangeStart = monthBounds(historyStart).start;
  const rangeEnd = monthBounds(input.month).end;
  const rows = input.transactions.flatMap(row => {
    const date = strictDate(row.transactionDate);
    if (!date || date < rangeStart || date > rangeEnd || !input.accountIds.includes(row.accountId)
      || !Number.isFinite(row.amount) || row.amount < 0) return [];
    const key = moneyMerchantKey(row.accountId, row.description);
    const result = classify(row, input.preferences, key);
    return [{ ...row, transactionDate: date, category: result.category, kind: result.kind, assignmentSource: result.source, reason: result.reason, merchantKey: key, pence: cents(row.amount) }];
  });
  const coverageAt = (key: string) => {
    const coverage = accountCoverage(key, input.accountIds, input.imports, rows);
    return key >= currentMonth && coverage === 'complete' ? 'partial' as const : coverage;
  };
  const reportMonths: ReportMonth[] = months.map(month => {
    const coverage = coverageAt(month);
    const inMonth = rows.filter(row => row.transactionDate.startsWith(month) && row.direction === 'debit' && row.kind === 'spend');
    const totals = new Map<string, { amount: number; count: number }>();
    for (const row of inMonth) {
      const item = totals.get(row.category) ?? { amount: 0, count: 0 };
      item.amount += row.pence; item.count++; totals.set(row.category, item);
    }
    const allInMonth = rows.filter(row => row.transactionDate.startsWith(month));
    const debit = allInMonth.filter(row => row.direction === 'debit');
    const credit = allInMonth.filter(row => row.direction === 'credit');
    const sum = (list: typeof rows) => list.reduce((total, row) => total + row.pence, 0);
    const spending = sum(debit.filter(row => row.kind === 'spend'));
    return {
      month, coverage,
      incoming: coverage === 'none' ? null : money(sum(credit)),
      outgoing: coverage === 'none' ? null : money(sum(debit)),
      spending: coverage === 'none' ? null : money(spending),
      reviewAmount: coverage === 'none' ? null : money(sum(debit.filter(row => row.kind === 'review'))),
      transferAmount: coverage === 'none' ? null : money(sum(debit.filter(row => row.kind === 'transfer'))),
      count: allInMonth.length,
      categories: Array.from(totals.entries()).map(([category, value]) => ({ category, amount: money(value.amount), count: value.count })).sort((a, b) => a.category.localeCompare(b.category)),
    };
  });
  const displayed = new Set(months);
  const allCategories = [...new Set(rows.filter(row => displayed.has(row.transactionDate.slice(0, 7))
    && row.direction === 'debit' && row.kind === 'spend').map(row => row.category))];
  const categories = allCategories.map(category => {
    const values = reportMonths.map(item => {
      const value = item.categories.find(entry => entry.category === category)?.amount ?? 0;
      return item.coverage === 'none' ? null : value;
    });
    const counts = reportMonths.map(item => item.categories.find(entry => entry.category === category)?.count ?? 0);
    const comparable = reportMonths[1].coverage === 'complete' && reportMonths[2].coverage === 'complete';
    const before = comparable ? values[1] : null; const current = comparable ? values[2] : null;
    const change = before !== null && current !== null ? money(cents(current) - cents(before)) : null;
    return { category, amounts: values, counts, change, changePercent: before !== null && current !== null && cents(before) > 0 && change !== null ? Math.round(change / before * 10000) / 100 : null };
  });
  const selectedRows = rows.filter(row => row.transactionDate.startsWith(input.month));
  const selectedEnd = monthBounds(input.month).end;
  const latestImportEnd = input.imports.filter(item => input.accountIds.includes(item.accountId))
    .map(item => importDate(item.statementEnd)).filter((date): date is string => Boolean(date)).sort().pop() ?? null;
  const latestSelectedTransaction = selectedRows.map(row => row.transactionDate).sort().pop() ?? null;
  const knownCandidates = [latestImportEnd, latestSelectedTransaction].filter((date): date is string => Boolean(date));
  const knownThrough = knownCandidates.length ? [knownCandidates.sort().pop()!, selectedEnd].sort()[0] : null;
  const effectiveThrough = knownThrough && input.month >= currentMonth
    ? [knownThrough, nowDate].sort()[0]
    : knownThrough;
  const days = effectiveThrough && effectiveThrough >= monthBounds(input.month).start
    ? Array.from({ length: Number(effectiveThrough.slice(-2)) }, (_, index) => dateOffset(monthBounds(input.month).start, index))
      .filter(date => input.accountIds.length > 0 && (selectedRows.some(row => row.transactionDate === date)
        || input.accountIds.every(accountId => importCoversDay(date, accountId, input.imports))))
    : [];
  let cumulative = 0;
  const daily = days.map(date => {
    const dayRows = selectedRows.filter(row => row.transactionDate === date);
    const sum = (list: typeof rows) => list.reduce((total, row) => total + row.pence, 0);
    const outgoing = sum(dayRows.filter(row => row.direction === 'debit'));
    const spending = sum(dayRows.filter(row => row.direction === 'debit' && row.kind === 'spend'));
    const review = sum(dayRows.filter(row => row.direction === 'debit' && row.kind === 'review'));
    cumulative += outgoing;
    return { date, outgoing: money(outgoing), spending: money(spending), review: money(review), cumulative: money(cumulative) };
  });
  let pressure: MoneyReport['pressure'] = null;
  if (daily.length >= 7) {
    let best = -1; let index = 0;
    const dailyByDate = new Map(daily.map(day => [day.date, day]));
    for (let i = 0; i <= days.length - 7; i++) {
      if (days[i + 6] !== dateOffset(days[i], 6)) continue;
      if (!coversRange(days[i], days[i + 6], input.accountIds, input.imports)) continue;
      const window = days.slice(i, i + 7).map(date => dailyByDate.get(date));
      if (window.some(day => !day)) continue;
      const amount = window.reduce((sum, day) => sum + cents(day!.outgoing), 0);
      if (amount > best) { best = amount; index = i; }
    }
    const total = cents(reportMonths[2].outgoing ?? 0);
    if (best > 0) pressure = { start: days[index], end: days[index + 6], amount: money(best), share: total ? Math.round(best / total * 10000) / 100 : 0 };
  }
  const insights: MoneyReport['insights'] = [];
  if (reportMonths[2].coverage === 'complete') {
    const weeks = new Map<string, typeof selectedRows>();
    for (const row of selectedRows.filter(row => row.kind === 'spend' && row.category === 'Groceries')) {
      const monday = dateOffset(row.transactionDate, (weekday(row.transactionDate) + 6) % 7 * -1);
      weeks.set(monday, [...(weeks.get(monday) ?? []), row]);
    }
    for (const [monday, purchases] of weeks) {
      const sunday = dateOffset(monday, 6);
      const dates = new Set(purchases.map(row => row.transactionDate));
      if (dates.size >= 3 && coversRange(monday, sunday, input.accountIds, input.imports)) {
        insights.push({ id: `shopping:${monday}`, type: 'shopping', title: 'Several grocery payment dates', detail: `${purchases.length} grocery payments were recorded across ${dates.size} different dates from ${monday} to ${sunday}. This describes payments, not visits or avoidable spending.`, category: 'Groceries', amount: money(purchases.reduce((sum, row) => sum + row.pence, 0)), savingsStatus: null });
      }
    }
    for (const category of categories) {
      if (category.change !== null && category.change > 0 && category.category !== 'Income' && category.category !== 'Refunds' && category.category !== 'Transfers' && category.category !== 'Needs review') {
        insights.push({ id: `rise:${category.category}:${input.month}`, type: 'category-rise', title: `${category.category} spending increased`, detail: `Recorded spending was ${currency(category.amounts[2] ?? 0)} this month, up ${currency(category.change)} from the previous complete month. This is a spending change, not a verified saving opportunity.`, category: category.category, amount: category.change, savingsStatus: null });
      }
    }
    const earlierComplete = new Set(Array.from({ length: 5 }, (_, index) => monthAt(input.month, index - 5))
      .filter(item => coverageAt(item) === 'complete'));
    for (const row of selectedRows.filter(item => item.kind === 'spend')) {
      const history = rows.filter(item => item.merchantKey === row.merchantKey && item.kind === 'spend' && item.transactionDate < `${input.month}-01` && earlierComplete.has(item.transactionDate.slice(0, 7))
        && Math.abs(item.pence - row.pence) <= Math.max(100, row.pence * 0.1)
        && Math.abs(Number(item.transactionDate.slice(-2)) - Number(row.transactionDate.slice(-2))) <= 5);
      const completeHistoryMonths = new Set(history.map(item => item.transactionDate.slice(0, 7)));
      if (completeHistoryMonths.size >= 3) {
        const id = `recurring:${compactHash(row.merchantKey)}:${input.month}`;
        if (!insights.some(item => item.id === id)) insights.push({ id, type: 'recurring', title: `${row.description} may be recurring`, detail: `Around ${currency(money(row.pence))}, near day ${Number(row.transactionDate.slice(-2))} of the month, with similar payments in ${completeHistoryMonths.size} earlier complete months. This is an estimate, not a confirmed future bill.`, category: row.category, amount: money(row.pence), savingsStatus: null });
      }
    }
  }
  const reviewMap = new Map<string, typeof selectedRows>();
  for (const row of selectedRows.filter(item => item.kind === 'review')) reviewMap.set(row.merchantKey, [...(reviewMap.get(row.merchantKey) ?? []), row]);
  const reviewGroups = Array.from(reviewMap.entries()).map(([key, group]) => ({ key, description: group[0].description, ids: group.map(item => item.id), amount: money(group.reduce((sum, item) => sum + item.pence, 0)), count: group.length }));
  const targets = Object.entries(input.preferences.targets).flatMap(([category, target]) => {
    if (!monthValid(target.baselineMonth) || !Number.isFinite(target.amount) || !Number.isFinite(target.baselineAmount)
      || Object.prototype.hasOwnProperty.call(RESERVED_CATEGORIES, category)) return [];
    const baselineComplete = target.baselineMonth >= historyStart
      && coverageAt(target.baselineMonth) === 'complete';
    const selectedComplete = reportMonths[2].coverage === 'complete';
    const observedFor = (key: string) => rows.filter(row => row.transactionDate.startsWith(key) && row.category === category && row.kind === 'spend')
      .reduce((sum, row) => sum + row.pence, 0);
    const baselineObserved = observedFor(target.baselineMonth);
    const selectedObserved = observedFor(input.month);
    const baselineMatches = baselineObserved === cents(target.baselineAmount);
    const observedReduction = input.month > target.baselineMonth && baselineComplete && selectedComplete && baselineMatches
      ? money(Math.max(0, baselineObserved - selectedObserved)) : null;
    const potentialSaving = money(Math.max(0, cents(target.baselineAmount) - cents(target.amount)));
    return [{ category, amount: target.amount, baselineAmount: target.baselineAmount, baselineMonth: target.baselineMonth, potentialSaving, observedReduction, status: observedReduction !== null && observedReduction > 0 ? 'observed' as const : 'potential' as const }];
  });
  const orderedDates = rows.map(row => row.transactionDate).sort();
  const sourceThrough = orderedDates.length ? orderedDates[orderedDates.length - 1] : null;
  return { month: input.month, months: reportMonths, categories, transactions: selectedRows.map(({ pence: _pence, ...row }) => row), daily, pressure, insights: insights.filter(item => !input.preferences.dismissed.includes(item.id)), reviewGroups, targets, sourceThrough };
}
