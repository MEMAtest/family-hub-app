import type { Page } from '@playwright/test';
import { bankNeedsSignin, isVirginPage } from './virginMoney';

export async function retrieveVirginTransactionExport(page: Page, from: string, to: string): Promise<Buffer | null> {
  if (await bankNeedsSignin(page)) return null;
  const current = page.getByRole('button', { name: 'M Plus Current', exact: true });
  if (await current.count() === 1) {
    await current.click();
    await page.getByRole('link', { name: 'Download transactions', exact: true }).waitFor({ timeout: 15_000 });
  }
  const exportLink = page.getByRole('link', { name: 'Download transactions', exact: true });
  if (await exportLink.count() !== 1) return null;
  await exportLink.click();
  await page.getByRole('heading', { name: 'Download transactions', exact: true }).waitFor();
  // Stop if the bank no longer identifies the selected current-account product.
  if (await page.getByRole('heading', { name: 'M Plus Current', exact: true }).count() !== 1) return null;
  for (const [label, value] of [['From', from], ['To', to]]) {
    const field = page.getByRole('textbox', { name: label, exact: true });
    await field.fill(value);
    await field.press('Tab');
    await page.getByRole('heading', { name: 'Download transactions', exact: true }).click();
    if (await field.inputValue() !== value) throw new Error('Bank export date did not remain selected.');
  }
  await page.getByRole('radio', { name: 'Basic CSV', exact: true }).check();
  const pending = page.waitForEvent('download', { timeout: 30_000 });
  const [download] = await Promise.all([pending, page.getByRole('button', { name: 'Export transactions', exact: true }).click()]);
  try {
    const url = download.url();
    const origin = new URL(url).origin;
    if (!isVirginPage(url) && !(url.startsWith('blob:') && isVirginPage(origin))) throw new Error('Unexpected bank export origin.');
    const stream = await download.createReadStream();
    if (!stream) throw new Error('Bank export did not complete.');
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > 20 * 1024 * 1024) throw new Error('Bank export exceeds 20 MB.');
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } finally { await download.delete().catch(() => {}); }
}
