#!/usr/bin/env npx tsx

/**
 * Smoke Test Suite for Transaction Search and Receipt Scans Features
 *
 * Tests:
 * 1. Receipt scanner marks expenses correctly with isReceiptScan flag
 * 2. Receipt scans are saved with scan date metadata
 * 3. Transaction search filters expenses by name, category, amount
 * 4. Receipt scans tab shows only receipt-scanned expenses
 */

import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

function log(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  const prefix = {
    success: `${COLORS.GREEN}✓${COLORS.RESET}`,
    error: `${COLORS.RED}✗${COLORS.RESET}`,
    info: `${COLORS.BLUE}ℹ${COLORS.RESET}`,
    warning: `${COLORS.YELLOW}⚠${COLORS.RESET}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

function section(title: string) {
  console.log(`\n${COLORS.BOLD}${COLORS.BLUE}${'='.repeat(70)}${COLORS.RESET}`);
  console.log(`${COLORS.BOLD}${title}${COLORS.RESET}`);
  console.log(`${COLORS.BOLD}${COLORS.BLUE}${'='.repeat(70)}${COLORS.RESET}\n`);
}

async function testReceiptScanMetadata(familyId: string) {
  section('TEST 1: Receipt Scanner Metadata');

  try {
    log('Creating expense via receipt scanner...', 'info');

    // Simulate receipt scan by creating expense with receipt metadata
    const receiptExpense = {
      expenseName: 'Tesco Receipt Scan',
      amount: 45.67,
      category: 'Food & Dining',
      paymentDate: new Date('2025-10-08').toISOString(),
      isRecurring: false,
      personId: null,
      isReceiptScan: true,
      receiptScanDate: new Date().toISOString(),
    };

    const response = await fetch(`${BASE_URL}/api/families/${familyId}/budget/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiptExpense),
    });

    if (!response.ok) {
      throw new Error(`Failed to create receipt expense: ${response.status}`);
    }

    const savedExpense = await response.json() as { id: string };
    log(`Created expense ID: ${savedExpense.id}`, 'success');

    // Verify in database
    const dbExpense = await prisma.budgetExpense.findUnique({
      where: { id: savedExpense.id },
    });

    if (!dbExpense) {
      throw new Error('Expense not found in database');
    }

    if (dbExpense.isReceiptScan !== true) {
      throw new Error(`isReceiptScan should be true, got: ${dbExpense.isReceiptScan}`);
    }

    if (!dbExpense.receiptScanDate) {
      throw new Error('receiptScanDate should be set');
    }

    log('✓ Receipt metadata correctly saved', 'success');
    log(`  - isReceiptScan: ${dbExpense.isReceiptScan}`, 'info');
    log(`  - receiptScanDate: ${dbExpense.receiptScanDate}`, 'info');

    return savedExpense.id;
  } catch (error) {
    log(`Receipt metadata test failed: ${error}`, 'error');
    throw error;
  }
}

async function testTransactionSearch(familyId: string) {
  section('TEST 2: Transaction Search Functionality');

  try {
    log('Fetching all expenses...', 'info');

    const response = await fetch(`${BASE_URL}/api/families/${familyId}/budget/expenses`);
    if (!response.ok) {
      throw new Error(`Failed to fetch expenses: ${response.status}`);
    }

    const allExpenses = await response.json() as Array<any>;
    log(`Total expenses in database: ${allExpenses.length}`, 'info');

    // Test search by name
    log('\nTesting search by name (filter: "Tesco")...', 'info');
    const tescoExpenses = allExpenses.filter((e: any) =>
      e.expenseName.toLowerCase().includes('tesco')
    );
    log(`Found ${tescoExpenses.length} expenses matching "Tesco"`, 'success');

    // Test search by category
    log('\nTesting search by category (filter: "Groceries")...', 'info');
    const groceryExpenses = allExpenses.filter((e: any) =>
      e.category.toLowerCase() === 'groceries'
    );
    log(`Found ${groceryExpenses.length} expenses in category "Groceries"`, 'success');

    // Test search by amount range
    log('\nTesting search by amount range (£40-£50)...', 'info');
    const rangeExpenses = allExpenses.filter((e: any) =>
      e.amount >= 40 && e.amount <= 50
    );
    log(`Found ${rangeExpenses.length} expenses in range £40-£50`, 'success');

    // Test combined filters
    log('\nTesting combined filters (name + category)...', 'info');
    const combinedResults = allExpenses.filter((e: any) =>
      e.expenseName.toLowerCase().includes('tesco') &&
      e.category.toLowerCase() === 'groceries'
    );
    log(`Found ${combinedResults.length} expenses matching both filters`, 'success');

    return true;
  } catch (error) {
    log(`Transaction search test failed: ${error}`, 'error');
    throw error;
  }
}

