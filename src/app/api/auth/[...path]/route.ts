import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const authDisabled = () =>
  NextResponse.json({ error: 'Authentication is disabled for this app' }, { status: 404 });

export const GET = authDisabled;
export const POST = authDisabled;
export const PUT = authDisabled;
export const DELETE = authDisabled;
export const PATCH = authDisabled;
