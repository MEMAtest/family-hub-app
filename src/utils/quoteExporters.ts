import * as XLSX from 'xlsx';
import type { TaskQuote, ManualQuoteLineItem } from '@/types/property.types';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

interface ExportOptions {
  projectName?: string;
  includeLineItems?: boolean;
  includeNotes?: boolean;
}

/**
 * Export quotes to CSV format
 */
export function exportQuotesToCSV(quotes: TaskQuote[], options: ExportOptions = {}): void {
  const { projectName = 'Quotes', includeLineItems = true, includeNotes = true } = options;

  const headers = [
    'Contractor',
    'Company',
    'Title',
    'Amount',
    'Status',
    'Valid Until',
    'Phone',
    'Email',
    'Includes VAT',
    ...(includeNotes ? ['Notes', 'Terms'] : []),
    'Created Date',
  ];

  const rows = quotes.map((quote) => [
    quote.contractorName || '',
    quote.company || '',
    quote.title || '',
    (quote.amount ?? 0).toFixed(2),
    quote.status || '',
    quote.validUntil || '',
    quote.phone || '',
    quote.email || '',
    quote.includesVat ? 'Yes' : 'No',
    ...(includeNotes ? [quote.notes || '', quote.terms || ''] : []),
    quote.createdAt || '',
  ]);

  // Add line items as separate rows if requested
  if (includeLineItems) {
    const allRows: string[][] = [];

    quotes.forEach((quote) => {
      allRows.push(rows[quotes.indexOf(quote)]);
      if (quote.manualLineItems && quote.manualLineItems.length > 0) {
        quote.manualLineItems.forEach((item) => {
          allRows.push([
            '',
            '',
            `  → ${item.description || ''}`,
            item.labour?.toFixed(2) || '',
            item.materials?.toFixed(2) || '',
            (item.amount ?? 0).toFixed(2),
            '',
            '',
            '',
            '',
            '',
          ]);
        });
      }
    });

    const csvContent = [headers.join(','), ...allRows.map((row) => row.map(escapeCSV).join(','))].join('\n');
    downloadFile(csvContent, `${sanitizeFilename(projectName)}_quotes.csv`, 'text/csv');
  } else {
    const csvContent = [headers.join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n');
    downloadFile(csvContent, `${sanitizeFilename(projectName)}_quotes.csv`, 'text/csv');
  }
}

/**
 * Export quotes to Excel format with multiple sheets
 */
export function exportQuotesToExcel(quotes: TaskQuote[], options: ExportOptions = {}): void {
  const { projectName = 'Quotes' } = options;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = quotes.map((quote) => ({
    Contractor: quote.contractorName || '',
    Company: quote.company || '',
    Title: quote.title || '',
    Amount: quote.amount ?? 0,
    Status: quote.status || '',
    'Valid Until': quote.validUntil || '',
    Phone: quote.phone || '',
    Email: quote.email || '',
    'Includes VAT': quote.includesVat ? 'Yes' : 'No',
    Notes: quote.notes || '',
    Terms: quote.terms || '',
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);

  // Set column widths
  summarySheet['!cols'] = [
    { wch: 20 }, // Contractor
    { wch: 20 }, // Company
    { wch: 25 }, // Title
    { wch: 12 }, // Amount
    { wch: 10 }, // Status
    { wch: 12 }, // Valid Until
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 12 }, // Includes VAT
    { wch: 30 }, // Notes
    { wch: 30 }, // Terms
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 2: Line Items (if any quotes have them)
  const lineItemsData: Record<string, string | number>[] = [];
  quotes.forEach((quote) => {
    if (quote.manualLineItems && quote.manualLineItems.length > 0) {
      quote.manualLineItems.forEach((item) => {
        lineItemsData.push({
          Contractor: quote.contractorName || '',
          'Quote Title': quote.title || '',
          'Item Description': item.description || '',
          Labour: item.labour ?? 0,
          Materials: item.materials ?? 0,
          Total: item.amount ?? 0,
        });
      });
    }
  });

  if (lineItemsData.length > 0) {
    const lineItemsSheet = XLSX.utils.json_to_sheet(lineItemsData);
    lineItemsSheet['!cols'] = [
      { wch: 20 }, // Contractor
      { wch: 25 }, // Quote Title
      { wch: 30 }, // Item Description
      { wch: 12 }, // Labour
      { wch: 12 }, // Materials
      { wch: 12 }, // Total
    ];
    XLSX.utils.book_append_sheet(workbook, lineItemsSheet, 'Line Items');
  }

  // Sheet 3: Comparison (if multiple quotes)
  if (quotes.length > 1) {
    const sortedQuotes = [...quotes].sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
    const cheapest = sortedQuotes[0];
    const expensive = sortedQuotes[sortedQuotes.length - 1];
    const cheapestAmount = cheapest?.amount ?? 0;
    const expensiveAmount = expensive?.amount ?? 0;

    const comparisonData = [
      { Metric: 'Number of Quotes', Value: quotes.length },
      { Metric: 'Lowest Quote', Value: `${cheapest?.contractorName || 'Unknown'}: ${currencyFormatter.format(cheapestAmount)}` },
      { Metric: 'Highest Quote', Value: `${expensive?.contractorName || 'Unknown'}: ${currencyFormatter.format(expensiveAmount)}` },
      { Metric: 'Difference', Value: currencyFormatter.format(expensiveAmount - cheapestAmount) },
      { Metric: 'Percentage Difference', Value: cheapestAmount > 0 ? `${(((expensiveAmount - cheapestAmount) / cheapestAmount) * 100).toFixed(1)}%` : 'N/A' },
      { Metric: 'Average Quote', Value: currencyFormatter.format(quotes.reduce((sum, q) => sum + (q.amount ?? 0), 0) / quotes.length) },
    ];

    const comparisonSheet = XLSX.utils.json_to_sheet(comparisonData);
    comparisonSheet['!cols'] = [{ wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparison');
  }

  // Generate and download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `${sanitizeFilename(projectName)}_quotes.xlsx`);
}

/**
 * Export quotes to JSON format
 */
export function exportQuotesToJSON(quotes: TaskQuote[], options: ExportOptions = {}): void {
  const { projectName = 'Quotes' } = options;

  const amounts = quotes.map(q => q.amount ?? 0);
  const exportData = {
    exportDate: new Date().toISOString(),
    projectName,
    totalQuotes: quotes.length,
    quotes: quotes.map((quote) => ({
      id: quote.id,
      title: quote.title || null,
      contractorName: quote.contractorName || '',
      company: quote.company || null,
      amount: quote.amount ?? 0,
      currency: quote.currency || 'GBP',
      status: quote.status || 'pending',
      validUntil: quote.validUntil || null,
      includesVat: quote.includesVat ?? false,
      phone: quote.phone || null,
      email: quote.email || null,
      notes: quote.notes || null,
      terms: quote.terms || null,
      lineItems: quote.manualLineItems || [],
      createdAt: quote.createdAt || null,
    })),
    summary: quotes.length > 1 ? {
      lowestAmount: Math.min(...amounts),
      highestAmount: Math.max(...amounts),
      averageAmount: amounts.reduce((sum, a) => sum + a, 0) / quotes.length,
      totalAmount: amounts.reduce((sum, a) => sum + a, 0),
    } : undefined,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  downloadFile(jsonString, `${sanitizeFilename(projectName)}_quotes.json`, 'application/json');
}

/**
 * Export quotes to printable HTML format (can be saved as PDF via browser print)
 */
export function exportQuotesToHTML(quotes: TaskQuote[], options: ExportOptions = {}): void {
  const { projectName = 'Quotes' } = options;

  const sortedQuotes = [...quotes].sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
  const cheapest = sortedQuotes[0];
  const expensive = sortedQuotes[sortedQuotes.length - 1];
  const cheapestAmount = cheapest?.amount ?? 0;
  const expensiveAmount = expensive?.amount ?? 0;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(projectName)} - Quote Comparison</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1f2937; padding: 40px; max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #111827; }
    h2 { font-size: 18px; margin: 24px 0 12px; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .subtitle { color: #6b7280; margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card.lowest { background: #ecfdf5; border-color: #a7f3d0; }
    .summary-card.highest { background: #fef2f2; border-color: #fecaca; }
    .summary-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-card .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .summary-card.lowest .value { color: #059669; }
    .summary-card.highest .value { color: #dc2626; }
    .summary-card .contractor { font-size: 13px; color: #4b5563; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    td { font-size: 14px; }
    tr:hover { background: #f9fafb; }
    .amount { font-weight: 600; font-variant-numeric: tabular-nums; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status.pending { background: #fef3c7; color: #92400e; }
    .status.accepted { background: #d1fae5; color: #065f46; }
    .status.rejected { background: #fee2e2; color: #991b1b; }
    .line-items { margin-top: 8px; padding-left: 16px; border-left: 2px solid #e5e7eb; }
    .line-item { display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; padding: 4px 0; }
    .notes { font-size: 13px; color: #6b7280; font-style: italic; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHTML(projectName)}</h1>
  <p class="subtitle">Quote Comparison Report - Generated ${formatDate(new Date().toISOString())}</p>

  ${quotes.length > 1 ? `
  <div class="summary-grid">
    <div class="summary-card lowest">
      <div class="label">Lowest Quote</div>
      <div class="value">${currencyFormatter.format(cheapestAmount)}</div>
      <div class="contractor">${escapeHTML(cheapest?.contractorName || 'Unknown')}</div>
    </div>
    <div class="summary-card highest">
      <div class="label">Highest Quote</div>
      <div class="value">${currencyFormatter.format(expensiveAmount)}</div>
      <div class="contractor">${escapeHTML(expensive?.contractorName || 'Unknown')}</div>
    </div>
    <div class="summary-card">
      <div class="label">Potential Savings</div>
      <div class="value">${currencyFormatter.format(expensiveAmount - cheapestAmount)}</div>
      <div class="contractor">${cheapestAmount > 0 ? `${(((expensiveAmount - cheapestAmount) / cheapestAmount) * 100).toFixed(1)}%` : 'N/A'} difference</div>
    </div>
  </div>
  ` : ''}

  <h2>All Quotes (${quotes.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Contractor</th>
        <th>Amount</th>
        <th>Status</th>
        <th>Valid Until</th>
        <th>Contact</th>
      </tr>
    </thead>
    <tbody>
      ${sortedQuotes.map((quote, index) => `
        <tr>
          <td>
            <strong>${escapeHTML(quote.contractorName || 'Unknown')}</strong>
            ${quote.company && quote.company !== quote.contractorName ? `<br><span style="color: #6b7280; font-size: 13px;">${escapeHTML(quote.company)}</span>` : ''}
            ${quote.title ? `<br><span style="color: #6b7280; font-size: 13px;">${escapeHTML(quote.title)}</span>` : ''}
            ${quote.manualLineItems && quote.manualLineItems.length > 0 ? `
              <div class="line-items">
                ${quote.manualLineItems.map(item => `
                  <div class="line-item">
                    <span>${escapeHTML(item.description || '')}</span>
                    <span>${currencyFormatter.format(item.amount ?? 0)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${quote.notes ? `<p class="notes">${escapeHTML(quote.notes)}</p>` : ''}
          </td>
          <td class="amount" style="${index === 0 && quotes.length > 1 ? 'color: #059669;' : ''}">${currencyFormatter.format(quote.amount ?? 0)}${quote.includesVat === false ? '<br><span style="color: #ea580c; font-size: 12px;">+ VAT</span>' : ''}</td>
          <td><span class="status ${quote.status || 'pending'}">${quote.status || 'pending'}</span></td>
          <td>${quote.validUntil ? formatDate(quote.validUntil) : '—'}</td>
          <td>
            ${quote.phone ? `<div style="font-size: 13px;">${escapeHTML(quote.phone)}</div>` : ''}
            ${quote.email ? `<div style="font-size: 13px; color: #6b7280;">${escapeHTML(quote.email)}</div>` : ''}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Generated by Family Hub - ${new Date().toLocaleString('en-GB')}
  </div>

  <script class="no-print">
    // Auto-trigger print dialog
    // window.print();
  </script>
</body>
</html>
  `.trim();

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback: download as HTML file
    downloadFile(html, `${sanitizeFilename(projectName)}_quotes.html`, 'text/html');
  }
}

/**
 * Export a single quote comparison report
 */
export function exportComparisonReport(quotes: TaskQuote[], options: ExportOptions = {}): void {
  // Just use the HTML export which includes comparison
  exportQuotesToHTML(quotes, options);
}

// Helper functions
function escapeCSV(value: string): string {
  // Prevent CSV/formula injection attacks
  // Values starting with =, +, -, @, tab, or carriage return can be interpreted as formulas in Excel
  if (/^[=+\-@\t\r]/.test(value)) {
    value = "'" + value;  // Prefix with single quote to treat as literal text
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes("'")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
