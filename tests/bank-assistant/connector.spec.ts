import { test, expect, type Page } from '@playwright/test';
import { mkdtemp, rm, readFile, stat, writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import { SessionVault } from '../../src/lib/localBankAssistant/sessionVault';
import { dueBankSlot } from '../../src/lib/localBankAssistant/schedule';
import { retrieveVirginStatements, VIRGIN_ENTRY, isVirginPage } from '../../src/lib/localBankAssistant/virginMoney';
import { VirginAssistant } from '../../src/lib/localBankAssistant/service';
import { createAssistantServer } from '../../scripts/bank-assistant/server';
import { parseCsvStatement, parseVirginMoneyCsv } from '../../src/utils/statementImport';
import { retrieveVirginTransactionExport } from '../../src/lib/localBankAssistant/transactionExport';

const basicCsv = '22-Oct-26, -12.20, 70.20, GBP,"SYNTHETIC, groceries"\n21-Apr-23, 100, 100, GBP,"SYNTHETIC deposit"\n';

test('Virgin headerless CSV keeps the first row, quoted commas, signs and London-safe dates', () => {
  const result = parseCsvStatement(basicCsv);
  expect(result.success).toBe(true);
  expect(result.metadata).toMatchObject({ bank: 'Virgin Money', startDate: '2023-04-21', endDate: '2026-10-22' });
  expect(result.transactions).toHaveLength(2);
  expect(result.transactions[0]).toMatchObject({ date: '2026-10-22', amount: 12.2, balance: 70.2, direction: 'debit', description: 'SYNTHETIC, groceries' });
  expect(result.transactions[1].direction).toBe('credit');
  for (const invalid of [basicCsv.replace('22-Oct', '32-Oct'), basicCsv.replace('GBP', 'USD'), '<html>Sign in</html>', '']) {
    expect(parseVirginMoneyCsv(invalid).success).toBe(false);
  }
  expect(parseCsvStatement('Date,Amount,Description\n2026-10-22,-1,SYNTHETIC').transactions).toHaveLength(1);
});

test('read-only current-account export commits dates and downloads without payment actions', async ({ page }) => {
  let payments = 0; let requests = 0;
  await page.route('https://internet-banking.ib.apps.virginmoney.com/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/payment') { payments++; return route.abort(); }
    if (url.pathname === '/export.csv') {
      requests++;
      expect(url.searchParams.get('from')).toBe('01/01/2000');
      expect(url.searchParams.get('to')).toBe('22/10/2026');
      return route.fulfill({ contentType: 'text/csv', headers: { 'content-disposition': 'attachment; filename="TransactionHistory.csv"' }, body: basicCsv });
    }
    return route.fulfill({ contentType: 'text/html', body: `<h1>Download transactions</h1><h2>M Plus Current</h2><a href="#">Download transactions</a><form action="/export.csv"><label>From<input name="from"></label><label>To<input name="to"></label><label>Basic CSV<input type="radio" checked></label><button>Export transactions</button></form><button onclick="fetch('/payment')">Pay or transfer money</button>` });
  });
  await page.goto(VIRGIN_ENTRY);
  expect(await retrieveVirginTransactionExport(page, '01/01/2000', '22/10/2026')).toEqual(Buffer.from(basicCsv));
  expect(requests).toBe(1); expect(payments).toBe(0);
});

test('CSV originals persist privately, deduplicate concurrent receipts and never mark bank connected', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fh-bank-csv-'));
  const service = new VirginAssistant(dir);
  try {
    await service.initialise();
    await Promise.all([service.keepTransactionExport(Buffer.from(basicCsv)), service.keepTransactionExport(Buffer.from(basicCsv))]);
    expect(service.snapshot().transactionExports).toHaveLength(1);
    expect(service.snapshot()).toMatchObject({ status: 'idle', lastSuccess: null, historyComplete: false, scheduleEnabled: false });
    const id = service.snapshot().transactionExports[0].id;
    expect((await stat(service.transactionExportPath(id))).mode & 0o777).toBe(0o600);
    expect(await readFile(service.transactionExportPath(id), 'utf8')).toBe(basicCsv);
    await expect(service.keepTransactionExport(Buffer.from('<html>Sign in</html>'))).rejects.toThrow('Invalid');
    const restored = new VirginAssistant(dir); await restored.initialise();
    expect(restored.snapshot().transactionExports).toHaveLength(1);
  } finally { await service.close(false); await rm(dir, { recursive: true }); }
});

