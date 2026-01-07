'use client';

import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  BarChart3,
  PieChart,
  Table,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  ChevronLeft,
  Building2,
  Phone,
  Mail,
  Calendar,
  Edit2,
  PoundSterling,
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import PDFQuoteExtractor from './PDFQuoteExtractor';
import QuoteCostBreakdownChart from './charts/QuoteCostBreakdownChart';
import QuoteComparisonChart from './charts/QuoteComparisonChart';
import QuoteItemsTable from './charts/QuoteItemsTable';
import ProjectBudgetTracker from './ProjectBudgetTracker';
import { ExtractedQuote } from '@/types/quote.types';
import { PropertyProject } from '@/types/property.types';

interface ProjectQuotesViewProps {
  project: PropertyProject;
  onBack?: () => void;
  onUpdateProject?: (updates: Partial<PropertyProject>) => void;
}

type ViewTab = 'overview' | 'compare' | 'details' | 'budget';

export default function ProjectQuotesView({
  project,
  onBack,
  onUpdateProject,
}: ProjectQuotesViewProps) {
  const [quotes, setQuotes] = useState<ExtractedQuote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [acceptedQuoteId, setAcceptedQuoteId] = useState<string | null>(null);
  const [showExtractor, setShowExtractor] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');

  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const handleQuoteExtracted = useCallback((quote: ExtractedQuote) => {
    setQuotes((prev) => [...prev, quote]);
    setShowExtractor(false);
    setSelectedQuoteId(quote.id);
  }, []);

  const handleDeleteQuote = (quoteId: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    if (selectedQuoteId === quoteId) {
      setSelectedQuoteId(null);
    }
    if (acceptedQuoteId === quoteId) {
      setAcceptedQuoteId(null);
    }
  };

  const handleAcceptQuote = (quoteId: string) => {
    setAcceptedQuoteId(quoteId);
    if (onUpdateProject) {
      const quote = quotes.find((q) => q.id === quoteId);
      if (quote) {
        onUpdateProject({
          budgetMax: quote.total,
          budgetMin: quote.subtotal,
        });
      }
    }
  };

  const tabs = [
    { id: 'overview' as ViewTab, label: 'Overview', icon: FileText },
    { id: 'compare' as ViewTab, label: 'Compare', icon: BarChart3, disabled: quotes.length < 2 },
    { id: 'details' as ViewTab, label: 'Details', icon: Table, disabled: !selectedQuote },
    { id: 'budget' as ViewTab, label: 'Budget', icon: PoundSterling },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{project.title}</h1>
              <p className="text-sm text-gray-500">
                {project.category} Project &bull; {quotes.length} quote{quotes.length !== 1 ? 's' : ''} received
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExtractor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" />
            Upload Quote PDF
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-100 text-blue-600 font-medium'
                  : tab.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {quotes.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-medium text-gray-900 mb-2">
                  No Quotes Yet
                </h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Upload PDF quotes from your contractors to compare prices, view itemised
                  breakdowns, and track your project budget.
                </p>
                <button
                  onClick={() => setShowExtractor(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Upload className="w-5 h-5" />
                  Upload Your First Quote
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Quote Cards */}
                <div className="lg:col-span-2 space-y-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Received Quotes ({quotes.length})
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {quotes
                      .sort((a, b) => a.total - b.total)
                      .map((quote, index) => (
                        <div
                          key={quote.id}
                          className={`bg-white rounded-lg border-2 p-4 transition-all cursor-pointer ${
                            acceptedQuoteId === quote.id
                              ? 'border-green-500 bg-green-50'
                              : selectedQuoteId === quote.id
                              ? 'border-blue-500'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedQuoteId(quote.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {quote.contractorName}
                              </h3>
                              {quote.company && quote.company !== quote.contractorName && (
                                <p className="text-sm text-gray-500">{quote.company}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {index === 0 && quotes.length > 1 && (
                                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                  Cheapest
                                </span>
                              )}
                              {acceptedQuoteId === quote.id && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                  Accepted
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-2xl font-bold text-gray-900 mb-3">
                            {formatCurrency(quote.total)}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-3 text-xs">
                            {quote.labourTotal > 0 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                Labour: {formatCurrency(quote.labourTotal)}
                              </span>
                            )}
                            {quote.materialsTotal > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                Materials: {formatCurrency(quote.materialsTotal)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQuoteId(quote.id);
                                setActiveTab('details');
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            {acceptedQuoteId !== quote.id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptQuote(quote.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 bg-green-100 rounded hover:bg-green-200"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Accept
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAcceptedQuoteId(null);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                <XCircle className="w-3 h-3" />
                                Unaccept
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuote(quote.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* Add Quote Card */}
                    <button
                      onClick={() => setShowExtractor(true)}
                      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Add Another Quote</span>
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  {selectedQuote && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900 mb-4">
                        Cost Breakdown
                      </h3>
                      <QuoteCostBreakdownChart quote={selectedQuote} height={250} />
                    </div>
                  )}

                  {/* Contact Info */}
                  {selectedQuote && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Contact Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4 flex-shrink-0" />
                          <span>{selectedQuote.contractorName}</span>
                        </div>
                        {selectedQuote.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <a
                              href={`tel:${selectedQuote.phone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {selectedQuote.phone}
                            </a>
                          </div>
                        )}
                        {selectedQuote.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <a
                              href={`mailto:${selectedQuote.email}`}
                              className="text-blue-600 hover:underline truncate"
                            >
                              {selectedQuote.email}
                            </a>
                          </div>
                        )}
                        {selectedQuote.quoteDate && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>Quoted: {selectedQuote.quoteDate}</span>
                          </div>
                        )}
                        {selectedQuote.validUntil && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>Valid until: {selectedQuote.validUntil}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === 'compare' && quotes.length >= 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                Quote Comparison
              </h2>
              <QuoteComparisonChart quotes={quotes} height={450} showBreakdown />
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && selectedQuote && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedQuote.contractorName}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedQuote.lineItems.length} line items &bull;{' '}
                  {formatCurrency(selectedQuote.total)} total
                </p>
              </div>
              <select
                value={selectedQuoteId || ''}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.contractorName} - {formatCurrency(q.total)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Itemised Breakdown</h3>
                  <QuoteItemsTable quote={selectedQuote} />
                </div>
              </div>
              <div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Cost Distribution</h3>
                  <QuoteCostBreakdownChart quote={selectedQuote} height={300} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Project Budget</h2>
            <ProjectBudgetTracker
              project={project}
              quotes={quotes}
              acceptedQuoteId={acceptedQuoteId || undefined}
              actualExpenses={[]}
            />
          </div>
        )}
      </div>

      {/* PDF Extractor Modal */}
      <Modal
        isOpen={showExtractor}
        onClose={() => setShowExtractor(false)}
        title="Extract Quote from PDF"
        size="2xl"
      >
        <PDFQuoteExtractor
          onQuoteExtracted={handleQuoteExtracted}
          onCancel={() => setShowExtractor(false)}
          projectName={project.title}
        />
      </Modal>
    </div>
  );
}
