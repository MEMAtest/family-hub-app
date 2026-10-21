/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/googleCalendarServer', () => ({ createOAuthClient: jest.fn(), decodeGoogleState: jest.fn() }));
jest.mock('googleapis', () => ({ google: {} }));
jest.mock('next/server', () => ({ NextResponse: class {
  body: string;
  constructor(body: string) { this.body = body; }
} }));
import { GET } from './route';

it('offers a fixed-origin return path after a standalone phone sign-in error', async () => {
  const response = await GET({ url: 'https://family.example/api/google-calendar/callback?error=access_denied' } as any) as any;
  expect(response.body).toContain('Return to Family Hub calendar');
  expect(response.body).toContain("back.href = '/?view=calendar&homeFocus=school'");
});

it('does not allow provider error text to terminate the callback script', async () => {
  const url = new URL('https://family.example/api/google-calendar/callback');
  url.searchParams.set('error', '</script><script>window.attacker=true</script>');
  const response = await GET({ url: url.href } as any) as any;
  expect(response.body).not.toContain('</script><script>window.attacker');
  expect(response.body).toContain('\\u003c/script>');
});