let pdf: Buffer;
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.setContent('<h1>Virgin Money</h1><p>SYNTHETIC CONNECTOR QA - NOT A REAL STATEMENT</p><p>Statement date 30 September 2026</p>');
  pdf = await page.pdf();
  await page.close();
});

test('session encryption survives restart, is private and fails on tampering', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fh-bank-vault-'));
  const key = randomBytes(32);
  try {
    const vault = new SessionVault(dir, async () => key);
    expect(await vault.load()).toBeUndefined();
    const secret = JSON.stringify({ cookies: [{ value: 'synthetic-private-session' }], origins: [] });
    await vault.save(secret);
    const encrypted = await readFile(path.join(dir, 'browser-session.enc'));
    expect(encrypted.includes(Buffer.from('synthetic-private-session'))).toBe(false);
    expect((await stat(path.join(dir, 'browser-session.enc'))).mode & 0o777).toBe(0o600);
    expect(await new SessionVault(dir, async () => key).load()).toBe(secret);
    encrypted[encrypted.length - 1] ^= 1;
    await writeFile(path.join(dir, 'browser-session.enc'), encrypted);
    await expect(vault.load()).rejects.toThrow('unlocked');
    await vault.clear(); expect(await vault.load()).toBeUndefined();
  } finally { await rm(dir, { recursive: true }); }
});

test('daily London checks catch up after wake, handle DST and do not repeat', () => {
  expect(dueBankSlot(new Date('2026-07-01T05:59:00Z'), true, null)).toBeNull();
  expect(dueBankSlot(new Date('2026-07-01T06:00:00Z'), true, null)).toBe('2026-07-01:07');
  expect(dueBankSlot(new Date('2026-12-01T07:00:00Z'), true, null)).toBe('2026-12-01:07');
  expect(dueBankSlot(new Date('2026-10-25T18:00:00Z'), true, '2026-10-24:07')).toBe('2026-10-25:07');
  expect(dueBankSlot(new Date('2026-10-25T18:00:00Z'), true, '2026-10-25:07')).toBeNull();
  expect(dueBankSlot(new Date('2026-10-25T18:00:00Z'), false, null)).toBeNull();
});

test('official Virgin mobile verification is allowed without permitting lookalike hosts', () => {
  expect(isVirginPage('https://verification.ib.apps.virginmoney.com/vm')).toBe(true);
  for (const url of [
    'https://verification.ib.apps.virginmoney.com.evil.test/vm',
    'https://evil.test/verification.ib.apps.virginmoney.com/vm',
    'http://verification.ib.apps.virginmoney.com/vm',
    'https://verification.ib.apps.virginmoney.com:8080/vm',
    'https://user:password@verification.ib.apps.virginmoney.com/vm',
  ]) expect(isVirginPage(url)).toBe(false);
});

async function bankFixture(page: Page, total = 31) {
  await page.route('https://internet-banking.ib.apps.virginmoney.com/**', route => {
    const url = new URL(route.request().url());
    const p = Number(url.searchParams.get('p') || 0);
    if (url.pathname.endsWith('.pdf')) return route.fulfill({ contentType: 'application/pdf', headers: { 'content-disposition': 'attachment; filename="Retail Statements.pdf"' }, body: pdf });
    if (url.pathname.includes('/message/')) {
      const id = url.pathname.split('/').pop();
      return route.fulfill({ contentType: 'text/html', body: `<a href="/statement/${id}.pdf">Retail Statements</a><a href="/vm/?p=${p}">Back to messages</a>` });
    }
    const end = Math.min(total, p * 15 + 15);
    const rows = Array.from({ length: end - p * 15 }, (_, n) => {
      const id = p * 15 + n;
      return `<a href="/message/${id}?p=${p}">New statement ${id}</a>`;
    }).join('');
    return route.fulfill({ contentType: 'text/html', body: `<button onclick="fetch('/payment')">Make payment</button>${rows}${end < total ? `<a href="/vm/?p=${p + 1}">Next page</a>` : ''}` });
  });
}

