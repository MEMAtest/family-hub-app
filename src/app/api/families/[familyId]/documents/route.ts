import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { isSharedDocumentKey, type SharedDocumentPayload } from '@/lib/sharedDocuments';
import { isMissingTableError, storageUnavailable } from './storage';
import { z } from 'zod';

const versionsSchema = z.record(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const headers = { 'Cache-Control': 'private, no-store' };

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

  const encodedVersions = request.nextUrl.searchParams.get('versions');
  let versions: Record<string, number> = {};
  if (encodedVersions !== null) {
    try {
      if (encodedVersions.length > 2000) throw new Error('Versions too large');
      versions = versionsSchema.parse(JSON.parse(encodedVersions));
      if (Object.keys(versions).some(key => !keys.includes(key as typeof keys[number]))) throw new Error('Unexpected document key');
    } catch {
      return NextResponse.json({ error: 'Invalid document versions' }, { status: 400, headers });
    }
  }

  try {
    // Check small version records before reading potentially multi-MB JSON payloads.
    const metadata = encodedVersions === null ? [] : await prisma.familyDocument.findMany({
      where: { familyId, key: { in: keys } },
      select: { key: true, version: true },
    });
    const unchangedVersions: Record<string, number> = {};
    for (const row of metadata) {
      if (versions[row.key] === row.version) unchangedVersions[row.key] = row.version;
    }
    const changedKeys = keys.filter(key => unchangedVersions[key] === undefined);
    const rows = changedKeys.length ? await prisma.familyDocument.findMany({
      where: { familyId, key: { in: changedKeys } },
      select: { key: true, data: true, version: true, updatedAt: true },
    }) : [];
    const documents: Record<string, SharedDocumentPayload> = {};
    for (const row of rows) {
      if (!isSharedDocumentKey(row.key)) continue;
      documents[row.key] = { key: row.key, data: row.data, version: row.version, updatedAt: row.updatedAt.toISOString() };
    }
    return NextResponse.json({ documents, unchangedVersions }, { headers });
  } catch (error) {
    if (isMissingTableError(error)) return storageUnavailable();
    console.error('Failed to load shared documents:', error);
    return NextResponse.json({ error: 'Failed to load shared data' }, { status: 500 });
  }
});
