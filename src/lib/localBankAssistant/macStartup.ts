import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function startupPlist(node: string, root: string) {
  const argumentsList = [node, '--import', 'tsx', path.join(root, 'scripts/bank-assistant/server.ts')];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>com.familyhub.virgin-assistant</string><key>ProgramArguments</key><array>${argumentsList.map(value => `<string>${escapeXml(value)}</string>`).join('')}</array><key>WorkingDirectory</key><string>${escapeXml(root)}</string><key>RunAtLoad</key><true/><key>ThrottleInterval</key><integer>60</integer><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict></dict></plist>`;
}
export async function installMacStartup(home: string, node: string, root: string) {
  if (process.platform !== 'darwin') throw new Error('Start-at-login is available on macOS only.');
  const directory = path.join(home, 'Library', 'LaunchAgents');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = path.join(directory, 'com.familyhub.virgin-assistant.plist');
  const content = startupPlist(node, root);
  const existing = await readFile(destination, 'utf8').catch(() => null);
  if (existing && existing !== content) throw new Error('A different Family Hub startup entry already exists.');
  await writeFile(destination, content, { flag: existing ? 'w' : 'wx', mode: 0o600 });
  // The user's next login loads it. Do not spawn a conflicting second server now.
}
