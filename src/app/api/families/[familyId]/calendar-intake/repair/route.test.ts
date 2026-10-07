/** @jest-environment node */
jest.mock('@/lib/neonAuth', () => ({ getNeonSessionIdentity: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/schoolIntakeRepair', () => ({ buildSchoolRepairPlan: jest.fn(), schoolRepairResponse: jest.fn((plan) => plan),
  applySchoolRepair: jest.fn(), SchoolRepairConflict: class SchoolRepairConflict extends Error {} }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import { POST } from './route';
import { buildSchoolRepairPlan, applySchoolRepair, SchoolRepairConflict } from '@/lib/schoolIntakeRepair';
import { getNeonSessionIdentity } from '@/lib/neonAuth';
const context = (familyId = 'family') => ({ params: Promise.resolve({ familyId }) });
const request = (body: unknown) => ({ json: async () => body });
const hash = 'a'.repeat(64);
describe('secured school repair API', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...env, BYPASS_AUTH_FOR_TESTS: 'true', TEST_AUTH_FAMILY_ID: 'family', TEST_AUTH_FAMILY_MEMBER_ID: 'parent', NEXT_PUBLIC_E2E: 'false' };
    (buildSchoolRepairPlan as jest.Mock).mockResolvedValue({ planHash: hash, intakes: [] });
    (applySchoolRepair as jest.Mock).mockResolvedValue({ repairedDrafts: 1, repairedEvents: 0, externalWrites: false });
  });
  afterAll(() => { process.env = env; });
  it('rejects anonymous and foreign-family repair before planning or applying', async () => {
    process.env.BYPASS_AUTH_FOR_TESTS = 'false';
    (getNeonSessionIdentity as jest.Mock).mockResolvedValue(null);
    expect((await (POST as any)(request({ mode: 'dry-run' }), context())).status).toBe(401);
    process.env.BYPASS_AUTH_FOR_TESTS = 'true';
    expect((await (POST as any)(request({ mode: 'apply', planHash: hash }), context('foreign'))).status).toBe(404);
    expect(buildSchoolRepairPlan).not.toHaveBeenCalled();
    expect(applySchoolRepair).not.toHaveBeenCalled();
  });
  it('defaults to a read-only family-scoped dry-run with bounded cursor', async () => {
    const response = await (POST as any)(request({ afterId: 'cursor' }), context());
    expect(response.status).toBe(200);
    expect(buildSchoolRepairPlan).toHaveBeenCalledWith('family', undefined, 'cursor');
    expect(applySchoolRepair).not.toHaveBeenCalled();
  });
  it('requires the preview hash and uses the authenticated actor for apply', async () => {
    expect((await (POST as any)(request({ mode: 'apply' }), context())).status).toBe(400);
    const response = await (POST as any)(request({ mode: 'apply', planHash: hash, approvedEventIds: ['saved'], afterId: 'cursor' }), context());
    expect(response.body.externalWrites).toBe(false);
    expect(applySchoolRepair).toHaveBeenCalledWith('family', expect.objectContaining({ planHash: hash, approvedEventIds: ['saved'], afterId: 'cursor' }), 'parent');
  });
  it('rejects malformed requests and stale revision conflicts', async () => {
    expect((await (POST as any)(request({ mode: 'apply', planHash: 'invalid' }), context())).status).toBe(400);
    (applySchoolRepair as jest.Mock).mockRejectedValue(new SchoolRepairConflict('stale'));
    expect((await (POST as any)(request({ mode: 'apply', planHash: hash }), context())).status).toBe(409);
  });
});
