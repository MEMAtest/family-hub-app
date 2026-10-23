import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFamilyAccess } from "@/lib/auth-utils";
import { loadRecentSpending } from "@/lib/budget/recentSpendingService";
import { spendingFacts } from "@/lib/budget/spendingInsights";
import { aiService } from "@/services/aiService";

export const maxDuration = 60;
const inputSchema = z.object({ days: z.number().int().min(1).max(365) });
const headers = { "Cache-Control": "private, no-store" };

export const POST = requireFamilyAccess(
  async (request: NextRequest, context) => {
    const input = inputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success)
      return NextResponse.json(
        { error: "Choose a whole number of days between 1 and 365." },
        { status: 400, headers },
      );
    try {
      const { familyId } = await context.params;
      const { report } = await loadRecentSpending(familyId, input.data.days);
      if (report.coverage === "none")
        return NextResponse.json(
          { error: "Import bank data before requesting spending actions." },
          { status: 409, headers },
        );
      const facts = spendingFacts(report);
      // Only computed aggregate evidence is shared. Bank narratives, account IDs and names stay here.
      const actions = await aiService.suggestSpendingActions(
        facts.map(({ id, title, evidence, action }) => ({
          id,
          title,
          evidence,
          action,
        })),
      );
      return NextResponse.json(
        { actions, basis: "recorded-bank-payments" },
        { headers },
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "AI suggestions are unavailable right now. The verified spending observations are still available; no generated advice has been substituted.",
        },
        { status: 503, headers },
      );
    }
  },
);
