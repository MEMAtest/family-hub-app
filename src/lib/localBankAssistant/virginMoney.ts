import type { Page } from '@playwright/test';
import { createHash } from 'crypto';

export const VIRGIN_ENTRY = 'https://internet-banking.ib.apps.virginmoney.com/vm/';
const BANK_HOSTS = new Set([
  'internet-banking.ib.apps.virginmoney.com',
  'login-and-registration.ib.apps.virginmoney.com',
  'verification.ib.apps.virginmoney.com',
]);
export function isVirginPage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && BANK_HOSTS.has(parsed.hostname) && !parsed.username && !parsed.password && (!parsed.port || parsed.port === '443');
  } catch { return false; }
}

type Status = 'awaiting_signin' | 'navigation_required' | 'batch_pending' | 'complete';
export type RetrievalResult = { status: Status; downloads: Buffer[]; visitedPages: number; newStatements: number };
type Options = {
  knownKeys?: ReadonlySet<string>;
  maxDownloads?: number;
  maxPages?: number;
  onStatement?: (bytes: Buffer, key: string) => Promise<void>;
};
const controls = (page: Page, label: RegExp) => page.getByRole('button', { name: label })
  .or(page.getByRole('link', { name: label })).filter({ visible: true });
async function clickUnique(page: Page, label: RegExp) {
  const control = controls(page, label);
  if (await control.count() !== 1 || !await control.isEnabled()) return false;
  await control.click();
  return true;
}
export async function bankNeedsSignin(page: Page) {
  if (!isVirginPage(page.url())) throw new Error('Bank browser is outside approved Virgin Money sites.');
  if (new URL(page.url()).hostname.startsWith('login-and-registration.')) return true;
  return await page.locator('input[type="password"]:visible').count() > 0
    || await page.getByText(/^(?:Check your device|Approve (?:this request )?in (?:your|the) app|Open your mobile banking app)[.!]?$/i).filter({ visible: true }).count() > 0
    || await page.getByRole('textbox', { name: /username|customer (?:number|id)|password|passcode|one.time|security code/i }).filter({ visible: true }).count() > 0;
}

// Limited to statement controls; never infer clicks from a whole-page AI response.
export async function retrieveVirginStatements(page: Page, options: Options = {}): Promise<RetrievalResult> {
  const downloads: Buffer[] = [];
  let visitedPages = 0;
  let newStatements = 0;
  const result = (status: Status): RetrievalResult => ({ status, downloads, visitedPages, newStatements });
  if (await bankNeedsSignin(page)) return result('awaiting_signin');
  const statements = () => controls(page, /^New statement\b/i);
  if (!await statements().count()) {
    await clickUnique(page, /^Back(?: to (?:messages|secure messages))?$/i);
    if (!await statements().count()) {
      await clickUnique(page, /^More$/i);
      if (!await clickUnique(page, /^Secure messages$/i)) return result('navigation_required');
    }
  }
  const seenPages = new Set<string>();
  const known = new Set(options.knownKeys);
  const deadline = Date.now() + 90_000;
  const maxDownloads = Math.max(1, Math.min(25, options.maxDownloads ?? 20));
  const maxPages = Math.max(1, Math.min(100, options.maxPages ?? 50));
  const entries = async () => {
    const rows = [];
    for (const locator of await statements().all()) {
      const label = (await locator.innerText()).trim();
      const href = await locator.getAttribute('href');
      if (href && !isVirginPage(new URL(href, page.url()).href)) throw new Error('Statement link outside approved bank sites.');
      rows.push({ locator, key: createHash('sha256').update(`${href ?? ''}\n${label}`).digest('hex') });
    }
    return rows;
  };
  while (visitedPages < maxPages && Date.now() < deadline) {
    if (await bankNeedsSignin(page)) return result('awaiting_signin');
    const rows = await entries();
    if (!rows.length || new Set(rows.map(row => row.key)).size !== rows.length) return result('navigation_required');
    const signature = rows.map(row => row.key).sort().join(',');
    if (seenPages.has(signature)) return result('navigation_required');
    seenPages.add(signature); visitedPages++;
    for (const row of rows) {
      if (known.has(row.key)) continue;
      if (newStatements >= maxDownloads || Date.now() >= deadline) return result('batch_pending');
      const current = (await entries()).filter(entry => entry.key === row.key);
      if (current.length !== 1) return result('navigation_required');
      await current[0].locator.click();
      if (await bankNeedsSignin(page)) return result('awaiting_signin');
      const attachment = controls(page, /^Retail Statements(?:\.pdf)?$/i);
      if (await attachment.count() !== 1) return result('navigation_required');
      const href = await attachment.getAttribute('href');
      if (href && !isVirginPage(new URL(href, page.url()).href)) throw new Error('Statement attachment outside approved bank sites.');
      const pending = page.waitForEvent('download', { timeout: 15_000 });
      const [download] = await Promise.all([pending, attachment.click()]);
      try {
        if (!isVirginPage(download.url())) throw new Error('Unexpected statement download origin.');
        const stream = await download.createReadStream();
        if (!stream) throw new Error('Statement download did not complete.');
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of stream) {
          size += chunk.length;
          if (size > 20 * 1024 * 1024) throw new Error('Statement exceeds 20 MB.');
          chunks.push(Buffer.from(chunk));
        }
        const bytes = Buffer.concat(chunks);
        if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Virgin did not return a PDF statement.');
        if (options.onStatement) await options.onStatement(bytes, row.key);
        else downloads.push(bytes);
        known.add(row.key); newStatements++;
      } finally { await download.delete().catch(() => {}); }
      if (!await clickUnique(page, /^Back(?: to (?:messages|secure messages))?$/i)) return result('navigation_required');
    }
    const next = controls(page, /^(?:Next(?: page)?|Older messages)$/i);
    if (!await next.count() || (await next.count() === 1 && !await next.isEnabled())) return result('complete');
    if (await next.count() !== 1) return result('navigation_required');
    await next.click();
  }
  return result(visitedPages >= maxPages ? 'navigation_required' : 'batch_pending');
}
