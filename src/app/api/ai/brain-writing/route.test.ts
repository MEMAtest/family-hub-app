jest.mock("@/lib/auth-utils", () => ({
  requireAuth: (handler: unknown) => handler,
}));
jest.mock("@/services/aiService", () => ({
  aiService: { refineBrainWriting: jest.fn() },
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: unknown }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers,
    }),
  },
}));
import { aiService } from "@/services/aiService";
import { POST } from "./route";
const post = (json: unknown) => (POST as any)({ json: async () => json });
beforeEach(() => {
  jest.clearAllMocks();
});
test("returns one structured AI result, privately and without caching draft text", async () => {
  const draft = {
    title: "Arrange boiler inspection",
    content: "Ask for a boiler inspection.",
  };
  (aiService.refineBrainWriting as jest.Mock).mockResolvedValueOnce(draft);
  const response = await post({
    text: " ask for boiler inspection ",
    nodeType: "task",
  });
  expect(response).toMatchObject({
    status: 200,
    body: { draft, source: "ai" },
    headers: { "Cache-Control": "private, no-store" },
  });
  expect(aiService.refineBrainWriting).toHaveBeenCalledTimes(1);
  expect(aiService.refineBrainWriting).toHaveBeenCalledWith({
    text: "ask for boiler inspection",
    nodeType: "task",
  });
});
test("does not call spacing cleanup AI or replace text when the provider is unavailable", async () => {
  (aiService.refineBrainWriting as jest.Mock).mockRejectedValueOnce(
    new Error("Provider down"),
  );
  const response = await post({ text: "Check the boiler" });
  expect(response.status).toBe(503);
  expect(response.body).not.toHaveProperty("draft");
  expect(response.body.error).toContain("original text is kept");
});
test("rejects invalid and excessive input before calling a provider", async () => {
  for (const text of ["", "abc", "a".repeat(4001), null])
    expect((await post({ text })).status).toBe(400);
  expect(
    (
      await (POST as any)({
        json: async () => {
          throw new Error("invalid JSON");
        },
      })
    ).status,
  ).toBe(400);
  expect(aiService.refineBrainWriting).not.toHaveBeenCalled();
});
