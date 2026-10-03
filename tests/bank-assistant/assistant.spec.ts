import { test, expect } from '@playwright/test';
import { mkdtemp, rm, stat } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import { createAssistantServer } from '../../scripts/bank-assistant/server';
import { VirginAssistant } from '../../src/lib/localBankAssistant/service';
import { retrieveVirginStatements, VIRGIN_ENTRY } from '../../src/lib/localBankAssistant/virginMoney';
import { virginStatementPdf as fixturePdf } from '../fixtures/virginStatement';

test('documented statement path retrieves a PDF, never touches a payment control', async ({ page }) => {
  let payments = 0;
  const pdf = await fixturePdf();
  await page.route('https://internet-banking.ib.apps.virginmoney.com/**', route => {
    if (route.request().url().endsWith('/statement.pdf')) return route.fulfill({ contentType: 'application/pdf', headers: { 'content-disposition': 'attachment; filename="Retail Statements.pdf"' }, body: pdf });
    return route.fulfill({ contentType: 'text/html', body: `<button onclick="document.getElementById('messages').hidden=false">More</button><button onclick="window.fetch('/payment')">Make payment</button><div id="messages" hidden><button onclick="document.getElementById('statements').hidden=false">Secure messages</button></div><div id="statements" hidden><button onclick="document.getElementById('attachment').hidden=false">New statement 30 September 2026</button></div><a id="attachment" hidden href="/statement.pdf">Retail Statements</a>` });
  });
  page.on('request', request => { if (request.url().endsWith('/payment')) payments++; });
  await page.goto(VIRGIN_ENTRY);
  const result = await retrieveVirginStatements(page);
  expect(result.status).toBe('complete'); expect(result.downloads).toHaveLength(1);
  expect(result.downloads[0].subarray(0, 5).toString()).toBe('%PDF-'); expect(payments).toBe(0);
});

test('sign-in waits without filling or submitting security fields', async ({ page }) => {
  await page.route('https://login-and-registration.ib.apps.virginmoney.com/**', route => route.fulfill({ contentType: 'text/html', body: '<label>Your username or customer number<input></label><button>Continue</button>' }));
  await page.goto('https://login-and-registration.ib.apps.virginmoney.com/vm');
  expect((await retrieveVirginStatements(page)).status).toBe('awaiting_signin');
  await expect(page.getByRole('textbox')).toHaveValue('');
});

test('unknown screens, ambiguous attachments and other domains fail closed', async ({ page }) => {
  let body = '<button>Make payment</button>';
  await page.route('https://internet-banking.ib.apps.virginmoney.com/**', route => route.fulfill({ contentType: 'text/html', body }));
  await page.goto(VIRGIN_ENTRY);
  expect((await retrieveVirginStatements(page)).status).toBe('navigation_required');
  body = '<button>New statement September</button><a href="/one">Retail Statements</a><a href="/two">Retail Statements</a>';
  await page.reload(); expect((await retrieveVirginStatements(page)).status).toBe('navigation_required');
  body = '<button>New statement September</button><a href="https://untrusted.test/file.pdf">Retail Statements</a>';
  await page.reload(); await expect(retrieveVirginStatements(page)).rejects.toThrow('outside');
  await page.goto('about:blank'); await expect(retrieveVirginStatements(page)).rejects.toThrow('approved');
});

test('Family Hub handoff refuses old auto-save dialogs and stops at the new preview', async ({ page }) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'virgin-handoff-qa-'));
  const service = new VirginAssistant(directory);
  let reviewContract = false;
  let uploads = 0;
  let saves = 0;
  await page.exposeFunction('qaUpload', () => { uploads++; });
  await page.exposeFunction('qaSave', () => { saves++; });
  await page.route('https://family-hub-app.vercel.app/**', route => route.fulfill({ contentType: 'text/html', body: `
    <button onclick="document.querySelector('[role=dialog]').hidden=false">Import Statement</button>
    <div role="dialog" aria-label="Import Statement" ${reviewContract ? 'data-preview-contract="review-v1"' : ''} hidden>
      <label>Statement account<select><option>Virgin QA</option></select></label>
      <label><input type="checkbox" checked>Send PDF text to OpenRouter for AI parsing</label>
      <input type="file" onchange="window.qaUpload(); setTimeout(()=>document.getElementById('save').disabled=false,250)">
      <button id="save" disabled onclick="window.qaSave()">Save reviewed transactions</button>
    </div>` }));
  try {
    await service.initialise(); await service.keepStatement(await fixturePdf());
    (service as unknown as { hubPage: typeof page }).hubPage = page;
    const id = service.snapshot().statements[0].id;
    await page.goto('https://family-hub-app.vercel.app/?view=budget');
    await expect(service.stagePreview(id, 'Virgin QA')).rejects.toThrow('preview-before-save');
    expect(uploads).toBe(0);
    reviewContract = true; await page.reload();
    await service.stagePreview(id, 'Virgin QA');
    expect(uploads).toBe(1); expect(saves).toBe(0);
    await expect(page.getByLabel('Send PDF text to OpenRouter for AI parsing')).not.toBeChecked();
    expect(service.snapshot().notice).toContain('nothing is saved');
  } finally { await service.close(); await rm(directory, { recursive: true, force: true }); }
});

