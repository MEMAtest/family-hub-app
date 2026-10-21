/** @jest-environment node */
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';

const code = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
const receipts = new Set<string>();
const show = jest.fn();
const loadWorker = () => {
  const sandbox: any = { console, Date, URL, setTimeout,
    self: { addEventListener: jest.fn(), registration: { showNotification: show } } };
  runInNewContext(`${code}\nclaimPushDelivery = async key => testClaim(key); globalThis.deliver = deliverPush;`,
    Object.assign(sandbox, { testClaim: (key: string) => {
      if (receipts.has(key)) return false;
      receipts.add(key);
      return true;
    } }));
  return sandbox.deliver;
};
const envelope = (data = {}) => ({ title: 'Reminder', tag: 'series',
  data: { familyId: 'family', personId: 'ade', pushedAt: new Date().toISOString(), ...data } });

beforeEach(() => { receipts.clear(); show.mockClear(); });

it('suppresses duplicate deliveries after a worker restart while allowing distinct occurrences', async () => {
  await loadWorker()(envelope({ occurrenceId: 'one' }));
  const restarted = loadWorker();
  await restarted(envelope({ occurrenceId: 'one' }));
  await restarted(envelope({ occurrenceId: 'two' }));
  expect(show).toHaveBeenCalledTimes(2);
  expect(show.mock.calls[0][1].renotify).toBe(false);
});

it('drops expired, stale, and unstamped legacy history instead of replaying it', async () => {
  const deliver = loadWorker();
  await deliver(envelope({ expiresAt: new Date(0).toISOString() }));
  await deliver(envelope({ pushedAt: new Date(Date.now() - 16 * 60_000).toISOString() }));
  await deliver({ title: 'Legacy', tag: 'old', data: { notificationId: 'old' } });
  expect(show).not.toHaveBeenCalled();
});

it('uses the server delivery ID across redelivery and scopes receipts to the recipient', async () => {
  const deliver = loadWorker();
  await deliver(envelope({ deliveryId: 'delivery' }));
  await deliver(envelope({ deliveryId: 'delivery' }));
  await deliver(envelope({ deliveryId: 'delivery', personId: 'angela' }));
  expect(show).toHaveBeenCalledTimes(2);
});
