import type { Page } from '@playwright/test';
import type { BankLogin } from './credentials';

export async function completeVirginApproval(page: Page): Promise<boolean> {
  if (new URL(page.url()).origin !== 'https://login-and-registration.ib.apps.virginmoney.com') return false;
  for (const frame of page.frames()) {
    let origin: string;
    try { origin = new URL(frame.url()).origin; } catch { continue; }
    if (origin !== 'https://verification.ib.apps.virginmoney.com') continue;
    const success = frame.getByText('Login successful', { exact: true });
    const okay = frame.getByRole('button', { name: 'Ok', exact: true });
    if (await success.isVisible() && await okay.count() === 1 && await okay.isVisible()) {
      await okay.click();
      await page.getByRole('button', { name: 'Log out', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
      return true;
    }
  }
  return false;
}

export async function virginApprovalExpired(page: Page) {
  if (new URL(page.url()).origin !== 'https://login-and-registration.ib.apps.virginmoney.com') return false;
  if (await page.getByRole('heading', { name: 'Your session has expired', exact: true }).isVisible()) return true;
  for (const frame of page.frames()) {
    let origin: string;
    try { origin = new URL(frame.url()).origin; } catch { continue; }
    if (origin === 'https://verification.ib.apps.virginmoney.com'
      && await frame.getByText("Oops, your time's run out", { exact: true }).isVisible()) return true;
  }
  return false;
}

export async function resumeVirginSignin(page: Page, login: BankLogin): Promise<'phone_approval' | 'manual_required' | 'rejected'> {
  const approvedForm = () => new URL(page.url()).origin === 'https://login-and-registration.ib.apps.virginmoney.com';
  if (!approvedForm()) return 'manual_required';
  if (await page.getByRole('heading', { name: 'Your session has expired', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Start again', exact: true }).click();
  }
  const cookies = page.getByRole('button', { name: 'Reject optional cookies', exact: true });
  const username = page.getByRole('textbox', { name: 'Your username or customer number', exact: true });
  const password = page.locator('input[type="password"]:visible');
  await cookies.or(username).or(password).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  if (await cookies.isVisible()) await cookies.click();
  await username.or(password).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  if (await username.isVisible()) {
    await username.fill(login.username);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await password.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  if (!approvedForm() || await password.count() !== 1) return 'manual_required';
  await password.fill(login.password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Confirm login attempt', exact: true });
  await confirm.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  if (approvedForm() && await confirm.count() === 1 && await confirm.isVisible()) {
    await confirm.click();
    return 'phone_approval';
  }
  const rejected = page.getByText(/(?:incorrect password|details.{0,30}incorrect|password.{0,30}(?:incorrect|not match)|account.{0,30}locked)/i);
  return await rejected.filter({ visible: true }).count() ? 'rejected' : 'manual_required';
}
