'use client'

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload, X, Sparkles, FileSearch, Brain, ListChecks, Zap } from 'lucide-react';
import databaseService from '@/services/databaseService';
import { createId } from '@/utils/id';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/statementImport';
import type { StatementDirection, StatementParseResult, StatementTransaction } from '@/types/statementImport.types';

interface ImportRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: StatementDirection;
  category: string;
  include: boolean;
  importAs: 'expense' | 'income' | 'skip';
  warnings: string[];
  duplicate: boolean;
  bankCategory?: string;
  confidence?: number;
}

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string | null;
  existingIncome: any[];
  existingExpenses: any[];
  onImported: (income: any[], expenses: any[]) => void;
}

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const buildFingerprint = (date: string, description: string, amount: number) => {
  return `${date}|${normalizeText(description)}|${amount.toFixed(2)}`;
};

const extractExistingFingerprints = (items: any[]) => {
  const set = new Set<string>();
  items.forEach((item) => {
    const dateValue = item.paymentDate || item.createdAt;
    const date = dateValue ? new Date(dateValue).toISOString().split('T')[0] : '';
    const description = item.expenseName || item.incomeName || item.name || 'statement item';
    const amount = Number(item.amount || 0);
    if (date && amount) {
      set.add(buildFingerprint(date, description, amount));
    }
  });
  return set;
};

