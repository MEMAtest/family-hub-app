/** @jest-environment node */
import { dueBankSlot } from '../schedule';
import { isVirginPage } from '../virginMoney';
test('London morning/evening and daylight savings, never every 15 minutes', () => {
  expect(dueBankSlot(new Date('2026-10-03T06:00:00Z'), true, null)).toBe('2026-10-03:7');
  expect(dueBankSlot(new Date('2026-10-03T18:15:00Z'), true, null)).toBe('2026-10-03:19');
  expect(dueBankSlot(new Date('2026-12-03T07:00:00Z'), true, null)).toBe('2026-12-03:7');
  expect(dueBankSlot(new Date('2026-10-03T08:00:00Z'), true, null)).toBeNull();
  expect(dueBankSlot(new Date('2026-10-03T06:15:00Z'), true, '2026-10-03:7')).toBeNull();
  expect(dueBankSlot(new Date('2026-10-03T06:00:00Z'), false, null)).toBeNull();
});
test('does not trust arbitrary origins or similar-looking domains', () => {
  expect(isVirginPage('https://internet-banking.ib.apps.virginmoney.com/vm/')).toBe(true);
  expect(isVirginPage('https://login-and-registration.ib.apps.virginmoney.com/vm')).toBe(true);
  expect(isVirginPage('https://virginmoney.com.attacker.test/')).toBe(false);
  expect(isVirginPage('http://internet-banking.ib.apps.virginmoney.com/')).toBe(false);
});
