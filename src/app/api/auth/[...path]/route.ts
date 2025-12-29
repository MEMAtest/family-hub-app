import { NextResponse } from 'next/server';

// Auth is currently disabled - return a stub response
export async function GET() {
  return NextResponse.json({ message: 'Auth is disabled' }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({ message: 'Auth is disabled' }, { status: 503 });
}
