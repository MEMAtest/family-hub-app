'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Edit3,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { pdfQuoteExtractor } from '@/services/pdfQuoteExtractor';
import {
  ExtractedQuote,
  QuoteLineItem,
  QuoteCategory,
  PDFQuoteExtractionResult,
  CATEGORY_KEYWORDS,
} from '@/types/quote.types';

interface PDFQuoteExtractorProps {
  onQuoteExtracted: (quote: ExtractedQuote) => void;
  onCancel?: () => void;
  projectName?: string;
}

type ExtractionStage = 'upload' | 'processing' | 'review' | 'error';

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

export default function PDFQuoteExtractor({
  onQuoteExtracted,
  onCancel,
  projectName,
}: PDFQuoteExtractorProps) {
  const [stage, setStage] = useState<ExtractionStage>('upload');
  const [extractedQuote, setExtractedQuote] = useState<ExtractedQuote | null>(null);
  const [result, setResult] = useState<PDFQuoteExtractionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      setResult({
        success: false,
        extractedText: '',
        errors: ['Please upload a PDF file'],
        warnings: [],
        suggestions: [],
      });
      setStage('error');
      return;
    }

    setStage('processing');

    try {
      const extractionResult = await pdfQuoteExtractor.extractFromPDF(file);
      setResult(extractionResult);

      if (extractionResult.success && extractionResult.quote) {
        setExtractedQuote(extractionResult.quote);
        setStage('review');
      } else {
        setStage('error');
      }
    } catch (error) {
      setResult({
        success: false,
        extractedText: '',
        errors: [error instanceof Error ? error.message : 'Failed to process PDF'],
        warnings: [],
        suggestions: [],
      });
      setStage('error');
    }
  };

  const handleUpdateCategory = (itemId: string, category: QuoteCategory) => {
    if (!extractedQuote) return;
    const updated = pdfQuoteExtractor.updateItemCategory(extractedQuote, itemId, category);
    setExtractedQuote(updated);
    setEditingItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!extractedQuote) return;
    const updated = pdfQuoteExtractor.removeLineItem(extractedQuote, itemId);
    setExtractedQuote(updated);
  };

  const handleAddItem = () => {
    if (!extractedQuote || !newItem.description || !newItem.amount) return;

    const updated = pdfQuoteExtractor.addLineItem(extractedQuote, {
      description: newItem.description,
      category: newItem.category as QuoteCategory,
      amount: newItem.amount,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
    });

    setExtractedQuote(updated);
    setNewItem({ description: '', category: 'other', amount: 0 });
    setShowAddItem(false);
  };

  const handleUpdateContractor = (field: keyof ExtractedQuote, value: string | number) => {
    if (!extractedQuote) return;
    setExtractedQuote({ ...extractedQuote, [field]: value });
  };

  const handleConfirm = () => {
    if (extractedQuote) {
      onQuoteExtracted(extractedQuote);
    }
  };

  const handleReset = () => {
    setStage('upload');
    setExtractedQuote(null);
    setResult(null);
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
        {stage === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your quote PDF here
            </p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Select PDF
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Supports text-based PDFs. Scanned documents may have limited extraction.
            </p>
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'processing' && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-900">Processing PDF...</p>
            <p className="text-sm text-gray-500 mt-2">
              Extracting quote information and line items
            </p>
          </div>
        )}

        {/* Error Stage */}
        {stage === 'error' && result && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800">Extraction Failed</h3>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {result.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {result.suggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Suggestions</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Try Another File
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Review Stage */}
        {stage === 'review' && extractedQuote && (
          <div className="space-y-6">
            {/* Warnings */}
            {result?.warnings && result.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Please Review</h4>
                    <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                      {result.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Contractor Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Contractor Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Contractor Name
                  </label>
                  <input
                    type="text"
                    value={extractedQuote.contractorName}
                    onChange={(e) => handleUpdateContractor('contractorName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Company</label>
                  <input
                    type="text"
                    value={extractedQuote.company || ''}
                    onChange={(e) => handleUpdateContractor('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={extractedQuote.phone || ''}
                    onChange={(e) => handleUpdateContractor('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={extractedQuote.email || ''}
                    onChange={(e) => handleUpdateContractor('email', e.target.value)}
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
                    {formatCurrency(extractedQuote.subtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    VAT {extractedQuote.vatRate ? `(${extractedQuote.vatRate}%)` : ''}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(extractedQuote.vatAmount || 0)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(extractedQuote.total)}
                  </p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Cost Breakdown</p>
                <div className="flex flex-wrap gap-3">
                  {extractedQuote.labourTotal > 0 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Labour: {formatCurrency(extractedQuote.labourTotal)}
                    </span>
                  )}
                  {extractedQuote.materialsTotal > 0 && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      Materials: {formatCurrency(extractedQuote.materialsTotal)}
                    </span>
                  )}
                  {extractedQuote.fixturesTotal > 0 && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      Fixtures: {formatCurrency(extractedQuote.fixturesTotal)}
                    </span>
                  )}
                  {extractedQuote.otherTotal > 0 && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                      Other: {formatCurrency(extractedQuote.otherTotal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Line Items ({extractedQuote.lineItems.length})
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
                        onChange={(e) =>
                          setNewItem({ ...newItem, description: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={newItem.amount || ''}
                        onChange={(e) =>
                          setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={newItem.category}
                      onChange={(e) =>
                        setNewItem({ ...newItem, category: e.target.value as QuoteCategory })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
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
              {extractedQuote.lineItems.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Category
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                          Amount
                        </th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {extractedQuote.lineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.description}
                            {item.quantity && (
                              <span className="text-gray-500 ml-2">
                                ({item.quantity}x
                                {item.unitPrice && ` @ ${formatCurrency(item.unitPrice)}`})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingItem === item.id ? (
                              <select
                                value={item.category}
                                onChange={(e) =>
                                  handleUpdateCategory(item.id, e.target.value as QuoteCategory)
                                }
                                className="text-sm px-2 py-1 border border-gray-300 rounded"
                                autoFocus
                                onBlur={() => setEditingItem(null)}
                              >
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
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
                  <p className="text-sm text-gray-400">
                    Add items manually using the button above
                  </p>
                </div>
              )}
            </div>

            {/* Raw Text Toggle */}
            <div>
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                {showRawText ? (
                  <ChevronUp className="w-4 h-4 mr-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 mr-1" />
                )}
                {showRawText ? 'Hide' : 'Show'} Extracted Text
              </button>
              {showRawText && (
                <div className="mt-2 p-4 bg-gray-100 rounded-lg max-h-48 overflow-auto">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {extractedQuote.rawText}
                  </pre>
                </div>
              )}
            </div>

            {/* Confidence Indicator */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">Extraction Confidence:</span>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                    <div
                      className={`h-full rounded-full ${
                        extractedQuote.confidence >= 0.8
                          ? 'bg-green-500'
                          : extractedQuote.confidence >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${extractedQuote.confidence * 100}%` }}
                    />
                  </div>
                  <span
                    className={`font-medium ${
                      extractedQuote.confidence >= 0.8
                        ? 'text-green-600'
                        : extractedQuote.confidence >= 0.5
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {Math.round(extractedQuote.confidence * 100)}%
                  </span>
                </div>
              </div>
              <span className="text-gray-400">
                From: {extractedQuote.sourceFileName}
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
                Upload Different File
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
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
