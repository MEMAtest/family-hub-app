import { KeychainLoginStore, validateLogin } from '../../src/lib/localBankAssistant/credentials';

if (process.argv[2] !== '--save') throw new Error('Use --save and provide login JSON on protected stdin.');
const tty = process.stdin.isTTY;
if (tty) process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stderr.write('Provide login JSON on stdin; input is hidden.\n');
let input = ''; let busy = false;
process.stdin.on('data', async chunk => {
  if (busy) return;
  input += chunk;
  if (input.includes('\u0003') || input.length > 4096) process.exit(1);
  if (!input.includes('\n') && !input.includes('\r')) return;
  busy = true;
  try {
    const login = validateLogin(JSON.parse(input.trim())); input = '';
    await new KeychainLoginStore().save(login);
    process.stdout.write('Login details saved in macOS Keychain.\n');
    if (tty) process.stdin.setRawMode(false);
    process.exit(0);
  } catch {
    process.stderr.write('Login details could not be saved. No secret details were logged.\n');
    if (tty) process.stdin.setRawMode(false);
    process.exit(1);
  }
});
