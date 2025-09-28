'use client'

import React, { useState } from 'react';
import { ReportExportOptions } from '@/types/reporting.types';
import { Download, FileText, X, Check, Settings, Image, BarChart, FileSpreadsheet } from 'lucide-react';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: string;
  reportData: any;
}

const PDFExportModal: React.FC<PDFExportModalProps> = ({ isOpen, onClose, reportType, reportData }) => {
  const [exportOptions, setExportOptions] = useState<ReportExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeDetails: true,
    includeRecommendations: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const formatOptions = [
    {
      value: 'pdf',
      label: 'PDF Document',
      description: 'High-quality report with charts and formatting',
      icon: <FileText className="w-5 h-5" />
    },
    {
      value: 'excel',
      label: 'Excel Spreadsheet',
      description: 'Data tables with formulas and calculations',
      icon: <FileSpreadsheet className="w-5 h-5" />
    },
    {
      value: 'csv',
      label: 'CSV Data',
      description: 'Raw data for external analysis',
      icon: <BarChart className="w-5 h-5" />
    }
  ];

  const templates = [
    {
      id: 'standard',
      name: 'Standard Report',
      description: 'Clean, professional layout with all sections'
    },
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'Concise overview focusing on key insights'
    },
    {
      id: 'detailed',
      name: 'Detailed Analysis',
      description: 'Comprehensive report with all data and analysis'
    },
    {
      id: 'visual',
      name: 'Visual Dashboard',
      description: 'Chart-heavy layout with minimal text'
    }
  ];

  const getReportTitle = (type: string) => {
    const titles = {
      overview: 'Overview Dashboard',
      monthly: 'Monthly Budget Report',
      yearly: 'Yearly Financial Summary',
      category: 'Category Analysis Report',
      goals: 'Savings Goals Report',
      forecast: 'Expense Forecast Report'
    };
    return titles[type as keyof typeof titles] || 'Financial Report';
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    const progressSteps = [
      { step: 'Preparing data...', progress: 20 },
      { step: 'Generating charts...', progress: 40 },
      { step: 'Formatting report...', progress: 60 },
      { step: 'Creating document...', progress: 80 },
      { step: 'Finalizing export...', progress: 100 }
    ];

    for (const { step, progress } of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setExportProgress(progress);
    }

    // Simulate download
    const fileName = `${getReportTitle(reportType).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;

    // Create a mock download
    const element = document.createElement('a');
    element.href = '#';
    element.download = fileName;
    element.click();

    setIsExporting(false);
    setExportProgress(0);
    onClose();
  };

  const handleOptionChange = (key: keyof ReportExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Export Report</h3>
              <p className="text-sm text-gray-600">{getReportTitle(reportType)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Export Format</h4>
            <div className="grid gap-3">
              {formatOptions.map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportOptions.format === format.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={exportOptions.format === format.value}
                    onChange={(e) => handleOptionChange('format', e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={exportOptions.format === format.value ? 'text-blue-600' : 'text-gray-400'}>
                      {format.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{format.label}</div>
                      <div className="text-sm text-gray-600">{format.description}</div>
                    </div>
                  </div>
                  {exportOptions.format === format.value && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Template Selection (PDF only) */}
          {exportOptions.format === 'pdf' && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Report Template</h4>
              <select
                value={exportOptions.customTemplate || 'standard'}
                onChange={(e) => handleOptionChange('customTemplate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Content Options */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Content Options</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCharts}
                  onChange={(e) => handleOptionChange('includeCharts', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Include Charts and Graphs</span>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeDetails}
                  onChange={(e) => handleOptionChange('includeDetails', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Include Detailed Data Tables</span>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeRecommendations}
                  onChange={(e) => handleOptionChange('includeRecommendations', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Include Insights and Recommendations</span>
                </div>
              </label>
            </div>
          </div>

          {/* Preview Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Export Preview</h5>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Format: {formatOptions.find(f => f.value === exportOptions.format)?.label}</div>
              <div>Date Range: {new Date().toLocaleDateString()} - Current Period</div>
              <div>
                Sections: {[
                  'Summary',
                  exportOptions.includeCharts && 'Charts',
                  exportOptions.includeDetails && 'Detailed Data',
                  exportOptions.includeRecommendations && 'Recommendations'
                ].filter(Boolean).join(', ')}
              </div>
              <div>
                Estimated Size: {exportOptions.format === 'pdf' ? '2-5 MB' : exportOptions.format === 'excel' ? '1-2 MB' : '100-500 KB'}
              </div>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="font-medium text-blue-800">Exporting Report...</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700 mt-2">{exportProgress}% complete</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Report will be downloaded to your device
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFExportModal;