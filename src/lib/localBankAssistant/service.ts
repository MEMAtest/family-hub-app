import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createHash } from 'crypto';
import { chmod, mkdir, readFile, writeFile, lstat } from 'fs/promises';
import path from 'path';
import { parseVirginMoneyPdfText } from '../../utils/statementImport';
import { retrieveVirginStatements, VIRGIN_ENTRY } from './virginMoney';
import { dueBankSlot } from './schedule';
import { isVirginPage } from './virginMoney';
import { extractStatementPdf } from '../statementPdf';

export type BankStatus = 'idle' | 'checking' | 'awaiting_signin' | 'navigation_required' | 'ready' | 'error';
type LocalStatement = { id: string; retrievedAt: string; through: string | null; rows: number; reviewRequired: boolean };

export class VirginAssistant {
  private browser?: Browser;
  private context?: BrowserContext;
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
  private notice = 'Not connected';
  private timer?: ReturnType<typeof setInterval>;
  constructor(private directory: string, private hubUrl = 'https://family-hub-app.vercel.app/', private notify: (message: string) => Promise<void> = async () => {}) {}

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
      this.statements = Array.isArray(state.statements) ? state.statements.filter((item: LocalStatement) => /^[a-f0-9]{64}$/.test(item.id)) : [];
    }
    if (this.schedule) { this.status = 'awaiting_signin'; this.notice = 'Virgin sign-in needed; no passwords or bank sessions are saved.'; }
  }
  snapshot() {
    return { institution: 'Virgin Money', accountType: 'current-savings', status: this.status, notice: this.notice,
      lastChecked: this.lastChecked, scheduleEnabled: this.schedule, alertsEnabled: this.alerts, statements: this.statements,
      bankOpen: Boolean(this.bankPage && !this.bankPage.isClosed()), hubOpen: Boolean(this.hubPage && !this.hubPage.isClosed()),
      destination: new URL(this.hubUrl).origin, mode: 'local-pilot' };
  }
  private async persist() {
    await writeFile(path.join(this.directory, 'state.json'), JSON.stringify({ schedule: this.schedule, alerts: this.alerts, lastSlot: this.lastSlot, statements: this.statements }), { mode: 0o600 });
  }
  private async notifyAttention() {
    if (!this.alerts || this.notice === this.lastAlert || !['awaiting_signin', 'navigation_required', 'error'].includes(this.status)) return;
    this.lastAlert = this.notice;
    await this.notify('Virgin Money needs attention. Open the Family Hub bank assistant.').catch(() => {});
  }
  private async ensureBrowser() {
    if (this.browser?.isConnected()) return;
    this.browser = await chromium.launch({ headless: false });
    // Authentication stays only in this process; never serialize cookies or fill security fields.
    this.context = await this.browser.newContext({ acceptDownloads: true });
    this.bankPage = undefined;
    this.hubPage = undefined;
  }
  async openBank() {
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
    if (this.busy) return;
    if (!this.bankPage || this.bankPage.isClosed()) {
      this.status = 'awaiting_signin'; this.notice = 'Virgin sign-in needed. Open Virgin Money to continue.';
      await this.notifyAttention(); return;
    }
    this.busy = true; this.status = 'checking'; this.notice = 'Checking Virgin secure messages';
    try {
      const result = await retrieveVirginStatements(this.bankPage);
      for (const bytes of result.downloads) await this.keepStatement(bytes);
      this.lastChecked = new Date().toISOString();
      this.status = result.status === 'complete' ? 'ready' : result.status;
      this.notice = result.status === 'complete' ? 'Statement check completed. Files stay on this device until you send a preview.'
        : result.status === 'awaiting_signin' ? 'Virgin requires sign-in or approval. No automated login attempts were made.'
          : 'Statement navigation needs checking. The assistant stopped rather than clicking an unknown control.';
    } catch {
      this.status = 'error'; this.notice = 'Statement retrieval stopped. Check the bank window; no payment controls were used.';
    } finally { this.busy = false; await this.persist(); await this.notifyAttention(); }
  }
  async keepStatement(bytes: Buffer) {
    if (bytes.length > 20 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF.');
    const id = createHash('sha256').update(bytes).digest('hex');
    if (this.statements.some(item => item.id === id)) return;
    const text = (await extractStatementPdf(bytes)).text;
    if (!/Virgin Money/i.test(text)) throw new Error('Statement issuer is not Virgin Money.');
    const result = parseVirginMoneyPdfText(text);
    await writeFile(path.join(this.directory, `${id}.pdf`), bytes, { flag: 'wx', mode: 0o600 });
    this.statements.unshift({ id, retrievedAt: new Date().toISOString(), through: result.metadata.endDate ?? null,
      rows: result.transactions.length, reviewRequired: !result.success || Boolean(result.warnings.length) });
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
      this.hubPage = await this.context!.newPage();
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
  async close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.browser?.close();
    this.status = 'idle'; this.notice = 'Disconnected. Bank sessions were cleared; local statements are retained.';
  }
}