test('large history resumes from saved receipts and incremental repeat downloads nothing', async ({ page }) => {
  await bankFixture(page);
  const keys = new Set<string>(); let downloads = 0; let payments = 0;
  page.on('request', req => { if (req.url().includes('/payment')) payments++; });
  const onStatement = async (bytes: Buffer, key: string) => { expect(bytes.subarray(0, 5).toString()).toBe('%PDF-'); keys.add(key); downloads++; };
  await page.goto(VIRGIN_ENTRY);
  expect((await retrieveVirginStatements(page, { knownKeys: keys, maxDownloads: 10, onStatement })).status).toBe('batch_pending');
  expect(keys.size).toBe(10);
  expect((await retrieveVirginStatements(page, { knownKeys: keys, maxDownloads: 25, onStatement })).status).toBe('complete');
  expect(keys.size).toBe(31);
  await page.goto(VIRGIN_ENTRY);
  const repeated = await retrieveVirginStatements(page, { knownKeys: keys, onStatement });
  expect(repeated.status).toBe('complete'); expect(repeated.newStatements).toBe(0);
  expect(downloads).toBe(31); expect(payments).toBe(0);
});

test('authentication waits without filling or submitting security inputs', async ({ page }) => {
  let submits = 0;
  await page.route('https://internet-banking.ib.apps.virginmoney.com/**', route => route.fulfill({ contentType: 'text/html', body: '<form action="/submit"><label>Password<input type="password"></label><button>Continue</button></form>' }));
  page.on('request', req => { if (req.url().includes('/submit')) submits++; });
  await page.goto(VIRGIN_ENTRY);
  expect((await retrieveVirginStatements(page)).status).toBe('awaiting_signin');
  await expect(page.getByLabel('Password')).toHaveValue(''); expect(submits).toBe(0);
});

test('unknown screens and unsafe links stop, not guessed navigation', async ({ page }) => {
  let body = '<button>Transfer money</button>';
  await page.route('https://internet-banking.ib.apps.virginmoney.com/**', route => route.fulfill({ contentType: 'text/html', body }));
  await page.goto(VIRGIN_ENTRY);
  expect((await retrieveVirginStatements(page)).status).toBe('navigation_required');
  body = '<a href="https://evil.test/">New statement October</a>';
  await page.reload(); await expect(retrieveVirginStatements(page)).rejects.toThrow('outside');
  expect(isVirginPage('https://internet-banking.ib.apps.virginmoney.com.evil.test/vm/')).toBe(false);
  expect(isVirginPage('https://internet-banking.ib.apps.virginmoney.com:8080/vm/')).toBe(false);
});

test('failed file persistence does not mark a statement as saved', async ({ page }) => {
  await bankFixture(page, 1);
  const keys = new Set<string>();
  await page.goto(VIRGIN_ENTRY);
  await expect(retrieveVirginStatements(page, { knownKeys: keys, onStatement: async () => { throw new Error('disk full'); } })).rejects.toThrow('disk full');
  expect(keys.size).toBe(0);
  await page.goto(VIRGIN_ENTRY);
  expect((await retrieveVirginStatements(page, { knownKeys: keys })).newStatements).toBe(1);
});

test('PDF originals are deduplicated, private and retained when text extraction needs review', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fh-bank-pdf-'));
  const vault = new SessionVault(dir, async () => Buffer.alloc(32, 1));
  const service = new VirginAssistant(dir, undefined, undefined, vault);
  try {
    await service.initialise(); await service.keepStatement(pdf); await service.keepStatement(pdf);
    expect(service.snapshot().statements).toHaveLength(1);
    expect((await stat(service.statementPath(service.snapshot().statements[0].id))).mode & 0o777).toBe(0o600);
    await service.setSchedule(true); await service.close();
    const restored = new VirginAssistant(dir, undefined, undefined, vault); await restored.initialise();
    expect(restored.snapshot()).toMatchObject({ scheduleEnabled: true, statements: [{ id: service.snapshot().statements[0].id }] });
    await restored.disconnect();
    expect(restored.snapshot().scheduleEnabled).toBe(false);
    expect(restored.snapshot().statements).toHaveLength(1);
  } finally { await service.close(); await rm(dir, { recursive: true }); }
});

