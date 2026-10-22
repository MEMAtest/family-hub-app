import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createHash } from 'crypto';
import { chmod, mkdir, readFile, writeFile, lstat, readdir, stat } from 'fs/promises';
import path from 'path';
import { parseVirginMoneyPdfText } from '../../utils/statementImport';
import { bankNeedsSignin, retrieveVirginStatements, VIRGIN_ENTRY } from './virginMoney';
import { dueBankSlot } from './schedule';
import { isVirginPage } from './virginMoney';
import pdfParse from 'pdf-parse';
import { SessionVault, privateWrite } from './sessionVault';

export type BankStatus = 'idle' | 'checking' | 'awaiting_signin' | 'navigation_required' | 'batch_pending' | 'ready' | 'error';
type LocalStatement = { id: string; retrievedAt: string; through: string | null; rows: number; reviewRequired: boolean };

export class VirginAssistant {
  private browser?: Browser;
  private context?: BrowserContext;
  private hubContext?: BrowserContext;
  private bankPage?: Page;
  private hubPage?: Page;
  private busy = false;
  private statements: LocalStatement[] = [];
  private schedule = false;
  private alerts = false;
  private lastAlert = '';
  private lastSlot: string | null = null;
  private status: BankStatus = 'idle';
  private lastChecked: string | null = null;
  private lastSuccess: string | null = null;
  private knownKeys = new Set<string>();
  private writeQueue: Promise<void> = Promise.resolve();
  private vault: SessionVault;
  private historyComplete = false;
  private activeCheck?: Promise<void>;
  private closing = false;
  private notice = 'Not connected';
  private timer?: ReturnType<typeof setInterval>;
  constructor(private directory: string, private hubUrl = 'https://family-hub-app.vercel.app/', private notify: (message: string) => Promise<void> = async () => {}, vault?: SessionVault) {
    this.vault = vault ?? new SessionVault(directory);
  }

