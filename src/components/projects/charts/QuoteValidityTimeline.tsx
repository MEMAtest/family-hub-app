'use client';

import React, { useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Calendar } from 'lucide-react';
import type { TaskQuote } from '@/types/property.types';

interface QuoteValidityTimelineProps {
  quotes: TaskQuote[];
  showExpired?: boolean;
}

interface QuoteWithValidity extends TaskQuote {
  daysRemaining: number | null;
  validityStatus: 'expired' | 'expiring_soon' | 'valid' | 'no_date';
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

export default function QuoteValidityTimeline({
  quotes,
  showExpired = true,
}: QuoteValidityTimelineProps) {
  const today = useMemo(() => new Date(), []);
  today.setHours(0, 0, 0, 0);

  // Process quotes and calculate validity status
  const processedQuotes: QuoteWithValidity[] = useMemo(() => {
    return quotes.map((quote) => {
      if (!quote.validUntil) {
        return { ...quote, daysRemaining: null, validityStatus: 'no_date' as const };
      }

      const validUntilDate = new Date(quote.validUntil);
      validUntilDate.setHours(0, 0, 0, 0);
      const diffTime = validUntilDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let validityStatus: 'expired' | 'expiring_soon' | 'valid' | 'no_date';
      if (daysRemaining < 0) {
        validityStatus = 'expired';
      } else if (daysRemaining <= 7) {
        validityStatus = 'expiring_soon';
      } else {
        validityStatus = 'valid';
      }

      return { ...quote, daysRemaining, validityStatus };
    });
  }, [quotes, today]);

  // Filter and sort quotes
  const sortedQuotes = useMemo(() => {
    let filtered = processedQuotes;
    if (!showExpired) {
      filtered = filtered.filter((q) => q.validityStatus !== 'expired');
    }

    // Sort: expiring soon first, then by days remaining, then no date last
    return filtered.sort((a, b) => {
      // Prioritize expiring soon
      if (a.validityStatus === 'expiring_soon' && b.validityStatus !== 'expiring_soon') return -1;
      if (b.validityStatus === 'expiring_soon' && a.validityStatus !== 'expiring_soon') return 1;

      // Then expired
      if (a.validityStatus === 'expired' && b.validityStatus !== 'expired') return -1;
      if (b.validityStatus === 'expired' && a.validityStatus !== 'expired') return 1;

      // No date goes last
      if (a.validityStatus === 'no_date' && b.validityStatus !== 'no_date') return 1;
      if (b.validityStatus === 'no_date' && a.validityStatus !== 'no_date') return -1;

      // Sort by days remaining
      if (a.daysRemaining !== null && b.daysRemaining !== null) {
        return a.daysRemaining - b.daysRemaining;
      }

      return 0;
    });
  }, [processedQuotes, showExpired]);

  // Calculate stats
  const stats = useMemo(() => {
    const expiringSoon = processedQuotes.filter((q) => q.validityStatus === 'expiring_soon').length;
    const expired = processedQuotes.filter((q) => q.validityStatus === 'expired').length;
    const valid = processedQuotes.filter((q) => q.validityStatus === 'valid').length;
    const noDate = processedQuotes.filter((q) => q.validityStatus === 'no_date').length;
    return { expiringSoon, expired, valid, noDate };
  }, [processedQuotes]);

  // Find earliest expiring quote
  const urgentQuote = useMemo(() => {
    const withDates = processedQuotes.filter(
      (q) => q.daysRemaining !== null && q.daysRemaining >= 0
    );
    if (withDates.length === 0) return null;
    return withDates.reduce((min, q) =>
      (q.daysRemaining ?? Infinity) < (min.daysRemaining ?? Infinity) ? q : min
    );
  }, [processedQuotes]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusConfig = (validityStatus: QuoteWithValidity['validityStatus']) => {
    switch (validityStatus) {
      case 'expired':
        return {
          bg: 'bg-red-50 dark:bg-red-500/10',
          border: 'border-red-200 dark:border-red-500/30',
          text: 'text-red-700 dark:text-red-400',
          icon: XCircle,
          label: 'Expired',
          barColor: 'bg-red-400 dark:bg-red-500',
        };
      case 'expiring_soon':
        return {
          bg: 'bg-amber-50 dark:bg-amber-500/10',
          border: 'border-amber-200 dark:border-amber-500/30',
          text: 'text-amber-700 dark:text-amber-400',
          icon: AlertTriangle,
          label: 'Expiring Soon',
          barColor: 'bg-amber-400 dark:bg-amber-500',
        };
      case 'valid':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
          border: 'border-emerald-200 dark:border-emerald-500/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: CheckCircle,
          label: 'Valid',
          barColor: 'bg-emerald-400 dark:bg-emerald-500',
        };
      case 'no_date':
        return {
          bg: 'bg-gray-50 dark:bg-slate-800',
          border: 'border-gray-200 dark:border-slate-700',
          text: 'text-gray-500 dark:text-slate-400',
          icon: Calendar,
          label: 'No Expiry Set',
          barColor: 'bg-gray-300 dark:bg-slate-600',
        };
    }
  };

  if (quotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-slate-800 rounded-lg">
        <p className="text-gray-500 dark:text-slate-400">No quotes to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.valid}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Valid</p>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.expiringSoon}</p>
          <p className="text-xs text-amber-700 dark:text-amber-300">Expiring Soon</p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</p>
          <p className="text-xs text-red-700 dark:text-red-300">Expired</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-3 text-center">
          <p className="text-2xl font-bold text-gray-600 dark:text-slate-400">{stats.noDate}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">No Date</p>
        </div>
      </div>

