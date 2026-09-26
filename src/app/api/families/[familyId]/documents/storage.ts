import { NextResponse } from 'next/server';

// The family_documents table is added with `npm run db:push`. Until that has run
// in an environment, answer with a clear 503 so clients stay in local-only mode
// instead of treating it as a crash.
export const isMissingTableError = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2021';

export const storageUnavailable = () =>
  NextResponse.json(
    { error: 'Shared storage is not set up yet. Run `npm run db:push` for this database.', unavailable: true },
    { status: 503 }
  );