test('worker checkpoints history and encrypted bank storage, then resumes after approval', async ({ page }) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fh-bank-resume-'));
  const vault = new SessionVault(dir, async () => Buffer.alloc(32, 3));
  const service = new VirginAssistant(dir, undefined, undefined, vault);
  try {
    await service.initialise();
    const internal = service as unknown as { bankPage: Page; context: ReturnType<Page['context']>; status: string };
    internal.bankPage = page; internal.context = page.context();
    await page.route('https://internet-banking.ib.apps.virginmoney.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Check your device</p>' }));
    await page.goto(VIRGIN_ENTRY);
    internal.status = 'awaiting_signin';
    await service.tick();
    expect(service.snapshot().status).toBe('awaiting_signin');
    expect(await vault.load()).toBeUndefined();
    await page.unrouteAll(); await bankFixture(page, 31); await page.reload();
    await page.context().addCookies([{ name: 'synthetic-session', value: 'private-cookie', domain: 'internet-banking.ib.apps.virginmoney.com', path: '/', secure: true }]);
    await page.evaluate(() => { localStorage.setItem('synthetic-local', 'private-local'); sessionStorage.setItem('synthetic-session', 'private-session'); });
    await service.tick();
    expect(service.snapshot().status).toBe('batch_pending');
    const state = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8'));
    expect(state.knownKeys).toHaveLength(20);
    const restored = new VirginAssistant(dir, undefined, undefined, vault); await restored.initialise();
    expect(restored.snapshot().status).toBe('batch_pending');
    await restored.close(false);
    const saved = JSON.parse((await vault.load())!);
    expect(saved.storageState.cookies.some((item: { name: string }) => item.name === 'synthetic-session')).toBe(true);
    expect(saved.sessionStorage.entries).toContainEqual(['synthetic-session', 'private-session']);
    expect((await readFile(path.join(dir, 'browser-session.enc'))).includes(Buffer.from('private-cookie'))).toBe(false);
    await service.tick();
    expect(service.snapshot().status).toBe('ready');
    expect(JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')).knownKeys).toHaveLength(31);
    expect(service.snapshot().statements).toHaveLength(1);
    expect(service.snapshot().lastSuccess).not.toBeNull();
  } finally { await service.close(); await rm(dir, { recursive: true }); }
});

test('local dashboard rejects foreign actions and remains usable on phone and desktop', async ({ page, request }) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fh-bank-ui-'));
  const service = new VirginAssistant(dir, undefined, undefined, new SessionVault(dir, async () => Buffer.alloc(32, 2)));
  let server: Server | undefined;
  try {
    await service.initialise(); await service.keepStatement(pdf);
    server = createAssistantServer(service, 3948).listen(3948, '127.0.0.1');
    await new Promise<void>(resolve => server!.once('listening', resolve));
    expect((await request.get('http://127.0.0.1:3948/api/status')).status()).toBe(403);
    await page.goto('http://127.0.0.1:3948/');
    expect((await page.request.post('http://127.0.0.1:3948/api/action', { headers: { Origin: 'https://evil.test' }, data: { action: 'schedule', enabled: true } })).status()).toBe(403);
    expect((await page.request.post('http://127.0.0.1:3948/api/transaction-exports', { headers: { Origin: 'https://evil.test', 'Content-Type': 'text/csv' }, data: basicCsv })).status()).toBe(403);
    expect((await page.request.post('http://127.0.0.1:3948/api/transaction-exports', { headers: { Origin: 'http://127.0.0.1:3948', 'Content-Type': 'text/csv' }, data: '<html>Sign in</html>' })).status()).toBe(400);
    expect((await page.request.post('http://127.0.0.1:3948/api/transaction-exports', { headers: { Origin: 'http://127.0.0.1:3948', 'Content-Type': 'text/csv' }, data: basicCsv })).status()).toBe(200);
    const exportId = service.snapshot().transactionExports[0].id;
    const exported = await page.request.get(`http://127.0.0.1:3948/api/transaction-exports/${exportId}`);
    expect(await exported.body()).toEqual(Buffer.from(basicCsv));
    expect(exported.headers()['content-disposition']).toContain('attachment');
    expect((await request.get(`http://127.0.0.1:3948/api/transaction-exports/${exportId}`)).status()).toBe(403);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Download CSV', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Virgin Money', exact: true })).toBeVisible();
    await page.getByLabel('Daily at 07:00 London time, or after this Mac wakes').check();
    await expect.poll(() => service.snapshot().scheduleEnabled).toBe(true);
    await expect(page.getByRole('link', { name: 'View PDF' })).toBeVisible();
    await page.getByRole('button', { name: 'Send preview', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('approve sending');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally { await service.close(); await new Promise<void>(resolve => server ? server.close(() => resolve()) : resolve()); await rm(dir, { recursive: true }); }
});
