'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Files,
  Briefcase,
  Package,
} from 'lucide-react';
import { pdfQuoteExtractor } from '@/services/pdfQuoteExtractor';
import {
  ExtractedQuote,
  QuoteLineItem,
  QuoteCategory,
  PDFQuoteExtractionResult,
} from '@/types/quote.types';

interface PDFQuoteExtractorProps {
  onQuoteExtracted: (quote: ExtractedQuote) => void;
  onCancel?: () => void;
  projectName?: string;
}

type QuoteType = 'labour' | 'items' | 'combined';
type ExtractionStage = 'upload' | 'processing' | 'review' | 'error';

interface UploadedQuote {
  id: string;
  type: QuoteType;
  fileName: string;
  quote: ExtractedQuote;
  result: PDFQuoteExtractionResult;
}

const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  labour: 'Labour',
  materials: 'Materials',
  fixtures: 'Fixtures & Fittings',
  sundries: 'Sundries',
  vat: 'VAT',
  other: 'Other',
};

const CATEGORY_COLORS: Record<QuoteCategory, string> = {
  labour: 'bg-blue-100 text-blue-800',
  materials: 'bg-green-100 text-green-800',
  fixtures: 'bg-purple-100 text-purple-800',
  sundries: 'bg-yellow-100 text-yellow-800',
  vat: 'bg-gray-100 text-gray-800',
  other: 'bg-orange-100 text-orange-800',
};

const QUOTE_TYPE_LABELS: Record<QuoteType, { label: string; icon: React.ReactNode; description: string }> = {
  labour: {
    label: 'Labour Quote',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Installation, fitting, workmanship'
  },
  items: {
    label: 'Items/Materials Quote',
    icon: <Package className="w-5 h-5" />,
    description: 'Materials, fixtures, supplies'
  },
  combined: {
    label: 'Combined Quote',
    icon: <Files className="w-5 h-5" />,
    description: 'Labour and items together'
  },
};

