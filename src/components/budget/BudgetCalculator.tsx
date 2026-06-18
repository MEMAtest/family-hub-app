'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, CalendarDays, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';

interface BudgetCalculatorProps {
  totalIncome: number;
  fixedCosts: number;
  variableSpend: number;
  monthLabel: string;
  formatCurrency: (amount: number) => string;
}

const parseMoney = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInputValue = (value: number) => String(Math.max(0, Math.round(value)));

const getStatus = (surplus: number, income: number) => {
  if (surplus < 0) {
    return {
      label: 'Shortfall',
      className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200',
      guidance: 'Reduce planned spend or lower the savings target before the month starts.',
    };
  }

  const ratio = income > 0 ? surplus / income : 0;
  if (ratio >= 0.15) {
    return {
      label: 'Comfortable',
      className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200',
      guidance: 'The plan leaves useful headroom after costs, savings, and buffer.',
    };
  }

  return {
    label: 'Tight',
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200',
    guidance: 'The plan works, but day-to-day spend needs careful tracking.',
  };
};

export const BudgetCalculator = ({
  totalIncome,
  fixedCosts,
  variableSpend,
  monthLabel,
  formatCurrency,
}: BudgetCalculatorProps) => {
  const suggestedSavingsTarget = Math.max(0, Math.round(totalIncome * 0.2));
  const suggestedBuffer = Math.max(0, Math.round(totalIncome * 0.05));

  const [income, setIncome] = useState(toInputValue(totalIncome));
  const [fixed, setFixed] = useState(toInputValue(fixedCosts));
  const [variable, setVariable] = useState(toInputValue(variableSpend));
  const [savingsTarget, setSavingsTarget] = useState(toInputValue(suggestedSavingsTarget));
  const [buffer, setBuffer] = useState(toInputValue(suggestedBuffer));

  useEffect(() => {
    setIncome(toInputValue(totalIncome));
    setFixed(toInputValue(fixedCosts));
    setVariable(toInputValue(variableSpend));
    setSavingsTarget(toInputValue(Math.max(0, Math.round(totalIncome * 0.2))));
    setBuffer(toInputValue(Math.max(0, Math.round(totalIncome * 0.05))));
  }, [fixedCosts, totalIncome, variableSpend]);

  const result = useMemo(() => {
    const monthlyIncome = parseMoney(income);
    const fixedSpend = parseMoney(fixed);
    const variableCosts = parseMoney(variable);
    const targetSavings = parseMoney(savingsTarget);
    const contingency = parseMoney(buffer);
    const committed = fixedSpend + variableCosts + targetSavings + contingency;
    const surplus = monthlyIncome - committed;
    const savingsRate = monthlyIncome > 0 ? (targetSavings / monthlyIncome) * 100 : 0;
    const weeklyAllowance = surplus > 0 ? surplus / 4.33 : 0;
    const dailyAllowance = surplus > 0 ? surplus / 30 : 0;

    return {
      monthlyIncome,
      fixedSpend,
      variableCosts,
      targetSavings,
      contingency,
      committed,
      surplus,
      savingsRate,
      weeklyAllowance,
      dailyAllowance,
      status: getStatus(surplus, monthlyIncome),
    };
  }, [buffer, fixed, income, savingsTarget, variable]);

  const inputs = [
    { label: 'Monthly income', value: income, onChange: setIncome, icon: TrendingUp },
    { label: 'Fixed costs', value: fixed, onChange: setFixed, icon: CalendarDays },
    { label: 'Variable spend', value: variable, onChange: setVariable, icon: TrendingDown },
    { label: 'Savings target', value: savingsTarget, onChange: setSavingsTarget, icon: PiggyBank },
    { label: 'Buffer', value: buffer, onChange: setBuffer, icon: Calculator },
  ];

  return (
    <section className="px-4 pb-6 lg:px-0" aria-labelledby="budget-calculator-heading">
      <div className="surface-card rounded-xl border border-[#dde5e0] p-4 dark:border-slate-800 md:p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eaf1e7] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#147c72] dark:bg-[#147c72]/20 dark:text-[#56c6b8]">
              <Calculator className="h-3.5 w-3.5" />
              Monthly planner
            </div>
            <h2 id="budget-calculator-heading" className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Budget Calculator
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Plan {monthLabel} without changing saved income or expense records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIncome(toInputValue(totalIncome));
              setFixed(toInputValue(fixedCosts));
              setVariable(toInputValue(variableSpend));
              setSavingsTarget(toInputValue(suggestedSavingsTarget));
              setBuffer(toInputValue(suggestedBuffer));
            }}
            className="inline-flex items-center justify-center rounded-md border border-[#dde5e0] px-3 py-2 text-sm font-semibold text-[#18221f] transition hover:bg-[#eaf1e7] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset to month
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {inputs.map(({ label, value, onChange, icon: Icon }) => (
              <label key={label} className="block rounded-lg border border-gray-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  <Icon className="h-4 w-4 text-[#147c72] dark:text-[#56c6b8]" />
                  {label}
                </span>
                <div className="flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-[#147c72]/30 dark:border-slate-700 dark:bg-slate-950">
                  <span className="mr-2 text-sm font-semibold text-gray-500 dark:text-slate-400">GBP</span>
                  <input
                    aria-label={label}
                    type="number"
                    min="0"
                    step="10"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full bg-transparent text-right text-base font-semibold text-gray-900 outline-none dark:text-slate-100"
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-[#dde5e0] bg-[#f8faf6] p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <div className={`mb-4 rounded-lg border px-3 py-2 text-sm font-semibold ${result.status.className}`}>
              {result.status.label}: {result.status.guidance}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Surplus</p>
                <p className={`mt-1 text-xl font-bold ${result.surplus >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {formatCurrency(result.surplus)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Committed</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(result.committed)}</p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Weekly allowance</p>
                <p className="mt-1 text-lg font-bold text-[#147c72] dark:text-[#56c6b8]">{formatCurrency(result.weeklyAllowance)}</p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Daily allowance</p>
                <p className="mt-1 text-lg font-bold text-[#147c72] dark:text-[#56c6b8]">{formatCurrency(result.dailyAllowance)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white p-3 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-slate-300">Savings rate</span>
                <span className="font-bold text-gray-900 dark:text-slate-100">{result.savingsRate.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-[#147c72]"
                  style={{ width: `${Math.min(Math.max(result.savingsRate, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BudgetCalculator;
