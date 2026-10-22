import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { chmod, lstat, mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const run = promisify(execFile);
const SERVICE = 'FamilyHub.VirginMoney.BrowserSession.v1';
export async function keychainKey(): Promise<Buffer> {
  if (process.platform !== 'darwin') throw new Error('Session persistence requires macOS Keychain.');
  const account = os.userInfo().username;
  try {
    const { stdout } = await run('/usr/bin/security', ['find-generic-password', '-s', SERVICE, '-a', account, '-w']);
    if (!/^[a-f0-9]{64}$/.test(stdout.trim())) throw new Error('Invalid session key.');
    return Buffer.from(stdout.trim(), 'hex');
  } catch (error) {
    if ((error as { code?: number }).code !== 44) throw new Error('Unlock or approve Keychain access to continue.');
    const key = randomBytes(32);
    try {
      await run('/usr/bin/security', ['add-generic-password', '-s', SERVICE, '-a', account, '-w', key.toString('hex')]);
    } catch { throw new Error('Could not save the browser-session key in Keychain.'); }
    return key;
  }
}

export async function privateWrite(file: string, bytes: Buffer | string) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  if ((await lstat(path.dirname(file))).isSymbolicLink()) throw new Error('Private storage cannot be a symbolic link.');
  await chmod(path.dirname(file), 0o700);
  const temp = `${file}.${randomBytes(12).toString('hex')}.tmp`;
  try {
    await writeFile(temp, bytes, { flag: 'wx', mode: 0o600 });
    await rename(temp, file);
  } finally { await unlink(temp).catch(() => {}); }
}

// Only the encrypted session is stored on disk. The key stays in macOS Keychain.
export class SessionVault {
  private file: string;
  constructor(directory: string, private getKey = keychainKey) {
    this.file = path.join(directory, 'browser-session.enc');
  }
  async load(): Promise<string | undefined> {
    let bytes: Buffer;
    try {
      if ((await lstat(this.file)).isSymbolicLink()) throw new Error('Invalid session file.');
      bytes = await readFile(this.file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
    if (bytes.length < 30 || bytes[0] !== 1) throw new Error('Session could not be restored; reconnect Virgin.');
    try {
      const decipher = createDecipheriv('aes-256-gcm', await this.getKey(), bytes.subarray(1, 13));
      decipher.setAuthTag(bytes.subarray(13, 29));
      return Buffer.concat([decipher.update(bytes.subarray(29)), decipher.final()]).toString('utf8');
    } catch { throw new Error('Session could not be unlocked; reconnect Virgin.'); }
  }
  async save(session: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', await this.getKey(), iv);
    const body = Buffer.concat([cipher.update(session, 'utf8'), cipher.final()]);
    await privateWrite(this.file, Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), body]));
  }
  async clear() { await unlink(this.file).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
