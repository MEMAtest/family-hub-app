/**
 * Utility functions for filtering budget data by month/year
 * Handles recurring transactions properly
 */

interface BudgetItem {
  id: string;
  amount: number;
  isRecurring: boolean;
  recurringStartDate?: string | Date | null;
  recurringEndDate?: string | Date | null;
  paymentDate?: string | Date | null;
  createdAt?: string | Date;
}

/**
 * Check if a recurring item applies to a given month/year
 */
function recurringItemAppliesToMonth(
  item: BudgetItem,
  targetMonth: number,
  targetYear: number
): boolean {
  if (!item.isRecurring) return false;

  // For recurring items, check if they were active in the target month
  const targetDate = new Date(targetYear, targetMonth - 1, 1);

  // Check start date
  if (item.recurringStartDate) {
    const startDate = new Date(item.recurringStartDate);
    if (startDate > targetDate) {
      // Item hasn't started yet
      return false;
    }
  } else if (item.createdAt) {
    // Fallback to createdAt if no recurringStartDate
    const createdDate = new Date(item.createdAt);
    if (createdDate > targetDate) {
      return false;
    }
  }

  // Check end date
  if (item.recurringEndDate) {
    const endDate = new Date(item.recurringEndDate);
    const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0); // Last day of target month
    if (endDate < lastDayOfTargetMonth) {
      // Item already ended
      return false;
    }
  }

  return true;
}

/**
 * Check if a one-time item belongs to a given month/year
 */
function oneTimeItemBelongsToMonth(
  item: BudgetItem,
  targetMonth: number,
  targetYear: number
): boolean {
  if (item.isRecurring) return false;

  // For one-time items, check paymentDate or createdAt
  const dateStr = item.paymentDate || item.createdAt;
  if (!dateStr) return false;

  const itemDate = new Date(dateStr);
  return (
    itemDate.getMonth() + 1 === targetMonth &&
    itemDate.getFullYear() === targetYear
  );
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
  return items.filter(item => {
    if (item.isRecurring) {
      return recurringItemAppliesToMonth(item, month, year);
    } else {
      return oneTimeItemBelongsToMonth(item, month, year);
    }
  });
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
    if (!recurringGroups.has(name)) {
      recurringGroups.set(name, []);
    }
    recurringGroups.get(name)!.push(item);
  });

  // For each group, keep only the most recently created item
  const deduplicatedRecurring: T[] = [];
  recurringGroups.forEach((group, name) => {
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
  return monthItems.reduce((sum, item) => sum + Number(item.amount), 0);
}
