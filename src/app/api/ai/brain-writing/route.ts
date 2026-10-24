import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { aiService } from "@/services/aiService";
import { brainWritingInput } from "@/lib/brain/writing";

export const maxDuration = 60;
export const POST = requireAuth(async (request: NextRequest) => {
  const headers = { "Cache-Control": "private, no-store" };
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid writing request." },
      { status: 400, headers },
    );
  }
  const input = brainWritingInput.safeParse(json);
  if (!input.success)
    return NextResponse.json(
      { error: "Use between 4 and 4,000 characters for automatic refinement." },
      { status: 400, headers },
    );
  try {
    return NextResponse.json(
      { draft: await aiService.refineBrainWriting(input.data), source: "ai" },
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Automatic refinement is temporarily unavailable. Your original text is kept.",
      },
      { status: 503, headers },
    );
  }
});
