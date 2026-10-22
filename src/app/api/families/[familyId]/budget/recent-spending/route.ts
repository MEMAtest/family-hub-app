import { NextRequest, NextResponse } from "next/server";
import { requireFamilyAccess } from "@/lib/auth-utils";
import { loadRecentSpending } from "@/lib/budget/recentSpendingService";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export const GET = requireFamilyAccess(
  async (request: NextRequest, context) => {
    const { familyId } = await context.params;
    const value = new URL(request.url).searchParams.get("days") ?? "30";
    if (!/^[1-9]\d{0,2}$/.test(value) || Number(value) > 365)
      return NextResponse.json(
        { error: "Choose a whole number of days between 1 and 365." },
        { status: 400, headers },
      );
    try {
      return NextResponse.json(
        await loadRecentSpending(familyId, Number(value)),
        { headers },
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "Recent spending is unavailable. No saved-plan figures have been substituted.",
        },
        { status: 503, headers },
      );
    }
  },
);
