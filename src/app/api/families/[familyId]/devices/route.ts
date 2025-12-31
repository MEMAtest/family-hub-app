import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/families/[familyId]/devices
 * Get all connected devices for a person
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const { familyId } = await params;
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');

    if (!personId) {
      return NextResponse.json(
        { error: 'personId is required' },
        { status: 400 }
      );
    }

    // Verify person belongs to family
    const person = await prisma.familyMember.findFirst({
      where: { id: personId, familyId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found in this family' },
        { status: 404 }
      );
    }

    const devices = await prisma.deviceSync.findMany({
      where: { personId },
      select: {
        id: true,
        provider: true,
        syncEnabled: true,
        lastSyncAt: true,
        createdAt: true,
        // Don't expose tokens
      },
    });

    // Add connection status
    const devicesWithStatus = devices.map((device) => ({
      ...device,
      isConnected: !!device.lastSyncAt,
      displayName: getProviderDisplayName(device.provider),
      icon: getProviderIcon(device.provider),
    }));

    return NextResponse.json({ devices: devicesWithStatus });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/families/[familyId]/devices
 * Connect a new device
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const { familyId } = await params;
    const body = await request.json();

    const { personId, provider, credentials } = body;

    if (!personId || !provider) {
      return NextResponse.json(
        { error: 'personId and provider are required' },
        { status: 400 }
      );
    }

    // Verify person belongs to family
    const person = await prisma.familyMember.findFirst({
      where: { id: personId, familyId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found in this family' },
        { status: 404 }
      );
    }

    // Validate provider
    if (!['garmin', 'ultrahuman'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Supported: garmin, ultrahuman' },
        { status: 400 }
      );
    }

    // For Garmin, test the credentials first
    if (provider === 'garmin' && credentials) {
      const { GarminConnect } = await import('garmin-connect');
      const client = new GarminConnect({
        username: credentials.username,
        password: credentials.password,
      });

      try {
        await client.login();
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid Garmin credentials. Please check your username and password.' },
          { status: 401 }
        );
      }
    }

    // Upsert the device sync record
    const deviceSync = await prisma.deviceSync.upsert({
      where: {
        personId_provider: {
          personId,
          provider,
        },
      },
      update: {
        settings: credentials ? (credentials as Prisma.InputJsonValue) : undefined,
        syncEnabled: true,
        updatedAt: new Date(),
      },
      create: {
        personId,
        provider,
        settings: credentials ? (credentials as Prisma.InputJsonValue) : Prisma.JsonNull,
        syncEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      device: {
        id: deviceSync.id,
        provider: deviceSync.provider,
        syncEnabled: deviceSync.syncEnabled,
        isConnected: true,
        displayName: getProviderDisplayName(provider),
      },
    });
  } catch (error) {
    console.error('Error connecting device:', error);
    return NextResponse.json(
      { error: 'Failed to connect device' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/families/[familyId]/devices
 * Disconnect a device
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const { familyId } = await params;
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');
    const provider = searchParams.get('provider');

    if (!personId || !provider) {
      return NextResponse.json(
        { error: 'personId and provider are required' },
        { status: 400 }
      );
    }

    // Verify person belongs to family
    const person = await prisma.familyMember.findFirst({
      where: { id: personId, familyId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found in this family' },
        { status: 404 }
      );
    }

    await prisma.deviceSync.delete({
      where: {
        personId_provider: {
          personId,
          provider,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting device:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect device' },
      { status: 500 }
    );
  }
}

// Helper functions
function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    garmin: 'Garmin Connect',
    ultrahuman: 'Ultrahuman Ring',
  };
  return names[provider] || provider;
}

function getProviderIcon(provider: string): string {
  const icons: Record<string, string> = {
    garmin: '⌚',
    ultrahuman: '💍',
  };
  return icons[provider] || '📱';
}
