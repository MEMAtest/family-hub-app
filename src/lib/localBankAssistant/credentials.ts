import { spawn } from 'child_process';
import os from 'os';

export type BankLogin = { username: string; password: string };
export interface LoginStore {
  exists(): Promise<boolean>;
  load(): Promise<BankLogin | undefined>;
  clear(): Promise<void>;
}
const SERVICE = 'FamilyHub.VirginMoney.Credentials.v1';

async function security(args: string[], input?: string): Promise<{ code: number; stdout: string }> {
  if (process.platform !== 'darwin') throw new Error('Saved login requires macOS Keychain.');
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/security', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let exceeded = false;
    const timer = setTimeout(() => child.kill(), 15_000);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); if (stdout.length > 32_768) { exceeded = true; child.kill(); } });
    child.stderr.resume();
    child.on('error', () => { clearTimeout(timer); reject(new Error('Keychain operation failed.')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (exceeded || code === null) reject(new Error('Keychain operation did not complete.'));
      else resolve({ code, stdout });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

export function validateLogin(value: unknown): BankLogin {
  const item = value as BankLogin;
  if (!item || typeof item.username !== 'string' || !item.username.trim() || item.username.length > 100
    || typeof item.password !== 'string' || !item.password || item.password.length > 1024) throw new Error('Invalid bank login details.');
  return { username: item.username.trim(), password: item.password };
}

export class KeychainLoginStore implements LoginStore {
  private args = ['-s', SERVICE, '-a', os.userInfo().username];
  async exists() {
    const result = await security(['find-generic-password', ...this.args]);
    if (![0, 44].includes(result.code)) throw new Error('Approve or unlock macOS Keychain.');
    return result.code === 0;
  }
  async load() {
    const result = await security(['find-generic-password', ...this.args, '-w']);
    if (result.code === 44) return undefined;
    if (result.code !== 0) throw new Error('Approve or unlock macOS Keychain.');
    try { return validateLogin(JSON.parse(Buffer.from(result.stdout.trim(), 'base64').toString('utf8'))); }
    catch { throw new Error('Saved bank login needs replacing.'); }
  }
  async save(value: BankLogin) {
    const login = validateLogin(value);
    const encoded = Buffer.from(JSON.stringify(login), 'utf8').toString('base64');
    // Secrets travel over stdin, never command-line arguments, env or a file.
    const command = ['add-generic-password', '-U', ...this.args, '-w', encoded].map(part => JSON.stringify(part)).join(' ');
    await security(['-i'], `${command}\nexit\n`);
    const saved = await this.load();
    if (saved?.username !== login.username || saved.password !== login.password) throw new Error('Bank login could not be saved.');
  }
  async clear() {
    const result = await security(['delete-generic-password', ...this.args]);
    if (![0, 44].includes(result.code)) throw new Error('Saved bank login could not be removed.');
  }
}
