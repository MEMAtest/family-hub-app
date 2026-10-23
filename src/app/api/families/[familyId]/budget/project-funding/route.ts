import { NextRequest, NextResponse } from "next/server";
import { requireFamilyAccess } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import {
  buildProjectFunding,
  fundingChange,
  PROJECT_FUNDING_KEY,
  readProjectFunding,
} from "@/lib/budget/projectFunding";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function load(familyId: string) {
  const [projectDoc, fundingDoc] = await Promise.all([
    prisma.familyDocument.findUnique({
      where: { familyId_key: { familyId, key: "property.projects" } },
      select: { data: true },
    }),
    prisma.familyDocument.findUnique({
      where: { familyId_key: { familyId, key: PROJECT_FUNDING_KEY } },
      select: { data: true, version: true },
    }),
  ]);
  const funding = readProjectFunding(fundingDoc?.data);
  return {
    funding,
    report: buildProjectFunding(
      projectDoc?.data,
      funding,
      fundingDoc?.version ?? 0,
    ),
  };
}
export const GET = requireFamilyAccess(
  async (_request: NextRequest, context) => {
    try {
      return NextResponse.json(
        (await load((await context.params).familyId)).report,
        { headers },
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "Project money could not be loaded. No bank balance or example budget has been substituted.",
        },
        { status: 503, headers },
      );
    }
  },
);
export const PUT = requireFamilyAccess(
  async (request: NextRequest, context, auth) => {
    const { familyId } = await context.params;
    const raw = await request.text();
    if (raw.length > 10_000)
      return NextResponse.json(
        { error: "That project change is too large." },
        { status: 413, headers },
      );
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid project money change." },
        { status: 400, headers },
      );
    }
    const parsed = fundingChange.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        {
          error:
            "Use a non-negative amount in pounds and pence and contingency between 0 and 50%.",
        },
        { status: 400, headers },
      );
    try {
      const { funding, report } = await load(familyId);
      const action = parsed.data;
      if (action.baseVersion !== report.version)
        return NextResponse.json(
          {
            error:
              "Project money changed on another device. Refresh, review the latest allocations and save again.",
            current: report,
          },
          { status: 409, headers },
        );
      if (action.action === "fund") funding.fund = action.amount;
      else {
        const project = report.projects.find(
          (project) => project.id === action.projectId,
        );
        if (
          !project ||
          (!project.available && action.amount !== null && action.amount !== 0)
        )
          return NextResponse.json(
            {
              error:
                "This project is not available in your household, or is still syncing.",
            },
            { status: 404, headers },
          );
        funding.allocations[action.projectId] = {
          title: project.title,
          amount: action.amount,
          reservePercent: action.reservePercent,
        };
      }
      let version: number;
      if (report.version === 0) {
        try {
          const row = await prisma.familyDocument.create({
            data: {
              familyId,
              key: PROJECT_FUNDING_KEY,
              data: funding,
              updatedBy: auth.familyMemberId || null,
            },
            select: { version: true },
          });
          version = row.version;
        } catch (error) {
          if ((error as { code?: string }).code === "P2002")
            return NextResponse.json(
              {
                error:
                  "Project money changed on another device. Refresh and save again.",
              },
              { status: 409, headers },
            );
          throw error;
        }
      } else {
        const saved = await prisma.familyDocument.updateMany({
          where: {
            familyId,
            key: PROJECT_FUNDING_KEY,
            version: report.version,
          },
          data: {
            data: funding,
            version: { increment: 1 },
            updatedBy: auth.familyMemberId || null,
          },
        });
        if (!saved.count)
          return NextResponse.json(
            {
              error:
                "Project money changed on another device. Refresh and save again.",
            },
            { status: 409, headers },
          );
        version = report.version + 1;
      }
      return NextResponse.json({ version }, { headers });
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not save project money. Your bank accounts and project quotes are unchanged.",
        },
        { status: 503, headers },
      );
    }
  },
);
