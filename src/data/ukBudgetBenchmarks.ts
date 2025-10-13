/**
 * UK Household Budget Benchmarks (Monthly Averages in GBP)
 * Source references:
 *  - Office for National Statistics (ONS) Family Spending 2023 tables
 *  - MoneyHelper UK budgeting guidance (average household costs)
 * Values are rounded to the nearest £5 and adjusted for 2025 cost of living changes.
 * The dataset is intentionally static so we can run comparisons offline without network access.
 */

export interface HouseholdBenchmark {
  category: string;
  householdSize: number;
  averageMonthlySpend: number;
  notes?: string;
}

const BASE_BENCHMARKS: HouseholdBenchmark[] = [
  { category: 'Housing', householdSize: 2, averageMonthlySpend: 1050 },
  { category: 'Housing', householdSize: 3, averageMonthlySpend: 1225 },
  { category: 'Housing', householdSize: 4, averageMonthlySpend: 1380 },
  { category: 'Housing', householdSize: 5, averageMonthlySpend: 1510 },

  { category: 'Groceries', householdSize: 2, averageMonthlySpend: 420 },
  { category: 'Groceries', householdSize: 3, averageMonthlySpend: 535 },
  { category: 'Groceries', householdSize: 4, averageMonthlySpend: 640 },
  { category: 'Groceries', householdSize: 5, averageMonthlySpend: 720 },

  { category: 'Transportation', householdSize: 2, averageMonthlySpend: 320 },
  { category: 'Transportation', householdSize: 3, averageMonthlySpend: 395 },
  { category: 'Transportation', householdSize: 4, averageMonthlySpend: 460 },
  { category: 'Transportation', householdSize: 5, averageMonthlySpend: 505 },

  { category: 'Utilities', householdSize: 2, averageMonthlySpend: 220 },
  { category: 'Utilities', householdSize: 3, averageMonthlySpend: 255 },
  { category: 'Utilities', householdSize: 4, averageMonthlySpend: 290 },
  { category: 'Utilities', householdSize: 5, averageMonthlySpend: 320 },

  { category: 'Insurance', householdSize: 2, averageMonthlySpend: 135 },
  { category: 'Insurance', householdSize: 3, averageMonthlySpend: 155 },
  { category: 'Insurance', householdSize: 4, averageMonthlySpend: 175 },
  { category: 'Insurance', householdSize: 5, averageMonthlySpend: 190 },

  { category: 'Health & Fitness', householdSize: 2, averageMonthlySpend: 110 },
  { category: 'Health & Fitness', householdSize: 3, averageMonthlySpend: 135 },
  { category: 'Health & Fitness', householdSize: 4, averageMonthlySpend: 160 },
  { category: 'Health & Fitness', householdSize: 5, averageMonthlySpend: 185 },

  { category: 'Education & Childcare', householdSize: 2, averageMonthlySpend: 90 },
  { category: 'Education & Childcare', householdSize: 3, averageMonthlySpend: 220 },
  { category: 'Education & Childcare', householdSize: 4, averageMonthlySpend: 360 },
  { category: 'Education & Childcare', householdSize: 5, averageMonthlySpend: 415 },

  { category: 'Entertainment & Leisure', householdSize: 2, averageMonthlySpend: 190 },
  { category: 'Entertainment & Leisure', householdSize: 3, averageMonthlySpend: 230 },
  { category: 'Entertainment & Leisure', householdSize: 4, averageMonthlySpend: 270 },
  { category: 'Entertainment & Leisure', householdSize: 5, averageMonthlySpend: 310 },

  { category: 'Dining Out & Takeaways', householdSize: 2, averageMonthlySpend: 165 },
  { category: 'Dining Out & Takeaways', householdSize: 3, averageMonthlySpend: 205 },
  { category: 'Dining Out & Takeaways', householdSize: 4, averageMonthlySpend: 245 },
  { category: 'Dining Out & Takeaways', householdSize: 5, averageMonthlySpend: 280 },

  { category: 'Savings & Investments', householdSize: 2, averageMonthlySpend: 300 },
  { category: 'Savings & Investments', householdSize: 3, averageMonthlySpend: 360 },
  { category: 'Savings & Investments', householdSize: 4, averageMonthlySpend: 420 },
  { category: 'Savings & Investments', householdSize: 5, averageMonthlySpend: 470 }
];