  async initialise() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    if ((await lstat(this.directory)).isSymbolicLink()) throw new Error('Use a private directory, not a symbolic link.');
    await chmod(this.directory, 0o700);
    const stored = await readFile(path.join(this.directory, 'state.json'), 'utf8').catch(() => null);
    if (stored) {
      const state = JSON.parse(stored);
      this.schedule = state.schedule === true;
      this.alerts = state.alerts === true;
      this.lastSlot = typeof state.lastSlot === 'string' ? state.lastSlot : null;
      this.lastChecked = typeof state.lastChecked === 'string' ? state.lastChecked : null;
      this.lastSuccess = typeof state.lastSuccess === 'string' ? state.lastSuccess : null;
      this.historyComplete = state.historyComplete === true;
      if (state.batchPending === true) { this.status = 'batch_pending'; this.notice = 'Resuming the saved statement-history scan.'; }
      this.knownKeys = new Set(Array.isArray(state.knownKeys) ? state.knownKeys.filter((key: unknown) => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key)) : []);
      this.statements = Array.isArray(state.statements) ? state.statements.filter((item: LocalStatement) => /^[a-f0-9]{64}$/.test(item.id)) : [];
    }
    if (this.schedule && this.status !== 'batch_pending') { this.notice = 'Daily checks enabled. The saved bank session will be tried at the next check.'; }
  }
  snapshot() {
    return { institution: 'Virgin Money', accountType: 'current-savings', status: this.status, notice: this.notice,
      lastChecked: this.lastChecked, lastSuccess: this.lastSuccess, historyComplete: this.historyComplete,
      scheduleEnabled: this.schedule, alertsEnabled: this.alerts, statements: this.statements,
      bankOpen: Boolean(this.bankPage && !this.bankPage.isClosed()), hubOpen: Boolean(this.hubPage && !this.hubPage.isClosed()),
      destination: new URL(this.hubUrl).origin, mode: 'local-pilot' };
  }
  private async persist() {
    const state = JSON.stringify({ schedule: this.schedule, alerts: this.alerts, lastSlot: this.lastSlot,
      lastChecked: this.lastChecked, lastSuccess: this.lastSuccess, historyComplete: this.historyComplete,
      batchPending: this.status === 'batch_pending', knownKeys: [...this.knownKeys], statements: this.statements });
    this.writeQueue = this.writeQueue.catch(() => {}).then(() => privateWrite(path.join(this.directory, 'state.json'), state));
    await this.writeQueue;
  }
  private async notifyAttention() {
    if (!this.alerts || this.notice === this.lastAlert || !['awaiting_signin', 'navigation_required', 'error'].includes(this.status)) return;
    this.lastAlert = this.notice;
    await this.notify('Virgin Money needs attention. Open the Family Hub bank assistant.').catch(() => {});
  }
  private async ensureBrowser() {
    if (this.browser?.isConnected() && this.context) return;
    const stored = await this.vault.load();
    const saved = stored ? JSON.parse(stored) : undefined;
    const storageState = saved?.storageState ?? saved;
    if (storageState?.origins?.some((item: { origin: string }) => !isVirginPage(item.origin))) throw new Error('Saved session contains an unexpected origin.');
    await this.browser?.close();
    this.browser = await chromium.launch({ headless: false, handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false });
    this.context = await this.browser.newContext({ acceptDownloads: true, storageState });
    if (saved?.sessionStorage) {
      const origin = saved.sessionStorage.origin;
      if (!isVirginPage(origin)) throw new Error('Unexpected session origin.');
      await this.context.addInitScript(({ origin: expected, entries }) => {
        if (location.origin === expected) {
          for (const [key, value] of entries) sessionStorage.setItem(key, value);
        }
      }, saved.sessionStorage as { origin: string; entries: Array<[string, string]> });
    }
    await this.context.route('**/*', route => {
      const request = route.request();
      if (request.isNavigationRequest() && !isVirginPage(request.url())) return route.abort();
      return route.continue();
    });
    this.bankPage = undefined;
    this.hubPage = undefined;
    this.hubContext = undefined;
  }
  async openBank() {
    if (this.busy) throw new Error('Wait for the current statement check.');
    this.closing = false;
    await this.ensureBrowser();
    if (!this.timer) this.startSchedule();
    if (!this.bankPage || this.bankPage.isClosed()) {
      this.bankPage = await this.context!.newPage();
      await this.bankPage.goto(VIRGIN_ENTRY, { waitUntil: 'domcontentloaded' });
    }
    await this.bankPage.bringToFront();
    this.status = 'awaiting_signin'; this.notice = 'Complete Virgin sign-in in the bank window, then check for statements.';
  }
  async check() {
    if (this.closing) return;
    if (this.activeCheck) return this.activeCheck;
    this.activeCheck = this.performCheck();
    try { await this.activeCheck; } finally { this.activeCheck = undefined; }
  }
  private async performCheck() {
    if (this.busy) return;
    const previousStatus = this.status;
    this.busy = true; this.status = 'checking'; this.notice = 'Checking Virgin secure messages';
    try {
      if (!this.bankPage || this.bankPage.isClosed()) {
        await this.ensureBrowser();
        this.bankPage = await this.context!.newPage();
        await this.bankPage.goto(VIRGIN_ENTRY, { waitUntil: 'domcontentloaded' });
      } else if (previousStatus === 'ready') {
        await this.bankPage.goto(VIRGIN_ENTRY, { waitUntil: 'domcontentloaded' });
      }
      const result = await retrieveVirginStatements(this.bankPage, { knownKeys: this.knownKeys,
        onStatement: async (bytes, key) => {
          await this.keepStatement(bytes);
          this.knownKeys.add(key);
          await this.persist();
        } });
      this.lastChecked = new Date().toISOString();
      if (result.status === 'complete') {
        this.lastSuccess = this.lastChecked; this.historyComplete = true;
        this.lastAlert = '';
      }
      await this.saveSession();
      this.status = result.status === 'complete' ? 'ready' : result.status;
      this.notice = result.status === 'complete' ? 'Statement check completed. Files stay on this device until you send a preview.'
        : result.status === 'awaiting_signin' ? 'Virgin requires sign-in or approval. No automated login attempts were made.'
          : result.status === 'batch_pending' ? 'Batch saved. The next batch continues automatically while the assistant is running.'
          : 'Statement navigation needs checking. The assistant stopped rather than clicking an unknown control.';
    } catch {
      this.status = 'error'; this.notice = 'Statement retrieval stopped. Check the bank window; no payment controls were used.';
    } finally { this.busy = false; await this.persist(); await this.notifyAttention(); }
  }
  async keepStatement(bytes: Buffer) {
    if (bytes.length > 20 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF.');
    const id = createHash('sha256').update(bytes).digest('hex');
    if (this.statements.some(item => item.id === id)) return;
    const files = (await readdir(this.directory)).filter(file => /^[a-f0-9]{64}\.pdf$/.test(file));
    let size = 0;
    for (const file of files) size += (await stat(path.join(this.directory, file))).size;
    if (size + bytes.length > 2 * 1024 ** 3) throw new Error('Local statement storage has reached its 2 GiB limit.');
    let result;
    try {
      const text = (await pdfParse(bytes)).text;
      result = /Virgin Money/i.test(text) ? parseVirginMoneyPdfText(text) : undefined;
    } catch { /* Keep the original PDF even when extraction needs manual review. */ }
    await writeFile(path.join(this.directory, `${id}.pdf`), bytes, { flag: 'wx', mode: 0o600 }).catch(async error => {
      if (error.code !== 'EEXIST') throw error;
      const existing = await readFile(path.join(this.directory, `${id}.pdf`));
      if (createHash('sha256').update(existing).digest('hex') !== id) throw new Error('Stored statement is damaged.');
    });
    this.statements.unshift({ id, retrievedAt: new Date().toISOString(), through: result?.metadata.endDate ?? null,
      rows: result?.transactions.length ?? 0, reviewRequired: !result?.success || Boolean(result?.warnings.length) });
    await this.persist();
  }
  async setSchedule(enabled: boolean) { this.schedule = enabled; await this.persist(); }
  async setAlerts(enabled: boolean) { this.alerts = enabled; await this.persist(); }
  statementPath(id: string) {
    if (!/^[a-f0-9]{64}$/.test(id) || !this.statements.some(item => item.id === id)) throw new Error('Statement not found.');
    return path.join(this.directory, `${id}.pdf`);
  }
  startSchedule() {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick().catch(() => { this.status = 'error'; this.notice = 'Scheduled check failed.'; }); }, 60_000);
  }
  async tick(now = new Date()) {
    if (!this.busy && this.status === 'batch_pending') { await this.check(); return; }
    if (!this.busy && this.status === 'awaiting_signin' && this.bankPage && !this.bankPage.isClosed()
      && isVirginPage(this.bankPage.url()) && new URL(this.bankPage.url()).hostname === 'internet-banking.ib.apps.virginmoney.com') {
      await this.check();
      return;
    }
    const slot = dueBankSlot(now, this.schedule, this.lastSlot);
    if (!slot || this.busy) return;
    this.lastSlot = slot; await this.persist(); await this.check();
  }
  async openHub() {
    await this.ensureBrowser();
    if (!this.hubPage || this.hubPage.isClosed()) {
      this.hubContext ??= await this.browser!.newContext();
      this.hubPage = await this.hubContext.newPage();
      await this.hubPage.goto(new URL('?view=budget', this.hubUrl).href, { waitUntil: 'domcontentloaded' });
    }
    await this.hubPage.bringToFront();
  }
  async stagePreview(id: string, accountName: string) {
    if (this.busy) throw new Error('Wait for the current check.');
    if (!this.statements.some(item => item.id === id)) throw new Error('Statement not found.');
    if (!this.hubPage || this.hubPage.isClosed()) throw new Error('Open Family Hub and sign in first.');
    if (new URL(this.hubPage.url()).origin !== new URL(this.hubUrl).origin) throw new Error('Family Hub is outside the approved destination.');
    const launch = this.hubPage.getByRole('button', { name: /^Import Statement$/i }).filter({ visible: true });
    if (await launch.count() === 0) throw new Error('Open Money in Family Hub before sending the preview.');
    await launch.first().click();
    const dialog = this.hubPage.getByRole('dialog', { name: 'Import Statement', exact: true });
    await dialog.waitFor({ state: 'visible' });
    if (await dialog.getAttribute('data-preview-contract') !== 'review-v1') throw new Error('Family Hub needs the preview-before-save update before this assistant can upload.');
    const account = dialog.getByRole('combobox', { name: 'Statement account', exact: true });
    await account.waitFor({ state: 'visible' });
    const options = await account.locator('option').allTextContents();
    if (options.filter(name => name === accountName).length !== 1) throw new Error('Choose one exact Family Hub account name.');
    await account.selectOption({ label: accountName });
    await dialog.getByRole('checkbox', { name: 'Send PDF text to OpenRouter for AI parsing', exact: true }).uncheck();
    await dialog.locator('input[type="file"]').setInputFiles(path.join(this.directory, `${id}.pdf`));
    const save = dialog.getByRole('button', { name: 'Save reviewed transactions', exact: true });
    await save.waitFor({ state: 'visible' });
    const deadline = Date.now() + 60_000;
    while (!(await save.isEnabled()) && Date.now() < deadline) {
      await this.hubPage.waitForTimeout(250);
    }
    if (!(await save.isEnabled())) throw new Error('Family Hub could not produce a usable preview. Check the import dialog; nothing was saved.');
    await this.hubPage.bringToFront();
    this.notice = 'Preview sent to Family Hub. Review the rows there; nothing is saved until you confirm the import.';
  }
  private async saveSession() {
    if (!this.context || !this.bankPage || !isVirginPage(this.bankPage.url())) return;
    if (await bankNeedsSignin(this.bankPage)) return;
    const state = await this.context.storageState({ indexedDB: true });
    state.origins = state.origins.filter(item => isVirginPage(item.origin));
    const sessionStorage = await this.bankPage.evaluate(() => ({ origin: location.origin,
      entries: Object.entries(window.sessionStorage) }));
    await this.vault.save(JSON.stringify({ storageState: state, sessionStorage }));
  }
  async disconnect() {
    await this.setSchedule(false);
    await this.close(false);
    await this.vault.clear();
    this.notice = 'Disconnected. Saved bank session removed; local PDFs retained.';
  }
  async close(preserveSession = true) {
    this.closing = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.activeCheck;
    try { if (preserveSession) await this.saveSession(); }
    finally { await this.browser?.close(); }
    this.browser = undefined; this.context = undefined; this.hubContext = undefined;
    this.bankPage = undefined; this.hubPage = undefined;
    this.status = 'idle'; this.notice = 'Stopped. Session saved encrypted; local statements retained.';
  }
}
