import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { isSharedDocumentKey, type SharedDocumentPayload } from '@/lib/sharedDocuments';
import { isMissingTableError, storageUnavailable } from './storage';

// GET ?keys=property.tasks,property.issues -> the shared documents that exist.
export const GET = requireFamilyAccess(async (request: NextRequest, context) => {
  const { familyId } = await context.params;
  const keys = (request.nextUrl.searchParams.get('keys') || '')
    .split(',')
    .map((key) => key.trim())
    .filter(isSharedDocumentKey);

  if (keys.length === 0) {
    return NextResponse.json({ error: 'Name at least one known document key' }, { status: 400 });
  }

  try {
    const rows = await prisma.familyDocument.findMany({
      where: { familyId, key: { in: keys } },
      select: { key: true, data: true, version: true, updatedAt: true },
    });
    const documents: Record<string, SharedDocumentPayload> = {};
    for (const row of rows) {
      if (!isSharedDocumentKey(row.key)) continue;
      documents[row.key] = { key: row.key, data: row.data, version: row.version, updatedAt: row.updatedAt.toISOString() };
    }
    return NextResponse.json({ documents });
  } catch (error) {
    if (isMissingTableError(error)) return storageUnavailable();
    console.error('Failed to load shared documents:', error);
    return NextResponse.json({ error: 'Failed to load shared data' }, { status: 500 });
  }
});
