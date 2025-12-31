'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Camera, FileImage, X, Loader2, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import { performOcr, preloadOcrWorker, terminateOcrWorker } from '@/utils/receiptOcr';
import { parseReceiptText } from '@/utils/receiptParser';
import type { OcrProcessingStage } from '@/types/receipt.types';

interface ReceiptScannerProps {
  familyId: string;
  onExpenseExtracted?: (expense: any) => void;
  onClose?: () => void;
}

interface ExtractedExpense {
  name: string;
  amount: number;
  category: string;
  paymentDate: string;
  confidence?: number;
  warnings?: string[];
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  familyId,
  onExpenseExtracted,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<OcrProcessingStage>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedExpense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Preload OCR worker on mount
  useEffect(() => {
    preloadOcrWorker();
    return () => {
      terminateOcrWorker();
    };
  }, []);

  const handleImageUpload = async (file: File) => {
    // Only support images for OCR (PDF would require different handling)
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WebP). PDF scanning is not supported in offline mode.');
      return;
    }

    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Process with local OCR (no API/AI required)
    setIsProcessing(true);
    setProcessingStage('loading');
    setOcrProgress(0);
    setError(null);
    setWarning(null);

    try {
      // Stage 1: Run OCR
      setProcessingStage('recognizing');
      const ocrResult = await performOcr(file, (progress) => {
        setOcrProgress(progress);
      });

      console.log('OCR result:', {
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime
      });

      // Stage 2: Parse the extracted text
      setProcessingStage('parsing');
      const parsed = parseReceiptText(ocrResult.text);

      console.log('Parsed receipt:', {
        name: parsed.name,
        amount: parsed.amount,
        category: parsed.category,
        confidence: parsed.confidence
      });

      // Stage 3: Set extracted data
      setProcessingStage('complete');
      setExtractedData({
        name: parsed.name,
        amount: parsed.amount,
        category: parsed.category,
        paymentDate: parsed.paymentDate,
        confidence: parsed.confidence,
        warnings: parsed.warnings,
      });

      // Show warning if low confidence
      if (parsed.confidence < 0.5) {
        setWarning('Low confidence extraction - please verify all fields');
      }
    } catch (err) {
      console.error('Error processing receipt:', err);
      setProcessingStage('error');
      setError(err instanceof Error ? err.message : 'Failed to process receipt');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (!base64String) {
          reject(new Error('Failed to read file'));
          return;
        }
        // Remove data URL prefix - send only base64
        const parts = base64String.split(',');
        if (parts.length !== 2) {
          reject(new Error('Invalid file format'));
          return;
        }
        const base64 = parts[1];
        if (!base64 || base64.length === 0) {
          reject(new Error('Empty file content'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSaveExpense = async () => {
    if (!extractedData) return;

    // Check for duplicate receipts
    if (typeof window !== 'undefined') {
      try {
        const fingerprint = `${extractedData.paymentDate}|${extractedData.name.toLowerCase().trim()}|${extractedData.amount.toFixed(2)}`;
        const existingExpenses = JSON.parse(localStorage.getItem('budgetExpenses') || '[]');

        const duplicate = existingExpenses.find((exp: any) => {
          const expDate = exp.paymentDate?.split('T')[0] || '';
          const expName = (exp.expenseName || '').toLowerCase().trim();
          const expAmount = parseFloat(exp.amount || 0).toFixed(2);
          return `${expDate}|${expName}|${expAmount}` === fingerprint;
        });

        if (duplicate) {
          const confirmed = window.confirm(
            `⚠️ Possible duplicate detected!\n\n` +
            `Existing: ${duplicate.expenseName} - £${parseFloat(duplicate.amount).toFixed(2)}\n` +
            `New: ${extractedData.name} - £${extractedData.amount.toFixed(2)}\n\n` +
            `Save anyway?`
          );
          if (!confirmed) return;
        }
      } catch (dupError) {
        console.warn('Error checking for duplicates:', dupError);
      }
    }

    try {
      const response = await fetch(`/api/families/${familyId}/budget/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseName: extractedData.name,
          amount: extractedData.amount,
          category: extractedData.category,
          paymentDate: extractedData.paymentDate,
          isRecurring: false,
          personId: null,
          isReceiptScan: true,
          receiptScanDate: new Date().toISOString()
        }),
      });

      const savedExpense = await response.json();

      if (!response.ok) {
        throw new Error(savedExpense?.error || 'Failed to save expense');
      }

      setError(null);

      // Update local cache so the dashboard reflects the new expense immediately
      if (typeof window !== 'undefined') {
        try {
          const existing = JSON.parse(localStorage.getItem('budgetExpenses') || '[]');
          const expensesArray = Array.isArray(existing) ? existing : [];
          const alreadyPresent = expensesArray.some((item: any) => item.id === savedExpense.id);

          if (!alreadyPresent) {
            expensesArray.push(savedExpense);
            localStorage.setItem('budgetExpenses', JSON.stringify(expensesArray));
          }
        } catch (storageError) {
          console.warn('Failed to update cached expenses after receipt scan:', storageError);
        }
      }

      if (onExpenseExtracted) {
        onExpenseExtracted(savedExpense);
      }

      // Close the scanner or show success
      if (onClose) {
        onClose();
      } else {
        resetScanner();
        setExtractedData(null);
      }
    } catch (err) {
      console.error('Error saving expense:', err);
      setError('Failed to save expense');
    }
  };

  const resetScanner = () => {
    setImagePreview(null);
    setExtractedData(null);
    setError(null);
    setWarning(null);
    setProcessingStage('idle');
    setOcrProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileImage className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Receipt Scanner</h2>
            <p className="text-sm text-gray-600">Upload an image or capture a photo to extract expense data</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Upload Buttons */}
      {!imagePreview && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Camera className="w-6 h-6 text-blue-600" />
            <span className="font-medium text-gray-900">Take Photo</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileImage className="w-6 h-6 text-gray-600" />
            <span className="font-medium text-gray-900">Upload Image</span>
          </button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Receipt"
              className="w-full h-auto rounded-lg border border-gray-200"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 min-w-[200px]">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-900">
                    {processingStage === 'loading' && 'Loading OCR engine...'}
                    {processingStage === 'recognizing' && `Scanning text... ${ocrProgress}%`}
                    {processingStage === 'parsing' && 'Extracting data...'}
                  </p>
                  {processingStage === 'recognizing' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    Offline processing
                  </p>
                </div>
              </div>
            )}
          </div>

          {!isProcessing && !extractedData && !error && (
            <button
              onClick={resetScanner}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Try Different Image
            </button>
          )}
        </div>
      )}

      {/* Extracted Data */}
      {extractedData && (
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">Data Extracted Successfully</h3>
              <p className="text-sm text-green-700">Review the extracted information below and save to your budget.</p>
            </div>
          </div>

          {warning && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-700">{warning}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Expense Name</label>
              <input
                type="text"
                value={extractedData.name}
                onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={extractedData.amount}
                  onChange={(e) => setExtractedData({ ...extractedData, amount: parseFloat(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select
                  value={extractedData.category}
                  onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Transport">Transport</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={extractedData.paymentDate}
                onChange={(e) => setExtractedData({ ...extractedData, paymentDate: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveExpense}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Expense
            </button>
            <button
              onClick={resetScanner}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Processing Error</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={resetScanner}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
