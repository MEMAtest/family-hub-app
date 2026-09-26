import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import {
  MAX_SHARED_DOCUMENT_BYTES,
  SHARED_DOCUMENTS,
  isSharedDocumentKey,
} from '@/lib/sharedDocuments';
import { isMissingTableError, storageUnavailable } from '../storage';

const conflict = (current: { data: unknown; version: number; updatedAt: Date } | null) =>
  NextResponse.json(
    {
      error: 'This was changed on another device',
      current: current
        ? { data: current.data, version: current.version, updatedAt: current.updatedAt.toISOString() }
        : null,
    },
    { status: 409 }
  );

// PUT { data, baseVersion } -> saves only if the stored version still equals
// baseVersion (0 = create). Otherwise 409 with the current copy to merge.
export const PUT = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  const { familyId, key } = await context.params;
  if (!isSharedDocumentKey(key)) {
    return NextResponse.json({ error: 'Unknown document' }, { status: 404 });
  }

  const raw = await request.text();
  if (raw.length > MAX_SHARED_DOCUMENT_BYTES) {
    return NextResponse.json({ error: 'Too much data to save in one go' }, { status: 413 });
  }

  let body: { data?: unknown; baseVersion?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const baseVersion = body.baseVersion;
  const kind = SHARED_DOCUMENTS[key];
  const validShape = kind === 'collection'
    ? Array.isArray(body.data) && body.data.every((item) => item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
    : body.data !== null && typeof body.data === 'object' && !Array.isArray(body.data);
  if (!validShape || typeof baseVersion !== 'number' || !Number.isInteger(baseVersion) || baseVersion < 0) {
    return NextResponse.json({ error: 'Invalid document' }, { status: 400 });
  }

  const data = body.data as Prisma.InputJsonValue;
  const updatedBy = authUser.familyMemberId || null;

  try {
    if (baseVersion === 0) {
      try {
        const created = await prisma.familyDocument.create({
          data: { familyId, key, data, updatedBy },
          select: { version: true, updatedAt: true },
        });
        return NextResponse.json({ version: created.version, updatedAt: created.updatedAt.toISOString() }, { status: 201 });
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
    } else {
      const { count } = await prisma.familyDocument.updateMany({
        where: { familyId, key, version: baseVersion },
        data: { data, updatedBy, version: { increment: 1 } },
      });
      if (count === 1) {
        const saved = await prisma.familyDocument.findUnique({
          where: { familyId_key: { familyId, key } },
          select: { version: true, updatedAt: true },
        });
        return NextResponse.json({ version: saved!.version, updatedAt: saved!.updatedAt.toISOString() });
      }
    }

    const current = await prisma.familyDocument.findUnique({
      where: { familyId_key: { familyId, key } },
      select: { data: true, version: true, updatedAt: true },
    });
    return conflict(current);
  } catch (error) {
    if (isMissingTableError(error)) return storageUnavailable();
    console.error(`Failed to save shared document ${key}:`, error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
});