/**
 * Normalise category names to align family expenses with benchmark categories.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  housing: 'Housing',
  rent: 'Housing',
  mortgage: 'Housing',
  groceries: 'Groceries',
  food: 'Groceries',
  supermarket: 'Groceries',
  transportation: 'Transportation',
  transport: 'Transportation',
  travel: 'Transportation',
  fuel: 'Transportation',
  utilities: 'Utilities',
  energy: 'Utilities',
  gas: 'Utilities',
  electricity: 'Utilities',
  water: 'Utilities',
  insurance: 'Insurance',
  'car insurance': 'Insurance',
  'home insurance': 'Insurance',
  health: 'Health & Fitness',
  healthcare: 'Health & Fitness',
  fitness: 'Health & Fitness',
  medical: 'Health & Fitness',
  childcare: 'Education & Childcare',
  education: 'Education & Childcare',
  school: 'Education & Childcare',
  entertainment: 'Entertainment & Leisure',
  leisure: 'Entertainment & Leisure',
  recreation: 'Entertainment & Leisure',
  dining: 'Dining Out & Takeaways',
  restaurants: 'Dining Out & Takeaways',
  takeaway: 'Dining Out & Takeaways',
  eating: 'Dining Out & Takeaways',
  savings: 'Savings & Investments',
  investments: 'Savings & Investments',
  retirement: 'Savings & Investments'
};

/**
 * Find the best-matching benchmark category for a given expense category label.
 */
export function mapToBenchmarkCategory(categoryLabel: string): string | null {
  if (!categoryLabel) {
    return null;
  }

  const key = categoryLabel.trim().toLowerCase();
  if (CATEGORY_ALIASES[key]) {
    return CATEGORY_ALIASES[key];
  }

  // Try partial matches (e.g., "Groceries & Household")
  const aliasEntry = Object.entries(CATEGORY_ALIASES).find(([alias]) =>
    key.includes(alias)
  );

  if (aliasEntry) {
    return aliasEntry[1];
  }

  // Capitalise first letter if no mapping found to keep original category readable
  return categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);
}

/**
 * Retrieve the benchmark spend for a category and household size.
 * Falls back to the closest household size if an exact match is not available.
 */
export function getBenchmarkSpend(category: string, householdSize: number): number | null {
  if (!category || householdSize <= 0) {
    return null;
  }

  const normalisedCategory = mapToBenchmarkCategory(category);
  if (!normalisedCategory) {
    return null;
  }

  const exactMatch = BASE_BENCHMARKS.find(
    (item) =>
      item.category === normalisedCategory &&
      item.householdSize === householdSize
  );

  if (exactMatch) {
    return exactMatch.averageMonthlySpend;
  }

  // Approximate by choosing the closest household size available
  const candidates = BASE_BENCHMARKS.filter(
    (item) => item.category === normalisedCategory
  );

  if (candidates.length === 0) {
    return null;
  }

  const bestFit = candidates.reduce((closest, current) => {
    const currentDiff = Math.abs(current.householdSize - householdSize);
    const closestDiff = Math.abs(closest.householdSize - householdSize);
    return currentDiff < closestDiff ? current : closest;
  });

  // Scale the benchmark proportionally for larger households
  const sizeRatio = householdSize / bestFit.householdSize;
  return Math.round(bestFit.averageMonthlySpend * sizeRatio);
}

export const UK_BUDGET_BENCHMARKS = BASE_BENCHMARKS;

