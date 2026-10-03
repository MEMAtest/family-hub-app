type BalanceStatement = { openingBalance: number | null; closingBalance: number | null; statementStart: Date | null; statementEnd: Date | null };
type BalanceRow = { transactionDate: Date; amount: number; direction: string };
export const toPence = (value: number) => Math.round(value * 100);
export function reconcileStatement(statement: BalanceStatement | undefined, rows: BalanceRow[]) {
  if (!statement || statement.openingBalance === null || statement.closingBalance === null || !statement.statementStart || !statement.statementEnd) {
    return { expectedClosingBalance: null, mismatch: null, reconciled: null };
  }
  const start = statement.statementStart.toISOString().slice(0, 10);
  const end = statement.statementEnd.toISOString().slice(0, 10);
  const movement = rows.filter(row => {
    const day = row.transactionDate.toISOString().slice(0, 10);
    return day >= start && day <= end;
  }).reduce((sum, row) => sum + toPence(row.amount) * (row.direction === 'credit' ? 1 : -1), 0);
  const expected = toPence(statement.openingBalance) + movement;
  const mismatch = toPence(statement.closingBalance) - expected;
  return { expectedClosingBalance: expected / 100, mismatch: mismatch / 100, reconciled: mismatch === 0 };
}
