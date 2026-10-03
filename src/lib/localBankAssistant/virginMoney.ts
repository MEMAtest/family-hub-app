import type { Page } from '@playwright/test';

export const VIRGIN_ENTRY = 'https://internet-banking.ib.apps.virginmoney.com/vm/';
const BANK_HOSTS = new Set(['internet-banking.ib.apps.virginmoney.com', 'login-and-registration.ib.apps.virginmoney.com']);

export type RetrievalResult = { status: 'awaiting_signin' | 'navigation_required' | 'complete'; downloads: Buffer[] };
export function isVirginPage(url: string) {
  const parsed = new URL(url);
  return parsed.protocol === 'https:' && BANK_HOSTS.has(parsed.hostname);
}

async function clickUnique(page: Page, label: RegExp) {
  const control = page.getByRole('button', { name: label }).or(page.getByRole('link', { name: label })).filter({ visible: true });
  if (await control.count() !== 1) return false;
  await control.click();
  return true;
}

// Only navigate the bank's documented statement controls. Unknown screens fail closed.
export async function retrieveVirginStatements(page: Page): Promise<RetrievalResult> {
  if (!isVirginPage(page.url())) throw new Error('Bank browser is outside the approved Virgin Money sites.');
  if (new URL(page.url()).hostname.startsWith('login-and-registration.')) return { status: 'awaiting_signin', downloads: [] };
  if (await page.getByRole('textbox', { name: /username|customer number|password|passcode/i }).filter({ visible: true }).count()) {
    return { status: 'awaiting_signin', downloads: [] };
  }
  const statements = () => page.getByRole('button', { name: /^New statement\b/i })
    .or(page.getByRole('link', { name: /^New statement\b/i })).filter({ visible: true });
  if (await statements().count() === 0) {
    await clickUnique(page, /^More$/i);
    if (!await clickUnique(page, /^Secure messages$/i)) return { status: 'navigation_required', downloads: [] };
  }
  if (!isVirginPage(page.url())) throw new Error('Unexpected bank navigation.');
  const count = await statements().count();
  if (count === 0) return { status: 'navigation_required', downloads: [] };
  if (count > 12) return { status: 'navigation_required', downloads: [] };
  const downloads: Buffer[] = [];
  for (let index = 0; index < count; index++) {
    if (!isVirginPage(page.url())) throw new Error('Unexpected bank navigation.');
    await statements().nth(index).click();
    const attachment = page.getByRole('link', { name: /^Retail Statements(?:\.pdf)?$/i })
      .or(page.getByRole('button', { name: /^Retail Statements(?:\.pdf)?$/i })).filter({ visible: true });
    if (await attachment.count() !== 1) return { status: 'navigation_required', downloads };
    const href = await attachment.getAttribute('href');
    if (href && !isVirginPage(new URL(href, page.url()).href)) throw new Error('Statement attachment is outside the approved Virgin Money sites.');
    const pending = page.waitForEvent('download', { timeout: 15000 });
    await attachment.click();
    const download = await pending;
    if (!isVirginPage(download.url())) { await download.delete(); throw new Error('Unexpected statement download origin.'); }
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
    downloads.push(bytes);
    await download.delete();
    if (index + 1 < count && !await clickUnique(page, /^Back(?: to (?:messages|secure messages))?$/i)) {
      return { status: 'navigation_required', downloads };
    }
  }
  return { status: 'complete', downloads };
}