export default function PDFQuoteExtractor({
  onQuoteExtracted,
  onCancel,
  projectName,
}: PDFQuoteExtractorProps) {
  const [stage, setStage] = useState<ExtractionStage>('upload');
  const [uploadedQuotes, setUploadedQuotes] = useState<UploadedQuote[]>([]);
  const [mergedQuote, setMergedQuote] = useState<ExtractedQuote | null>(null);
  const [processingType, setProcessingType] = useState<QuoteType | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedType, setSelectedType] = useState<QuoteType>('combined');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [newItem, setNewItem] = useState<Partial<QuoteLineItem>>({
    description: '',
    category: 'other',
    amount: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0], selectedType);
    }
  }, [selectedType]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0], selectedType);
    }
  }, [selectedType]);

  const processFile = async (file: File, type: QuoteType) => {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      setCurrentError('Please upload a PDF file');
      return;
    }

    setProcessingType(type);
    setStage('processing');
    setCurrentError(null);

    try {
      const extractionResult = await pdfQuoteExtractor.extractFromPDF(file);

      if (extractionResult.success && extractionResult.quote) {
        // Apply type-based category overrides
        let adjustedQuote = { ...extractionResult.quote };

        if (type === 'labour') {
          // Mark all items as labour unless clearly not
          adjustedQuote.lineItems = adjustedQuote.lineItems.map(item => ({
            ...item,
            category: item.category === 'fixtures' || item.category === 'materials'
              ? item.category
              : 'labour' as QuoteCategory
          }));
        } else if (type === 'items') {
          // Mark items as materials/fixtures
          adjustedQuote.lineItems = adjustedQuote.lineItems.map(item => ({
            ...item,
            category: item.category === 'labour'
              ? 'materials' as QuoteCategory
              : item.category
          }));
        }

        // Recalculate category totals
        adjustedQuote = recalculateTotals(adjustedQuote);

        const uploaded: UploadedQuote = {
          id: `upload-${Date.now()}`,
          type,
          fileName: file.name,
          quote: adjustedQuote,
          result: extractionResult,
        };

        const newQuotes = [...uploadedQuotes, uploaded];
        setUploadedQuotes(newQuotes);

        // Merge all quotes
        const merged = mergeQuotes(newQuotes);
        setMergedQuote(merged);
        setStage('review');
      } else {
        setCurrentError(extractionResult.errors.join(', ') || 'Failed to extract quote');
        setStage('upload');
      }
    } catch (error) {
      setCurrentError(error instanceof Error ? error.message : 'Failed to process PDF');
      setStage('upload');
    } finally {
      setProcessingType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const recalculateTotals = (quote: ExtractedQuote): ExtractedQuote => {
    // Calculate category totals from line items (all exc VAT)
    const categoryTotals = {
      labour: 0,
      materials: 0,
      fixtures: 0,
      sundries: 0,
      other: 0,
    };

    quote.lineItems.forEach(item => {
      // Skip VAT items if any accidentally got in
      if (item.category === 'vat') return;

      if (item.category in categoryTotals) {
        categoryTotals[item.category as keyof typeof categoryTotals] += item.amount;
      } else {
        categoryTotals.other += item.amount;
      }
    });

    // IMPORTANT: Preserve the extracted subtotal/VAT/total from the PDF
    // Only recalculate category breakdowns, not the main totals
    return {
      ...quote,
      // Keep the original subtotal/vatAmount/total from PDF extraction
      // Don't overwrite with calculated values
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
    };
  };

  const mergeQuotes = (quotes: UploadedQuote[]): ExtractedQuote => {
    if (quotes.length === 0) {
      throw new Error('No quotes to merge');
    }

    if (quotes.length === 1) {
      return quotes[0].quote;
    }

    // Use first quote as base
    const base = quotes[0].quote;

    // Merge all line items with unique IDs
    const allLineItems: QuoteLineItem[] = [];
    quotes.forEach((uq, idx) => {
      uq.quote.lineItems.forEach(item => {
        allLineItems.push({
          ...item,
          id: `${item.id}-${idx}`, // Ensure unique IDs
          notes: `From ${QUOTE_TYPE_LABELS[uq.type].label}: ${uq.fileName}`,
        });
      });
    });

    // Calculate category totals only (not main totals)
    let labourTotal = 0;
    let materialsTotal = 0;
    let fixturesTotal = 0;
    let otherTotal = 0;

    // Filter out any VAT items that might have been included
    const nonVatItems = allLineItems.filter(item => item.category !== 'vat');

    nonVatItems.forEach(item => {
      switch (item.category) {
        case 'labour':
          labourTotal += item.amount;
          break;
        case 'materials':
          materialsTotal += item.amount;
          break;
        case 'fixtures':
          fixturesTotal += item.amount;
          break;
        default:
          otherTotal += item.amount;
      }
    });

    // USE THE EXTRACTED TOTALS from the PDF, not calculated values
    const subtotal = quotes.reduce((sum, q) => sum + (q.quote.subtotal || 0), 0);
    const vatAmount = quotes.reduce((sum, q) => sum + (q.quote.vatAmount || 0), 0);
    const total = quotes.reduce((sum, q) => sum + (q.quote.total || 0), 0);
    const vatRate = Math.max(...quotes.map(q => q.quote.vatRate || 0));

    // Combine contractor names
    const contractorNames = [...new Set(quotes.map(q => q.quote.contractorName))];
    const companies = [...new Set(quotes.map(q => q.quote.company).filter(Boolean))];

    return {
      id: `merged-${Date.now()}`,
      contractorName: contractorNames.join(' + '),
      company: companies.join(' / ') || undefined,
      contactName: base.contactName,
      phone: base.phone,
      email: base.email,
      quoteDate: base.quoteDate,
      validUntil: base.validUntil,
      reference: quotes.map(q => q.quote.reference).filter(Boolean).join(', ') || undefined,
      lineItems: nonVatItems,
      subtotal,
      vatRate,
      vatAmount,
      total,
      labourTotal,
      materialsTotal,
      fixturesTotal,
      otherTotal,
      sourceFileName: quotes.map(q => q.fileName).join(', '),
      rawText: quotes.map(q => `--- ${q.fileName} ---\n${q.quote.rawText}`).join('\n\n'),
      extractedAt: new Date().toISOString(),
      confidence: Math.min(...quotes.map(q => q.quote.confidence)),
      notes: `Merged from ${quotes.length} quotes: ${quotes.map(q => QUOTE_TYPE_LABELS[q.type].label).join(', ')}`,
    };
  };

  const handleRemoveUpload = (uploadId: string) => {
    const newQuotes = uploadedQuotes.filter(q => q.id !== uploadId);
    setUploadedQuotes(newQuotes);

    if (newQuotes.length === 0) {
      setMergedQuote(null);
      setStage('upload');
    } else {
      setMergedQuote(mergeQuotes(newQuotes));
    }
  };

  const handleUpdateCategory = (itemId: string, category: QuoteCategory) => {
    if (!mergedQuote) return;
    const updated = pdfQuoteExtractor.updateItemCategory(mergedQuote, itemId, category);
    setMergedQuote(updated);
    setEditingItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!mergedQuote) return;
    const updated = pdfQuoteExtractor.removeLineItem(mergedQuote, itemId);
    setMergedQuote(updated);
  };

  const handleAddItem = () => {
    if (!mergedQuote || !newItem.description || !newItem.amount) return;

    const updated = pdfQuoteExtractor.addLineItem(mergedQuote, {
      description: newItem.description,
      category: newItem.category as QuoteCategory,
      amount: newItem.amount,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
    });

    setMergedQuote(updated);
    setNewItem({ description: '', category: 'other', amount: 0 });
    setShowAddItem(false);
  };

  const handleUpdateContractor = (field: keyof ExtractedQuote, value: string | number) => {
    if (!mergedQuote) return;
    setMergedQuote({ ...mergedQuote, [field]: value });
  };

  const handleConfirm = () => {
    if (mergedQuote) {
      onQuoteExtracted(mergedQuote);
    }
  };

  const handleReset = () => {
    setStage('upload');
    setUploadedQuotes([]);
    setMergedQuote(null);
    setCurrentError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Extract Quote from PDF</h2>
            {projectName && (
              <p className="text-sm text-gray-500 mt-1">Adding to: {projectName}</p>
            )}
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Upload Stage */}
        {(stage === 'upload' || stage === 'review') && (
          <div className="space-y-6">
            {/* Uploaded Quotes List */}
            {uploadedQuotes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Uploaded Quotes ({uploadedQuotes.length})</h3>
                <div className="grid gap-3">
                  {uploadedQuotes.map(uq => (
                    <div
                      key={uq.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        uq.type === 'labour'
                          ? 'bg-blue-50 border-blue-200'
                          : uq.type === 'items'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          uq.type === 'labour' ? 'bg-blue-100' : uq.type === 'items' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {QUOTE_TYPE_LABELS[uq.type].icon}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{QUOTE_TYPE_LABELS[uq.type].label}</p>
                          <p className="text-sm text-gray-500">{uq.fileName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold text-gray-900">{formatCurrency(uq.quote.total)}</p>
                        <button
                          onClick={() => handleRemoveUpload(uq.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Another Quote */}
            {uploadedQuotes.length < 4 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">
                  {uploadedQuotes.length === 0 ? 'Upload Quote PDF' : 'Add Another Quote'}
                </h3>

                {/* Quote Type Selection */}
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(QUOTE_TYPE_LABELS) as QuoteType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedType === type
                          ? type === 'labour'
                            ? 'border-blue-500 bg-blue-50'
                            : type === 'items'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-500 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {QUOTE_TYPE_LABELS[type].icon}
                        <span className="font-medium">{QUOTE_TYPE_LABELS[type].label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{QUOTE_TYPE_LABELS[type].description}</p>
                    </button>
                  ))}
                </div>

                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Drop your {QUOTE_TYPE_LABELS[selectedType].label.toLowerCase()} PDF here
                  </p>
                  <p className="text-xs text-gray-500 mb-3">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-4 py-2 rounded-lg text-white transition-colors ${
                      selectedType === 'labour'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : selectedType === 'items'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    Select PDF
                  </button>
                </div>

                {currentError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center text-red-700">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span className="text-sm">{currentError}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'processing' && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-900">
              Processing {processingType ? QUOTE_TYPE_LABELS[processingType].label : 'PDF'}...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Extracting quote information and line items
            </p>
          </div>
        )}

        {/* Review Stage - Merged Quote */}
        {stage === 'review' && mergedQuote && (
          <div className="space-y-6 mt-6">
            {/* Contractor Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Contractor Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contractor Name</label>
                  <input
                    type="text"
                    value={mergedQuote.contractorName}
                    onChange={(e) => handleUpdateContractor('contractorName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Company</label>
                  <input
                    type="text"
                    value={mergedQuote.company || ''}
                    onChange={(e) => handleUpdateContractor('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={mergedQuote.contactName || ''}
                    onChange={(e) => handleUpdateContractor('contactName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={mergedQuote.phone || ''}
                    onChange={(e) => handleUpdateContractor('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={mergedQuote.email || ''}
                    onChange={(e) => handleUpdateContractor('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Reference</label>
                  <input
                    type="text"
                    value={mergedQuote.reference || ''}
                    onChange={(e) => handleUpdateContractor('reference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Quote Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(mergedQuote.subtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    VAT {mergedQuote.vatRate ? `(${mergedQuote.vatRate}%)` : ''}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(mergedQuote.vatAmount || 0)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(mergedQuote.total)}
                  </p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Cost Breakdown</p>
                <div className="flex flex-wrap gap-3">
                  {mergedQuote.labourTotal !== 0 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Labour: {formatCurrency(mergedQuote.labourTotal)}
                    </span>
                  )}
                  {mergedQuote.materialsTotal !== 0 && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      Materials: {formatCurrency(mergedQuote.materialsTotal)}
                    </span>
                  )}
                  {mergedQuote.fixturesTotal !== 0 && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      Fixtures: {formatCurrency(mergedQuote.fixturesTotal)}
                    </span>
                  )}
                  {mergedQuote.otherTotal !== 0 && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                      Other: {formatCurrency(mergedQuote.otherTotal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Line Items ({mergedQuote.lineItems.length})
                </h3>
                <button
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </button>
              </div>

              {/* Add Item Form */}
              {showAddItem && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={newItem.amount || ''}
                        onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value as QuoteCategory })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddItem}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddItem(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              {mergedQuote.lineItems.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Amount</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mergedQuote.lineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.description}
                            {item.quantity && (
                              <span className="text-gray-500 ml-2">
                                ({item.quantity}x{item.unitPrice && ` @ ${formatCurrency(item.unitPrice)}`})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingItem === item.id ? (
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateCategory(item.id, e.target.value as QuoteCategory)}
                                className="text-sm px-2 py-1 border border-gray-300 rounded"
                                autoFocus
                                onBlur={() => setEditingItem(null)}
                              >
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            ) : (
                              <button
                                onClick={() => setEditingItem(item.id)}
                                className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[item.category]}`}
                              >
                                {CATEGORY_LABELS[item.category]}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No line items extracted</p>
                  <p className="text-sm text-gray-400">Add items manually using the button above</p>
                </div>
              )}
            </div>

            {/* Raw Text Toggle */}
            <div>
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                {showRawText ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showRawText ? 'Hide' : 'Show'} Extracted Text
              </button>
              {showRawText && (
                <div className="mt-2 p-4 bg-gray-100 rounded-lg max-h-48 overflow-auto">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">{mergedQuote.rawText}</pre>
                </div>
              )}
            </div>

            {/* Confidence & Source */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">Extraction Confidence:</span>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                    <div
                      className={`h-full rounded-full ${
                        mergedQuote.confidence >= 0.8 ? 'bg-green-500' : mergedQuote.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${mergedQuote.confidence * 100}%` }}
                    />
                  </div>
                  <span className={`font-medium ${
                    mergedQuote.confidence >= 0.8 ? 'text-green-600' : mergedQuote.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(mergedQuote.confidence * 100)}%
                  </span>
                </div>
              </div>
              <span className="text-gray-400 text-xs">
                From: {uploadedQuotes.length} file{uploadedQuotes.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Add Quote to Project
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Start Over
              </button>
              {onCancel && (
                <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
