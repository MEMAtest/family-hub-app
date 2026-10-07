import type { SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';
import { quoteSizeAssessment } from '@/lib/sourcing/quoteSize';

export default function QuoteSizeStatus({ requirement, product }: { requirement?: SourcingRequirement; product: SourcedProduct }) {
  const check = quoteSizeAssessment(requirement, product);
  const color = check.status === 'within' ? 'text-teal-700 dark:text-teal-300' : check.status === 'different' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-slate-300';
  return <p data-quote-size={check.status} className={`mt-1 break-words text-xs ${color}`}>{check.label}</p>;
}