test('deduplicates the same PDF, stores privately and restores schedule without bank credentials', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'virgin-assistant-qa-'));
  const service = new VirginAssistant(directory);
  try {
    const pdf = await fixturePdf();
    await service.initialise(); await service.keepStatement(pdf); await service.keepStatement(pdf);
    expect(service.snapshot().statements).toHaveLength(1);
    expect(service.snapshot().statements[0].rows).toBeGreaterThan(0);
    expect((await stat(directory)).mode & 0o777).toBe(0o700);
    expect((await stat(path.join(directory, `${service.snapshot().statements[0].id}.pdf`))).mode & 0o777).toBe(0o600);
    await service.setSchedule(true);
    const restored = new VirginAssistant(directory); await restored.initialise();
    expect(restored.snapshot()).toMatchObject({ scheduleEnabled: true, status: 'awaiting_signin', bankOpen: false });
  } finally { await service.close(); await rm(directory, { recursive: true, force: true }); }
});

test('scheduled checks notify once when login is needed, without an open UI tab', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'virgin-alerts-qa-'));
  const notices: string[] = [];
  const service = new VirginAssistant(directory, undefined, async message => { notices.push(message); });
  try {
    await service.initialise(); await service.setSchedule(true); await service.setAlerts(true);
    await service.tick(new Date('2026-10-03T06:05:00Z'));
    await service.tick(new Date('2026-10-03T06:06:00Z'));
    expect(service.snapshot().status).toBe('awaiting_signin');
    expect(notices).toHaveLength(1);
    expect(notices[0]).not.toContain('password');
  } finally { await service.close(); await rm(directory, { recursive: true, force: true }); }
});

test('loopback UI rejects foreign origins and renders without overflow on phone and desktop', async ({ page, request }) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'virgin-ui-qa-'));
  const service = new VirginAssistant(directory);
  let server: Server | undefined;
  try {
    await service.initialise(); await service.keepStatement(await fixturePdf());
    server = createAssistantServer(service, 3948).listen(3948, '127.0.0.1');
    await new Promise<void>(resolve => server!.once('listening', resolve));
    expect((await request.get('http://127.0.0.1:3948/api/status')).status()).toBe(403);
    const statementId = service.snapshot().statements[0].id;
    expect((await request.get(`http://127.0.0.1:3948/api/statements/${statementId}`)).status()).toBe(403);
    await page.goto('http://127.0.0.1:3948/');
    const pdfResponse = await page.request.get(`http://127.0.0.1:3948/api/statements/${statementId}`);
    expect(pdfResponse.ok()).toBe(true);
    expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe('%PDF-');
    expect((await page.request.get(`http://127.0.0.1:3948/api/statements/${'0'.repeat(64)}`)).status()).toBe(404);
    await expect(page.getByRole('link', { name: 'View PDF' })).toBeVisible();
    await expect(page.getByText('1 file', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Virgin Money', exact: true })).toBeVisible();
    const forbidden = await page.request.post('http://127.0.0.1:3948/api/action', { headers: { Origin: 'https://evil.test' }, data: { action: 'schedule', enabled: true } });
    expect(forbidden.status()).toBe(403); expect(service.snapshot().scheduleEnabled).toBe(false);
    await page.getByLabel('Check at 07:00 and 19:00 London time').check();
    await expect.poll(() => service.snapshot().scheduleEnabled).toBe(true);
    await page.getByRole('button', { name: 'Send preview', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('approve sending');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `output/playwright/virgin-assistant-${width}.png`, fullPage: true });
    }
  } finally { await service.close(); await new Promise<void>(resolve => server ? server.close(() => resolve()) : resolve()); await rm(directory, { recursive: true, force: true }); }
});
