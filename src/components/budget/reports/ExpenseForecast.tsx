'use client';

import type { ReportFilter } from '@/types/reporting.types';
import { useFamilyStore } from '@/store/familyStore';
import { IncomeForecastPanel } from '../IncomeForecastPanel';

interface ExpenseForecastProps {
  filter: ReportFilter;
  incomeList?: unknown[];
  expenseList?: unknown[];
}

export default function ExpenseForecastComponent(_props: ExpenseForecastProps) {
  const familyId = useFamilyStore(state => state.databaseStatus.familyId);
  return <IncomeForecastPanel familyId={familyId} refreshKey={0} />;
}