const StatementImportModal = ({
  isOpen,
  onClose,
  familyId,
  existingIncome,
  existingExpenses,
  onImported,
}: StatementImportModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<StatementParseResult | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStage, setParseStage] = useState<'reading' | 'analyzing' | 'categorizing' | 'complete'>('reading');
  const [parseProgress, setParseProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAi, setUseAi] = useState(true);
  const [localFamilyId, setLocalFamilyId] = useState<string | null>(null);

  const duplicateFingerprints = useMemo(() => ({
    income: extractExistingFingerprints(existingIncome),
    expense: extractExistingFingerprints(existingExpenses),
  }), [existingIncome, existingExpenses]);
  const isOffline = !familyId && !localFamilyId;
  const displayError = error === 'Family ID not available yet.' ? null : error;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (typeof window !== 'undefined') {
      setLocalFamilyId(localStorage.getItem('familyId'));
    }
  }, [isOpen]);

  const resetState = () => {
    setSelectedFile(null);
    setParseResult(null);
    setRows([]);
    setError(null);
    setIsParsing(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setSelectedFile(file);
    setIsParsing(true);
    setParseStage('reading');
    setParseProgress(0);

    // Animate progress through stages
    const progressInterval = setInterval(() => {
      setParseProgress(prev => {
        if (prev < 25) {
          setParseStage('reading');
          return prev + 3;
        } else if (prev < 60) {
          setParseStage('analyzing');
          return prev + 2;
        } else if (prev < 90) {
          setParseStage('categorizing');
          return prev + 1;
        }
        return prev;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('useAi', useAi ? 'true' : 'false');

      const activeFamilyId = familyId ?? localFamilyId ?? 'local';

      const response = await fetch(`/api/families/${activeFamilyId}/budget/statement-import`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setParseProgress(100);
      setParseStage('complete');
      const rawBody = await response.text();
      let payload: StatementParseResult | null = null;
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody) as StatementParseResult;
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const fallbackMessage = response.status === 404
          ? 'Statement import service unavailable (404). Please reload and try again.'
          : 'Failed to parse statement';
        const errorMessage = (payload as any)?.error || fallbackMessage;
        throw new Error(errorMessage);
      }

      if (!payload) {
        throw new Error('Unexpected response from statement service.');
      }
      const result = payload as StatementParseResult;
      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Statement parsing failed');
      }
      setParseResult(result);
      console.log('📊 Statement parse result:', {
        success: result.success,
        transactionCount: result.transactions?.length ?? 0,
        warnings: result.warnings,
        errors: result.errors,
        metadata: result.metadata,
      });

      const nextRows = (result.transactions ?? []).map((transaction: StatementTransaction) => {
        const importAs: 'income' | 'expense' = transaction.direction === 'credit' ? 'income' : 'expense';
        const fingerprint = buildFingerprint(transaction.date, transaction.description, transaction.amount);
        const duplicateSet = importAs === 'income' ? duplicateFingerprints.income : duplicateFingerprints.expense;
        const duplicate = duplicateSet.has(fingerprint);
        const warnings = [...(transaction.warnings ?? [])];
        const hasDate = Boolean(transaction.date);
        const hasAmount = transaction.amount > 0;
        if (!hasDate) warnings.push('Missing date');
        if (!hasAmount) warnings.push('Missing amount');

        return {
          id: transaction.id,
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          direction: transaction.direction,
          category: transaction.category,
          include: !duplicate && hasDate && hasAmount,
          importAs,
          warnings,
          duplicate,
          bankCategory: transaction.bankCategory,
          confidence: transaction.confidence,
        };
      });

      console.log('📋 Rows to display:', {
        total: nextRows.length,
        includedCount: nextRows.filter(r => r.include).length,
        duplicates: nextRows.filter(r => r.duplicate).length,
        missingDate: nextRows.filter(r => !r.date).length,
        sampleRow: nextRows[0],
      });
      setRows(nextRows);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Failed to parse statement');
      setParseProgress(0);
      setParseStage('reading');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const updateRow = (rowId: string, updates: Partial<ImportRow>) => {
    setRows((prev) => prev.map((row) => row.id === rowId ? { ...row, ...updates } : row));
  };

  const toggleAll = (include: boolean) => {
    setRows((prev) => prev.map((row) => ({ ...row, include })));
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setIsImporting(true);
    setError(null);

    const importedIncome: any[] = [];
    const importedExpenses: any[] = [];

    try {
      for (const row of rows) {
        if (!row.include || row.importAs === 'skip') continue;
        if (!row.date || row.amount <= 0) continue;

        if (row.importAs === 'income') {
          const payload = {
            id: createId('income'),
            incomeName: row.description,
            amount: row.amount,
            category: INCOME_CATEGORIES.includes(row.category) ? row.category : 'Other',
            isRecurring: false,
            paymentDate: row.date,
            personId: null,
          };
          const saved = await databaseService.saveBudgetIncome(payload);
          if (saved) importedIncome.push(saved);
        } else {
          const payload = {
            id: createId('expense'),
            expenseName: row.description,
            amount: row.amount,
            category: EXPENSE_CATEGORIES.includes(row.category) ? row.category : 'Other',
            isRecurring: false,
            paymentDate: row.date,
            personId: null,
          };
          const saved = await databaseService.saveBudgetExpense(payload);
          if (saved) importedExpenses.push(saved);
        }
      }

      if (importedIncome.length || importedExpenses.length) {
        onImported(importedIncome, importedExpenses);
      }
      handleClose();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to import transactions');
    } finally {
      setIsImporting(false);
    }
  };

  const totals = useMemo(() => {
    const included = rows.filter((row) => row.include && row.importAs !== 'skip');
    const incomeTotal = included.filter((row) => row.importAs === 'income').reduce((sum, row) => sum + row.amount, 0);
    const expenseTotal = included.filter((row) => row.importAs === 'expense').reduce((sum, row) => sum + row.amount, 0);
    return {
      count: included.length,
      incomeTotal,
      expenseTotal,
    };
  }, [rows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative mx-auto my-10 w-full max-w-5xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Statement</h2>
              <p className="text-sm text-gray-500">Upload CSV, PDF, or Excel to update your budget automatically.</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Statement file</span>
              {selectedFile && (
                <span className="text-xs text-gray-500">{selectedFile.name}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={(event) => setUseAi(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Sparkles className="h-3 w-3" />
                Enhance PDF parsing with AI
              </label>
              <label className="cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                Choose file
                <input
                  type="file"
                  accept=".csv,.pdf,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {displayError}
            </div>
          )}

          {!displayError && isOffline && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              Offline mode: imports are saved locally on this device.
            </div>
          )}

          {isParsing && (
            <div className="py-8 space-y-6">
              {/* Animated Header */}
              <div className="text-center">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-ping" />
                  <div className="relative flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                    {parseStage === 'reading' && <FileSearch className="h-8 w-8 text-white animate-pulse" />}
                    {parseStage === 'analyzing' && <Brain className="h-8 w-8 text-white animate-bounce" />}
                    {parseStage === 'categorizing' && <ListChecks className="h-8 w-8 text-white animate-pulse" />}
                    {parseStage === 'complete' && <Zap className="h-8 w-8 text-white" />}
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">
                  {parseStage === 'reading' && 'Reading your statement...'}
                  {parseStage === 'analyzing' && (useAi ? 'AI analyzing transactions...' : 'Processing transactions...')}
                  {parseStage === 'categorizing' && 'Categorizing expenses...'}
                  {parseStage === 'complete' && 'Almost done!'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {useAi ? 'Using AI for intelligent categorization' : 'Using pattern matching'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-sm mx-auto">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{parseProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${parseProgress}%` }}
                  />
                </div>
              </div>

              {/* Stage Indicators */}
              <div className="flex justify-center gap-8">
                <div className={`flex flex-col items-center gap-1 ${parseProgress >= 25 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <div className={`h-3 w-3 rounded-full ${parseProgress >= 25 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="text-xs">Read</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${parseProgress >= 60 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <div className={`h-3 w-3 rounded-full ${parseProgress >= 60 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="text-xs">Analyze</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${parseProgress >= 90 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <div className={`h-3 w-3 rounded-full ${parseProgress >= 90 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="text-xs">Categorize</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${parseProgress >= 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <div className={`h-3 w-3 rounded-full ${parseProgress >= 100 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="text-xs">Done</span>
                </div>
              </div>
            </div>
          )}

          {parseResult && !isParsing && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {parseResult.transactions.length} transactions found
                </div>
                <div className="text-xs text-gray-500">
                  {parseResult.metadata.bank ?? 'Bank'} · {parseResult.metadata.startDate ?? 'Unknown'} → {parseResult.metadata.endDate ?? 'Unknown'}
                </div>
              </div>

              {parseResult.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  {parseResult.warnings.join(' ')}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <button
                  onClick={() => toggleAll(true)}
                  className="rounded-md border border-gray-200 px-3 py-1 hover:bg-gray-100"
                >
                  Select all
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  className="rounded-md border border-gray-200 px-3 py-1 hover:bg-gray-100"
                >
                  Clear all
                </button>
                <span className="ml-auto">
                  Importing {totals.count} items • Income £{totals.incomeTotal.toFixed(2)} • Expenses £{totals.expenseTotal.toFixed(2)}
                </span>
              </div>

              <div className="max-h-[360px] overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2"></th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rows.map((row) => {
                      const categoryOptions = row.importAs === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                      return (
                        <tr key={row.id} className={row.duplicate ? 'bg-amber-50/40' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={row.include}
                              onChange={(event) => updateRow(row.id, { include: event.target.checked })}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-600">{row.date || 'Missing'}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800">{row.description}</div>
                            {row.bankCategory && (
                              <div className="text-[11px] text-gray-400">Bank: {row.bankCategory}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={row.importAs === 'income' ? 'text-green-600' : 'text-red-600'}>
                              £{row.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.importAs}
                              onChange={(event) => {
                                const nextImportAs = event.target.value as ImportRow['importAs'];
                                const fingerprint = buildFingerprint(row.date, row.description, row.amount);
                                const duplicateSet = nextImportAs === 'income'
                                  ? duplicateFingerprints.income
                                  : duplicateFingerprints.expense;
                                const duplicate = nextImportAs !== 'skip' && duplicateSet.has(fingerprint);
                                updateRow(row.id, {
                                  importAs: nextImportAs,
                                  duplicate,
                                  include: nextImportAs === 'skip' ? false : !duplicate,
                                });
                              }}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                            >
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                              <option value="skip">Skip</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.category}
                              onChange={(event) => updateRow(row.id, { category: event.target.value })}
                              disabled={row.importAs === 'skip'}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                            >
                              {categoryOptions.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            {row.duplicate && <span className="mr-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">Duplicate</span>}
                            {row.warnings.length > 0 && (
                              <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] text-red-700">
                                Review
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || isImporting}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import {totals.count || 0} items
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatementImportModal;
