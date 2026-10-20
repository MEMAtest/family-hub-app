/**
 * Utility functions for filtering budget data by month/year
 * Handles recurring transactions properly
 */
import { plannedAmountForMonth, plannedForMonth } from '@/lib/budget/plannedMonth';

interface BudgetItem {
  id: string;
  amount: number;
  isRecurring: boolean;
  recurringFrequency?: string | null;
  recurringStartDate?: string | Date | null;
  recurringEndDate?: string | Date | null;
  paymentDate?: string | Date | null;
  createdAt?: string | Date;
  personId?: string | null;
  category?: string | null;
}

/**
 * Filter budget items (income or expenses) by month/year
 * Returns items that apply to the given month
 */
export function filterBudgetItemsByMonth<T extends BudgetItem>(
  items: T[],
  month: number,
  year: number
): T[] {
  return items.filter((item) => plannedForMonth(item, `${year}-${String(month).padStart(2, '0')}`));
}

/**
 * Deduplicate recurring items by keeping only the most recent entry
 * This handles cases where the same recurring item was saved multiple times
 */
export function deduplicateRecurringItems<T extends BudgetItem & { incomeName?: string; expenseName?: string }>(
  items: T[]
): T[] {
  // Group recurring items by name
  const recurringGroups = new Map<string, T[]>();
  const oneTimeItems: T[] = [];

  items.forEach(item => {
    if (!item.isRecurring) {
      oneTimeItems.push(item);
      return;
    }

    const name = item.incomeName || item.expenseName || 'Unnamed';
    const identity = [name.trim().toLowerCase(), item.personId || 'household', item.category || 'uncategorised'].join('|');
    if (!recurringGroups.has(identity)) {
      recurringGroups.set(identity, []);
    }
    recurringGroups.get(identity)!.push(item);
  });

  // For each group, keep only the most recently created item
  const deduplicatedRecurring: T[] = [];
  recurringGroups.forEach((group) => {
    if (group.length === 1) {
      deduplicatedRecurring.push(group[0]);
    } else {
      // Sort by createdAt descending and take the first (most recent)
      const sorted = [...group].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      deduplicatedRecurring.push(sorted[0]);
    }
  });

  return [...deduplicatedRecurring, ...oneTimeItems];
}

/**
 * Calculate monthly total from budget items
 * Applies deduplication and month filtering
 */
export function calculateMonthlyTotal<T extends BudgetItem & { incomeName?: string; expenseName?: string }>(
  items: T[],
  month: number,
  year: number
): number {
  // First deduplicate recurring items
  const deduplicated = deduplicateRecurringItems(items);

  // Then filter by month
  const monthItems = filterBudgetItemsByMonth(deduplicated, month, year);

  // Sum the amounts
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return monthItems.reduce((sum, item) => sum + plannedAmountForMonth(item, monthKey), 0);
}
