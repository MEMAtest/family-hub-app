/** @jest-environment node */
import { startupPlist } from '../macStartup';
test('startup uses fixed argument boundaries and XML escaping, without bank credentials', () => {
  const plist = startupPlist('/usr/local/bin/node', '/Users/owner/Project & Files');
  expect(plist).toContain('<string>--import</string><string>tsx</string>');
  expect(plist).toContain('Project &amp; Files/scripts/bank-assistant/server.ts');
  expect(plist).not.toMatch(/password|cookie|OTP|bank_token/i);
  expect(plist).toContain('<key>RunAtLoad</key><true/>');
});