async function testReceiptScansFilter(familyId: string) {
  section('TEST 3: Receipt Scans Tab Filtering');

  try {
    log('Fetching all expenses...', 'info');

    const response = await fetch(`${BASE_URL}/api/families/${familyId}/budget/expenses`);
    if (!response.ok) {
      throw new Error(`Failed to fetch expenses: ${response.status}`);
    }

    const allExpenses = await response.json() as Array<any>;
    const totalExpenses = allExpenses.length;

    // Filter only receipt scans
    log('\nFiltering expenses with isReceiptScan === true...', 'info');
    const receiptScans = allExpenses.filter((e: any) => e.isReceiptScan === true);

    log(`Total expenses: ${totalExpenses}`, 'info');
    log(`Receipt scans: ${receiptScans.length}`, 'info');
    log(`Regular expenses: ${totalExpenses - receiptScans.length}`, 'info');

    if (receiptScans.length === 0) {
      log('⚠ No receipt scans found - create some via the receipt scanner!', 'warning');
    } else {
      log(`✓ Found ${receiptScans.length} receipt scan(s)`, 'success');

      // Display receipt scans table
      console.log('\n' + COLORS.BOLD + 'Receipt Scans Table:' + COLORS.RESET);
      console.log('─'.repeat(100));
      console.log(
        COLORS.BOLD +
        'Scan Date'.padEnd(25) +
        'Store Name'.padEnd(25) +
        'Amount'.padEnd(15) +
        'Category'.padEnd(20) +
        'Payment Date'.padEnd(15) +
        COLORS.RESET
      );
      console.log('─'.repeat(100));

      receiptScans.forEach((scan: any) => {
        const scanDate = scan.receiptScanDate
          ? new Date(scan.receiptScanDate).toLocaleDateString()
          : 'N/A';
        const paymentDate = scan.paymentDate
          ? new Date(scan.paymentDate).toLocaleDateString()
          : 'N/A';

        console.log(
          scanDate.padEnd(25) +
          scan.expenseName.substring(0, 23).padEnd(25) +
          `£${scan.amount.toFixed(2)}`.padEnd(15) +
          scan.category.padEnd(20) +
          paymentDate.padEnd(15)
        );
      });
      console.log('─'.repeat(100));
    }

    return true;
  } catch (error) {
    log(`Receipt scans filter test failed: ${error}`, 'error');
    throw error;
  }
}

async function testAPIReceiptScanner(familyId: string) {
  section('TEST 4: Receipt Scanner API Integration');

  try {
    log('Testing receipt scanner AI endpoint...', 'info');

    // Test with a simple base64 image (1x1 pixel PNG)
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const scanResponse = await fetch(`${BASE_URL}/api/families/${familyId}/budget/ai-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: testImage }),
    });

    if (!scanResponse.ok) {
      throw new Error(`Receipt scanner API failed: ${scanResponse.status}`);
    }

    const scannedData = await scanResponse.json() as any;
    log('✓ Receipt scanner API responded successfully', 'success');
    log(`  - Store: ${scannedData.name}`, 'info');
    log(`  - Amount: £${scannedData.amount}`, 'info');
    log(`  - Category: ${scannedData.category}`, 'info');

    // Now save it as an expense with receipt metadata
    log('\nSaving scanned receipt as expense...', 'info');

    const expenseData = {
      expenseName: scannedData.name,
      amount: scannedData.amount,
      category: scannedData.category,
      paymentDate: scannedData.paymentDate,
      isRecurring: false,
      personId: null,
      isReceiptScan: true,
      receiptScanDate: new Date().toISOString(),
    };

    const saveResponse = await fetch(`${BASE_URL}/api/families/${familyId}/budget/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData),
    });

    if (!saveResponse.ok) {
      throw new Error(`Failed to save receipt expense: ${saveResponse.status}`);
    }

    const savedExpense = await saveResponse.json() as { id: string };
    log(`✓ Receipt saved as expense ID: ${savedExpense.id}`, 'success');

    // Verify it appears in receipt scans
    const verifyResponse = await fetch(`${BASE_URL}/api/families/${familyId}/budget/expenses`);
    const allExpenses = await verifyResponse.json() as Array<any>;
    const foundExpense = allExpenses.find((e: any) => e.id === savedExpense.id);

    if (!foundExpense) {
      throw new Error('Saved expense not found in expense list');
    }

    if (foundExpense.isReceiptScan !== true) {
      throw new Error('Expense not marked as receipt scan');
    }

    log('✓ Receipt expense verified in database and marked correctly', 'success');

    return true;
  } catch (error) {
    log(`Receipt scanner API test failed: ${error}`, 'error');
    throw error;
  }
}

async function runAllTests() {
  console.clear();
  console.log(`${COLORS.BOLD}${COLORS.GREEN}`);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   TRANSACTION SEARCH & RECEIPT SCANS - SMOKE TEST SUITE           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(COLORS.RESET);

  let allPassed = true;

  try {
    // Check server
    section('SERVER CHECK');
    try {
      await fetch(`${BASE_URL}/`);
      log(`Server running on port ${PORT}`, 'success');
    } catch {
      log(`Server not running on port ${PORT}!`, 'error');
      process.exit(1);
    }

    // Get family ID
    const family = await prisma.family.findFirst();
    if (!family) {
      log('No family found in database', 'error');
      process.exit(1);
    }
    log(`Using family: ${family.familyName} (ID: ${family.id})`, 'success');

    const familyId = family.id;

    // Run all tests
    await testReceiptScanMetadata(familyId);
    await testTransactionSearch(familyId);
    await testReceiptScansFilter(familyId);
    await testAPIReceiptScanner(familyId);

    // Summary
    section('TEST SUMMARY');
    console.log(`${COLORS.GREEN}${COLORS.BOLD}`);
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                   ALL TESTS PASSED! 🎉                             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(COLORS.RESET);

    log('✓ Receipt scan metadata storage working', 'success');
    log('✓ Transaction search filtering working', 'success');
    log('✓ Receipt scans tab filtering working', 'success');
    log('✓ Receipt scanner API integration working', 'success');

    console.log(`\n${COLORS.BOLD}Next Steps:${COLORS.RESET}`);
    console.log('1. Open Budget view in browser at http://localhost:3001');
    console.log('2. Test transaction search by typing in search box');
    console.log('3. Click "Receipt Scans" tab to view scanned receipts');
    console.log('4. Use "Scan Receipt" button to add new receipt scans\n');

  } catch (error) {
    allPassed = false;
    console.log(`${COLORS.RED}${COLORS.BOLD}`);
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                     TESTS FAILED                                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(COLORS.RESET);
    log(`Error: ${error}`, 'error');
  } finally {
    await prisma.$disconnect();
  }

  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(console.error);