      {/* Urgent Alert Banner */}
      {urgentQuote && urgentQuote.validityStatus === 'expiring_soon' && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-100 dark:bg-amber-500/20 p-3 border border-amber-300 dark:border-amber-500/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Decision Required Soon
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">{urgentQuote.contractorName}</span> quote expires in{' '}
              <span className="font-semibold">
                {urgentQuote.daysRemaining === 0
                  ? 'today'
                  : urgentQuote.daysRemaining === 1
                  ? 'tomorrow'
                  : `${urgentQuote.daysRemaining} days`}
              </span>
              {' '}({currencyFormatter.format(urgentQuote.amount)})
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        {sortedQuotes.map((quote) => {
          const config = getStatusConfig(quote.validityStatus);
          const Icon = config.icon;

          // Calculate bar width for visual timeline (max 60 days)
          const maxDays = 60;
          let barWidth = 0;
          if (quote.daysRemaining !== null && quote.daysRemaining >= 0) {
            barWidth = Math.min((quote.daysRemaining / maxDays) * 100, 100);
          }

          return (
            <div
              key={quote.id}
              className={`rounded-lg border ${config.border} ${config.bg} p-3 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 ${config.text} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                        {quote.title || quote.contractorName}
                      </p>
                      {quote.title && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {quote.contractorName}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {currencyFormatter.format(quote.amount)}
                      </p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : quote.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                      }`}>
                        {quote.status}
                      </span>
                    </div>
                  </div>

                  {/* Validity Info */}
                  <div className="mt-2">
                    {quote.validUntil ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className={config.text}>
                          {quote.validityStatus === 'expired' ? (
                            <>Expired on {formatDate(quote.validUntil)}</>
                          ) : quote.daysRemaining === 0 ? (
                            <span className="font-semibold">Expires today!</span>
                          ) : quote.daysRemaining === 1 ? (
                            <span className="font-semibold">Expires tomorrow</span>
                          ) : (
                            <>
                              <span className="font-semibold">{quote.daysRemaining} days</span> remaining
                              <span className="text-gray-400 dark:text-slate-500 ml-1">
                                (until {formatDate(quote.validUntil)})
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>No expiry date set</span>
                      </div>
                    )}
                  </div>

                  {/* Visual Timeline Bar */}
                  {quote.validityStatus !== 'no_date' && quote.validityStatus !== 'expired' && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${config.barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
